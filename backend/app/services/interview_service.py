import uuid
import logging
import aiofiles
from pathlib import Path
from datetime import datetime
from bson import ObjectId
from fastapi import UploadFile, HTTPException

from app.core.config import settings
from app.core.database import get_db
from app.schemas.models import InterviewStatus
from app.services.ai_service import transcribe_audio, generate_summary

logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = set(settings.ALLOWED_EXTENSIONS)
MAX_FILE_SIZE = settings.MAX_FILE_SIZE_MB * 1024 * 1024


def _serialize(doc: dict) -> dict:
    """Convert MongoDB document to JSON-serializable dict."""
    if doc is None:
        return None
    doc["id"] = str(doc.pop("_id"))
    return doc


async def save_upload(file: UploadFile) -> dict:
    """Validate and save uploaded file, create DB record."""
    suffix = Path(file.filename).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{suffix}' not supported. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    content = await file.read()
    file_size = len(content)
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds maximum size of {settings.MAX_FILE_SIZE_MB}MB"
        )

    unique_name = f"{uuid.uuid4().hex}{suffix}"
    file_path = Path(settings.UPLOAD_DIR) / unique_name
    async with aiofiles.open(file_path, "wb") as f:
        await f.write(content)

    now = datetime.utcnow()
    doc = {
        "filename": unique_name,
        "original_name": file.filename,
        "file_size": file_size,
        "file_path": str(file_path),
        "upload_date": now,
        "status": InterviewStatus.UPLOADED,
        "transcript": None,
        "ai_analysis": None,
        "created_at": now,
        "updated_at": now,
    }

    db = get_db()
    result = await db.interviews.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _serialize(doc)


async def list_interviews(search: str = None, status: str = None) -> list:
    """Fetch all interviews with optional search/filter."""
    db = get_db()
    query = {}

    if search:
        query["original_name"] = {"$regex": search, "$options": "i"}
    if status:
        query["status"] = status

    cursor = db.interviews.find(
        query,
        {"filename": 1, "original_name": 1, "file_size": 1,
         "upload_date": 1, "status": 1, "created_at": 1}
    ).sort("created_at", -1)

    results = []
    async for doc in cursor:
        results.append(_serialize(doc))
    return results


async def get_interview(interview_id: str) -> dict:
    """Fetch a single interview by ID."""
    db = get_db()
    try:
        oid = ObjectId(interview_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid interview ID")

    doc = await db.interviews.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Interview not found")
    return _serialize(doc)


async def get_status(interview_id: str) -> dict:
    """Get just the processing status of an interview."""
    doc = await get_interview(interview_id)
    status_messages = {
        InterviewStatus.UPLOADED: "File uploaded, ready for transcription.",
        InterviewStatus.PROCESSING: "Transcription and analysis in progress...",
        InterviewStatus.COMPLETED: "Transcription and analysis complete.",
        InterviewStatus.FAILED: "Processing failed. Please try again.",
    }
    return {
        "id": doc["id"],
        "status": doc["status"],
        "message": status_messages.get(doc["status"], "Unknown status"),
    }


async def run_transcription(interview_id: str):
    """
    Background task: transcribe audio then generate AI summary.
    Updates MongoDB status throughout.
    """
    db = get_db()
    try:
        oid = ObjectId(interview_id)
    except Exception:
        logger.error(f"Invalid ObjectId: {interview_id}")
        return

    await db.interviews.update_one(
        {"_id": oid},
        {"$set": {"status": InterviewStatus.PROCESSING, "updated_at": datetime.utcnow()}}
    )

    try:
        doc = await db.interviews.find_one({"_id": oid})
        if not doc:
            logger.error(f"Interview {interview_id} not found for transcription")
            return

        logger.info(f"Starting transcription for {interview_id}")
        transcript = await transcribe_audio(doc["file_path"])

        logger.info(f"Starting AI analysis for {interview_id}")
        analysis = await generate_summary(transcript)

        await db.interviews.update_one(
            {"_id": oid},
            {
                "$set": {
                    "status": InterviewStatus.COMPLETED,
                    "transcript": transcript,
                    "ai_analysis": analysis,
                    "updated_at": datetime.utcnow(),
                }
            }
        )
        logger.info(f" Completed processing for {interview_id}")

    except Exception as e:
        logger.error(f"Processing failed for {interview_id}: {e}")
        await db.interviews.update_one(
            {"_id": oid},
            {
                "$set": {
                    "status": InterviewStatus.FAILED,
                    "updated_at": datetime.utcnow(),
                }
            }
        )
        