from fastapi import APIRouter, UploadFile, File, BackgroundTasks, Query
from typing import Optional

from app.services import interview_service
from app.schemas.models import InterviewResponse, InterviewListItem, StatusResponse

router = APIRouter(prefix="/api/interviews", tags=["interviews"])


@router.post("/upload", response_model=InterviewResponse, status_code=201)
async def upload_interview(file: UploadFile = File(...)):
    """Upload an audio/video interview file."""
    return await interview_service.save_upload(file)


@router.get("", response_model=list[InterviewListItem])
async def list_interviews(
    search: Optional[str] = Query(None, description="Search by filename"),
    status: Optional[str] = Query(None, description="Filter by status"),
):
    """List all interviews with optional search and status filter."""
    return await interview_service.list_interviews(search=search, status=status)


@router.get("/{interview_id}", response_model=InterviewResponse)
async def get_interview(interview_id: str):
    """Get full details of a specific interview."""
    return await interview_service.get_interview(interview_id)


@router.post("/{interview_id}/transcribe", response_model=StatusResponse)
async def transcribe_interview(interview_id: str, background_tasks: BackgroundTasks):
    """Trigger transcription and AI analysis for an uploaded interview."""
    doc = await interview_service.get_interview(interview_id)

    background_tasks.add_task(interview_service.run_transcription, interview_id)

    return {
        "id": doc["id"],
        "status": "processing",
        "message": "Transcription started. Check status endpoint for updates.",
    }


@router.get("/{interview_id}/status", response_model=StatusResponse)
async def get_status(interview_id: str):
    """Get the current processing status of an interview."""
    return await interview_service.get_status(interview_id)
