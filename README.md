# HR Interview Transcription & Analysis App

A full-stack application that enables HR professionals to upload interview recordings, automatically generate transcriptions, and perform AI-powered analysis of interview content.

---

## Project Overview

This application provides a streamlined workflow for HR teams:

1. **Upload** audio or video interview files (MP3, WAV, MP4, MOV, M4A, WEBM)
2. **Transcribe** recordings asynchronously using OpenAI Whisper API
3. **Analyse** transcripts using GPT-4o-mini to extract summaries, sentiment, keywords, and detected questions
4. **Review** results on a clean dashboard with search and filtering
5. **Export** transcripts and analysis as plain-text files

> **Note:** The application includes a full mock data fallback. If no `OPENAI_API_KEY` is provided, the system returns a realistic mock transcript and AI analysis so the entire workflow can be tested without any API costs or external dependencies.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Tailwind CSS |
| Backend | FastAPI (Python) |
| Database | MongoDB (via Motor async driver) |
| AI — Speech-to-Text | OpenAI Whisper API (`whisper-1`) |
| AI — Analysis | OpenAI GPT-4o-mini |
| File Storage | Local filesystem |
| Frontend Deployment | Vercel |
| Backend Deployment | Render |
| Database Hosting | MongoDB Atlas |

---

## Setup Instructions

### Prerequisites

- **Node.js** v20+
- **Python** 3.11+
- **MongoDB** running locally OR a MongoDB Atlas account

---

### 1. Clone the repository

```bash
git clone <repo-url>
cd hr-interview-app
```

---

### 2. Backend setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env
```

Edit `.env` with your values:

```env
MONGODB_URL=mongodb://localhost:27017/hr_interviews
OPENAI_API_KEY=        # Leave empty to use mock data
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=100
ALLOWED_EXTENSIONS=.mp3,.wav,.mp4,.mov,.m4a,.webm
CORS_ORIGINS=http://localhost:5173
```

```bash
# Start the backend
uvicorn main:app --reload --port 8000
```

Backend runs at: `http://localhost:8000`  
Interactive API docs: `http://localhost:8000/docs`

---

### 3. Frontend setup

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Frontend runs at: `http://localhost:5173`

---

### Environment Variables

#### Backend (`backend/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGODB_URL` | MongoDB connection string | `mongodb://localhost:27017/hr_interviews` |
| `OPENAI_API_KEY` | OpenAI API key for Whisper + GPT-4o-mini. **Leave empty to use mock data** | `""` |
| `UPLOAD_DIR` | Directory where uploaded files are saved | `./uploads` |
| `MAX_FILE_SIZE_MB` | Maximum upload file size in MB | `100` |
| `ALLOWED_EXTENSIONS` | Comma-separated list of allowed file extensions | `.mp3,.wav,.mp4,.mov,.m4a,.webm` |
| `CORS_ORIGINS` | Comma-separated list of allowed frontend origins | `http://localhost:5173` |

#### Frontend (`frontend/.env.production`)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API base URL e.g. `https://hr-interview-api.onrender.com/api` |

---

## Running Without an OpenAI API Key (Mock Mode)

The application works fully without an OpenAI API key. When `OPENAI_API_KEY` is empty:

- **Transcription** returns a realistic mock interview transcript
- **AI Analysis** returns a mock summary, sentiment, keywords, and questions

This allows complete end-to-end testing of the entire workflow at zero cost. To enable real transcription and analysis, simply add your OpenAI API key to the `.env` file.

---

## API Documentation

Base URL: `http://localhost:8000`

### Endpoints

#### `GET /health`
Health check.
```bash
curl http://localhost:8000/health
# {"status": "ok", "service": "HR Interview Transcription API"}
```

---

#### `POST /api/interviews/upload`
Upload an audio/video interview file.

- **Body:** `multipart/form-data` with field `file`
- **Validates:** File extension and size (≤ 100MB)
- **Returns:** Full interview object with `id` and `status: "uploaded"`

```bash
curl -X POST http://localhost:8000/api/interviews/upload \
  -F "file=@interview.mp3"
```

---

#### `GET /api/interviews`
List all interviews with optional search and filter.

- **Query params:**
  - `search` — filter by filename (case-insensitive)
  - `status` — filter by status: `uploaded`, `processing`, `completed`, `failed`

```bash
curl "http://localhost:8000/api/interviews?status=completed"
```

---

#### `GET /api/interviews/{id}`
Get full interview details including transcript and AI analysis.

```bash
curl http://localhost:8000/api/interviews/64abc123def456
```

---

#### `POST /api/interviews/{id}/transcribe`
Trigger asynchronous transcription and AI analysis.

- Returns immediately with `status: "processing"`
- Background task runs transcription → AI analysis → saves to MongoDB

```bash
curl -X POST http://localhost:8000/api/interviews/64abc123def456/transcribe
```

---

#### `GET /api/interviews/{id}/status`
Poll the current processing status of an interview.

```bash
curl http://localhost:8000/api/interviews/64abc123def456/status
# {"id": "...", "status": "completed", "message": "Transcription complete."}
```

---

## AI Integration

### Speech-to-Text — OpenAI Whisper (`whisper-1`)
Whisper was chosen for its state-of-the-art accuracy across accents, audio quality levels, and mixed speakers — all common in real HR interview recordings. It requires no self-hosting and integrates via a simple REST API.

### AI Analysis — OpenAI GPT-4o-mini
GPT-4o-mini was chosen for structured text analysis because it supports JSON response format for reliable output parsing, is fast and cost-effective for this use case, and produces high quality summaries and keyword extraction.

### Features Implemented
- **Interview Summary** — 3–5 sentence overview of the candidate's background, key strengths, and responses
- **Sentiment Analysis** — Overall tone: Positive / Neutral / Negative / Mixed
- **Keyword Extraction** — Skills, technologies, and competencies mentioned
- **Question Detection** — Identifies the interview questions that were asked

### Mock Fallback
When `OPENAI_API_KEY` is not set, the system returns hardcoded realistic mock data at every AI step. This was intentional — it allows the full application workflow to be demonstrated and tested without requiring API credentials.

---

## Technical Decisions

### Asynchronous Transcription
Transcription can take 30–120 seconds for real audio files. FastAPI's `BackgroundTasks` handles this without blocking the HTTP response. The frontend polls `/status` every 3 seconds until the job is `completed` or `failed`.

### Motor (Async MongoDB Driver)
Motor integrates natively with FastAPI's async event loop, avoiding thread pool overhead that the synchronous PyMongo driver would require.

### Extension-Based File Validation
File validation checks the file extension rather than MIME type. This was a deliberate decision — different browsers and operating systems report different MIME types for the same audio format, causing false rejections. Extension checking is consistent and reliable across all environments.

### Pydantic Settings with Flexible List Parsing
Environment variables like `CORS_ORIGINS` and `ALLOWED_EXTENSIONS` support multiple input formats (JSON arrays, comma-separated strings) via a custom `field_validator`. This makes the app easy to configure both locally and on cloud platforms like Render.

### Direct API URL (No Proxy)
The frontend calls the backend directly via `VITE_API_URL` rather than relying on a Vite dev proxy. This works consistently across both local development and production deployments.

---

## Database Schema (MongoDB)

**Collection: `interviews`**

```json
{
  "_id": "ObjectId",
  "filename": "uuid-generated.mp3",
  "original_name": "john_doe_interview.mp3",
  "file_size": 4200000,
  "file_path": "./uploads/uuid-generated.mp3",
  "upload_date": "2024-06-01T10:00:00Z",
  "status": "completed",
  "transcript": "Interviewer: Tell me about yourself...",
  "ai_analysis": {
    "summary": "The candidate demonstrated...",
    "sentiment": "Positive",
    "keywords": ["React", "TypeScript", "Leadership"],
    "questions": ["Tell me about yourself", "..."]
  },
  "created_at": "2024-06-01T10:00:00Z",
  "updated_at": "2024-06-01T10:03:42Z"
}
```

---

## Known Limitations & What I Would Improve With More Time

| Area | Current State | Improvement |
|------|--------------|-------------|
| **Authentication** | None | JWT-based auth with role-based access control |
| **Real-time updates** | Polling every 3 seconds | WebSocket connection for instant status push |
| **File storage** | Local filesystem | AWS S3 or GCS for production-grade durability and scalability |
| **Transcript timestamps** | Not available | Use Whisper `verbose_json` format for word-level timestamps |
| **Batch processing** | Single file only | Queue multiple files with Celery + Redis |
| **Search** | Filename only | Full-text search on transcript content using MongoDB Atlas Search |
| **Testing** | None | Pytest for backend endpoints + Vitest for frontend components |
| **Error recovery** | Manual retry | Automatic retry with exponential backoff for failed transcriptions |
| **File persistence on Render** | Files lost on redeploy | Migrate to S3 for persistent file storage |

---

## Deployment

| Service | Platform | URL |
|---------|----------|-----|
| Frontend | Vercel | https://hr-black-iota.vercel.app |
| Backend | Render | https://hr-interview-api.onrender.com |
| Database | MongoDB Atlas | Hosted cluster |

---

*Built with FastAPI, React, MongoDB, and OpenAI APIs.*