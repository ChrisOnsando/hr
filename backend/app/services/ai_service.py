import openai
import logging
from pathlib import Path
from app.core.config import settings

logger = logging.getLogger(__name__)

client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)


async def transcribe_audio(file_path: str) -> str:
    """
    Transcribe audio/video file using OpenAI Whisper API.
    Falls back to a mock transcript if API key is not set.
    """
    if not settings.OPENAI_API_KEY:
        logger.warning("No OpenAI API key set — returning mock transcript")
        return _mock_transcript()

    try:
        path = Path(file_path)
        with open(path, "rb") as audio_file:
            response = await client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                response_format="text",
            )
        return response
    except Exception as e:
        logger.error(f"Transcription failed: {e}")
        raise RuntimeError(f"Transcription failed: {str(e)}")


async def generate_summary(transcript: str) -> dict:
    """
    Use GPT-4 to generate an interview summary from the transcript.
    Falls back to mock data if API key is not set.
    """
    if not settings.OPENAI_API_KEY:
        logger.warning("No OpenAI API key set — returning mock AI analysis")
        return _mock_analysis()

    try:
        prompt = f"""You are an HR assistant analyzing an interview transcript.

Given the following interview transcript, provide a structured analysis in JSON format with these exact keys:
- "summary": A concise 3-5 sentence summary of the interview covering the candidate's background, key strengths, and notable responses.
- "sentiment": Overall sentiment of the interview — one of: "Positive", "Neutral", "Negative", or "Mixed".
- "keywords": A list of 8-12 key skills, technologies, or competencies mentioned.
- "questions": A list of the main interview questions that were asked (up to 8).
{transcript}
"""
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.3,
        )

        import json
        result = json.loads(response.choices[0].message.content)
        return {
            "summary": result.get("summary", ""),
            "sentiment": result.get("sentiment", "Neutral"),
            "keywords": result.get("keywords", []),
            "questions": result.get("questions", []),
        }
    except Exception as e:
        logger.error(f"AI analysis failed: {e}")
        raise RuntimeError(f"AI analysis failed: {str(e)}")


def _mock_transcript() -> str:
    return """Interviewer: Good morning! Thanks for coming in today. Can you start by telling me a bit about yourself and your background?

Candidate: Sure! I'm a software engineer with about 5 years of experience, mostly focused on full-stack web development. I've worked extensively with React, TypeScript, and Python on the frontend and backend respectively. Most recently I was at a fintech startup where I led a team of three developers building a real-time trading dashboard.

Interviewer: That sounds impressive. Can you tell me about a challenging technical problem you solved recently?

Candidate: Absolutely. We had a performance issue with our data pipeline — it was taking over 10 seconds to load certain views. I profiled the bottleneck to an N+1 query problem in our ORM. I rewrote the queries using proper joins and added Redis caching for frequently accessed data, which brought the load time down to under 500 milliseconds.

Interviewer: Great. How do you approach working in a team environment, especially when there are disagreements?

Candidate: I believe in data-driven discussions. When there are technical disagreements, I try to prototype the competing approaches if feasible, or at least lay out pros and cons clearly. I've found that removing ego from technical decisions leads to much better outcomes. Communication and empathy are just as important as technical skills.

Interviewer: What are your salary expectations for this role?

Candidate: Based on my research and experience level, I'm targeting somewhere in the $120,000 to $140,000 range, though I'm open to discussing the full compensation package including equity and benefits.

Interviewer: Perfect. Do you have any questions for us?

Candidate: Yes — I'd love to know more about the team structure and what the typical career path looks like for engineers here. Also, what are the biggest technical challenges the team is working on right now?"""


def _mock_analysis() -> dict:
    return {
        "summary": (
            "The candidate is an experienced full-stack engineer with 5 years of experience specializing in React, "
            "TypeScript, and Python. They demonstrated strong problem-solving skills with a concrete example of "
            "resolving a significant performance bottleneck. The candidate showed good interpersonal skills and "
            "a collaborative mindset, and expressed appropriate salary expectations aligned with their experience level."
        ),
        "sentiment": "Positive",
        "keywords": [
            "React", "TypeScript", "Python", "Full-stack", "Redis", "Performance optimization",
            "Team leadership", "N+1 query", "ORM", "Real-time systems", "Fintech", "Caching"
        ],
        "questions": [
            "Can you tell me about yourself and your background?",
            "Can you tell me about a challenging technical problem you solved recently?",
            "How do you approach working in a team environment?",
            "What are your salary expectations?",
            "Do you have any questions for us?"
        ],
    }
