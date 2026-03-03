import uuid
import logging
import aiofiles
from pathlib import Path
from datetime import datetime
from bson import ObjectId
from fastapi import UploadFile, HTTPException

from app.core.config import settings
from app.core.database import get_db
from app.services.ai_service import transcribe_audio, generate_summary

logger = logging.getLogger(__name__)


def _doc_to_dict(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    return doc


async def save_upload(file: UploadFile) -> dict:
    original_name = file.filename or "unknown"

    suffix = Path(original_name).suffix.lower()
    if suffix not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{suffix}' is not supported. Allowed: {', '.join(sorted(settings.ALLOWED_EXTENSIONS))}"
        )

    content = await file.read()
    file_size = len(content)

    if file_size == 0:
        raise HTTPException(status_code=400, detail="File is empty.")

    if file_size > settings.MAX_FILE_SIZE_BYTES:
        mb = file_size / (1024 * 1024)
        raise HTTPException(
            status_code=400,
            detail=f"File is {mb:.1f}MB which exceeds the {settings.MAX_FILE_SIZE_MB}MB limit."
        )

    unique_name = f"{uuid.uuid4().hex}{suffix}"
    file_path = str(Path(settings.UPLOAD_DIR) / unique_name)

    async with aiofiles.open(file_path, "wb") as f:
        await f.write(content)

    now = datetime.utcnow()
    doc = {
        "filename": unique_name,
        "original_name": original_name,
        "file_size": file_size,
        "file_path": file_path,
        "upload_date": now,
        "status": "uploaded",
        "transcript": None,
        "ai_analysis": None,
        "created_at": now,
        "updated_at": now,
    }

    db = get_db()
    result = await db.interviews.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _doc_to_dict(doc)


async def list_interviews(search: str = None, status: str = None) -> list:
    db = get_db()
    query = {}
    if search:
        query["original_name"] = {"$regex": search, "$options": "i"}
    if status:
        query["status"] = status

    cursor = db.interviews.find(query).sort("created_at", -1)
    results = []
    async for doc in cursor:
        results.append(_doc_to_dict(doc))
    return results


async def get_interview(interview_id: str) -> dict:
    db = get_db()
    try:
        oid = ObjectId(interview_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid interview ID.")

    doc = await db.interviews.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Interview not found.")
    return _doc_to_dict(doc)


async def get_status(interview_id: str) -> dict:
    doc = await get_interview(interview_id)
    messages = {
        "uploaded":   "Ready for transcription.",
        "processing": "Transcription in progress…",
        "completed":  "Transcription complete.",
        "failed":     "Processing failed. You can retry.",
    }
    return {
        "id": doc["id"],
        "status": doc["status"],
        "message": messages.get(doc["status"], ""),
    }


async def run_transcription(interview_id: str):
    db = get_db()
    try:
        oid = ObjectId(interview_id)
    except Exception:
        logger.error(f"Invalid ObjectId: {interview_id}")
        return

    await db.interviews.update_one(
        {"_id": oid},
        {"$set": {"status": "processing", "updated_at": datetime.utcnow()}}
    )

    try:
        doc = await db.interviews.find_one({"_id": oid})
        if not doc:
            logger.error(f"Interview not found: {interview_id}")
            return

        logger.info(f"Starting transcription for {interview_id}")
        transcript = await transcribe_audio(doc["file_path"])

        logger.info(f"Starting AI analysis for {interview_id}")
        analysis = await generate_summary(transcript)

        await db.interviews.update_one(
            {"_id": oid},
            {
                "$set": {
                    "status": "completed",
                    "transcript": transcript,
                    "ai_analysis": analysis,
                    "updated_at": datetime.utcnow(),
                }
            }
        )
        logger.info(f"Completed: {interview_id}")

    except Exception as e:
        logger.error(f"Processing failed for {interview_id}: {e}")
        await db.interviews.update_one(
            {"_id": oid},
            {"$set": {"status": "failed", "updated_at": datetime.utcnow()}}
        )
