from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class InterviewStatus(str, Enum):
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class AIAnalysis(BaseModel):
    summary: Optional[str] = None
    sentiment: Optional[str] = None
    keywords: Optional[List[str]] = []
    questions: Optional[List[str]] = []


class InterviewBase(BaseModel):
    original_name: str
    file_size: int
    file_path: str
    status: InterviewStatus = InterviewStatus.UPLOADED
    transcript: Optional[str] = None
    ai_analysis: Optional[AIAnalysis] = None


class InterviewCreate(InterviewBase):
    filename: str
    upload_date: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class InterviewResponse(BaseModel):
    id: str
    filename: str
    original_name: str
    file_size: int
    file_path: str
    upload_date: datetime
    status: InterviewStatus
    transcript: Optional[str] = None
    ai_analysis: Optional[AIAnalysis] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class InterviewListItem(BaseModel):
    id: str
    original_name: str
    file_size: int
    upload_date: datetime
    status: InterviewStatus
    created_at: datetime


class StatusResponse(BaseModel):
    id: str
    status: InterviewStatus
    message: str
    