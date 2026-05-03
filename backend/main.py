import os
import json
import logging
from typing import Optional, List
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from dotenv import load_dotenv
from groq import AsyncGroq

from models import (
    SessionState, Question, EvaluateAnswerResponse, AnswerScore, FollowUp,
    EvaluationRecord, StartSessionRequest, NextQuestionRequest, EvaluateAnswerRequest,
    ResumeParseRequest, ResumeParseResponse, InterviewChatRequest,
    InterviewAnalyzeRequest, InterviewAnalyzeResponse
)
from services.memory import init_redis, get_session, create_session, save_session
from services.evaluator import evaluate_answer
from services.follow_up import generate_follow_up
from services.planner import get_next_question
from services.report import generate_report
from services.transcriber import transcribe_audio

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="PrepAI v2 Backend")

origins = [
    "http://localhost:7860",
    "http://localhost:5173",
    os.getenv("FRONTEND_URL", ""),
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o for o in origins if o],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    await init_redis()

@app.post("/session/start", response_model=Question)
async def start_session(request: StartSessionRequest):
    """
    Starts a new interview session for the given role.
    """
    session = await create_session(request.session_id, request.role)
    next_q = await get_next_question(session)
    session.questions_asked.append(next_q.text)
    await save_session(session)
    return next_q

@app.post("/session/evaluate", response_model=EvaluateAnswerResponse)
async def evaluate_turn(
    session_id: str = Form(...),
    question_text: str = Form(...),
    latency_seconds: float = Form(30.0),
    filler_ratio: float = Form(0.0),
    audio_file: Optional[UploadFile] = File(None),
    text_answer: Optional[str] = Form(None)
):
    """
    Evaluates the answer (either audio or text) and decides the next action.
    Accepts multipart form data to support audio file uploads.
    All fields are validated via Pydantic-backed Form parameters.
    """
    # Validate via the Pydantic model (structural check)
    _validated = EvaluateAnswerRequest(
        session_id=session_id,
        question_text=question_text,
        text_answer=text_answer,
        latency_seconds=latency_seconds,
        filler_ratio=filler_ratio
    )

    session = await get_session(_validated.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or expired")
        
    answer = _validated.text_answer
    if audio_file:
        audio_bytes = await audio_file.read()
        answer = await transcribe_audio(audio_bytes)
        
    if not answer:
        raise HTTPException(status_code=400, detail="No answer provided or transcription failed")
        
    # Module 1: Evaluate
    score = await evaluate_answer(_validated.question_text, answer)
    
    # Update running scores
    session.running_scores["accuracy"] += score.accuracy
    session.running_scores["depth"] += score.depth
    session.running_scores["clarity"] += score.clarity
    session.running_scores["confidence"] += score.confidence
    session.evaluation_results.append(EvaluationRecord(
        question=_validated.question_text,
        answer=answer,
        score=score,
        latency=_validated.latency_seconds,
        filler_ratio=_validated.filler_ratio
    ))
    
    # Python Logic: Make Decision
    avg_score = (score.accuracy + score.depth + score.clarity + score.confidence) / 4.0
    
    follow_up = None
    next_action = "advance"
    message = "Great! Let's move on to the next question."
    
    if avg_score >= 80:
        # Advance to next question
        next_action = "advance"
        message = "Excellent answer. Moving on."
        # We COULD provide a challenge if we want, but instructions say "advance to the next question"
    elif avg_score >= 50:
        # Probe
        next_action = "follow_up"
        session.follow_ups_used += 1
        follow_up = await generate_follow_up(question_text, answer, score)
        message = "Good start, but let's dig deeper."
    else:
        # Hint and retry
        next_action = "retry"
        session.follow_ups_used += 1
        follow_up = await generate_follow_up(question_text, answer, score)
        message = "Let's try that again with a hint."
        
    # Check if max questions reached (e.g., 3 for benchmark)
    if next_action == "advance" and len(session.questions_asked) >= 3:
        next_action = "end"
        session.is_completed = True
        message = "Interview completed. Generating report."
        
    await save_session(session)
    
    return EvaluateAnswerResponse(
        score=score,
        follow_up=follow_up,
        next_action=next_action,
        message=message
    )

@app.post("/session/next", response_model=Question)
async def get_next(request: NextQuestionRequest):
    session = await get_session(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    next_q = await get_next_question(session)
    session.questions_asked.append(next_q.text)
    await save_session(session)
    return next_q

@app.get("/session/report")
async def get_report(session_id: str):
    session = await get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    # Calculate averages
    avg_latency = 30.0
    avg_filler = 0.0
    if session.evaluation_results:
        avg_latency = sum(r.latency for r in session.evaluation_results) / len(session.evaluation_results)
        avg_filler = sum(r.filler_ratio for r in session.evaluation_results) / len(session.evaluation_results)
        
    pdf_path = await generate_report(session, avg_latency, avg_filler)
    
    if os.path.exists(pdf_path):
        return FileResponse(pdf_path, media_type="application/pdf", filename=f"report_{session_id}.pdf")
    else:
        raise HTTPException(status_code=500, detail="Failed to generate report")

# ── Frontend-proxy routes (moved from client-side Groq calls) ──────────────

@app.post("/parse-resume", response_model=ResumeParseResponse)
async def parse_resume(request: ResumeParseRequest):
    """
    Parses resume text using Groq and returns structured profile data.
    Previously this was done client-side, exposing the API key.
    """
    client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))
    system_prompt = (
        "You are an expert resume parser. You MUST output a valid JSON object. "
        "Do not include any explanation or markdown formatting."
    )
    user_prompt = f"""You will be given resume text. Extract details into this exact JSON structure:
{{
  "name": "Full Name",
  "email": "email@example.com",
  "skills": ["Skill1", "Skill2"],
  "experience": "Summary of work history...",
  "education": "Summary of education...",
  "projects": "Summary of projects...",
  "githubUrl": "github.com/profile",
  "bio": "Professional summary",
  "age": 0
}}

Rules:
- If a field is not found, use a reasonable empty value (e.g. "" or []).
- "skills" MUST be an array of strings.
- "experience" should be a substantial paragraph if data exists.

Resume Text:
{request.text}"""

    try:
        completion = await client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            model="llama-3.3-70b-versatile",
            temperature=0,
            response_format={"type": "json_object"}
        )
        content = completion.choices[0].message.content
        if not content:
            raise HTTPException(status_code=500, detail="No content received from Groq")
        data = json.loads(content)
        return ResumeParseResponse(**data)
    except Exception as e:
        logger.error(f"Resume parse error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/interview/chat")
async def interview_chat(request: InterviewChatRequest):
    """
    Streams an interviewer response. Returns SSE text/event-stream.
    """
    client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))
    full_messages = [{"role": "system", "content": request.system_prompt}] + [
        {"role": m.role, "content": m.content} for m in request.messages
    ]

    async def event_generator():
        try:
            stream = await client.chat.completions.create(
                messages=full_messages,
                model="llama-3.3-70b-versatile",
                temperature=0.7,
                max_tokens=500,
                stream=True,
            )
            async for chunk in stream:
                token = chunk.choices[0].delta.content or ""
                if token:
                    yield f"data: {json.dumps({'token': token})}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            logger.error(f"Interview chat stream error: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.post("/interview/analyze", response_model=InterviewAnalyzeResponse)
async def interview_analyze(request: InterviewAnalyzeRequest):
    """
    Analyzes a completed interview transcript and returns structured feedback.
    """
    client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))
    transcript_text = "\n".join(request.transcription)
    system_prompt = (
        "You are an expert interview coach. Analyze interviews and "
        "provide structured feedback in JSON format only."
    )
    user_prompt = f"""Analyze the following interview transcript between an AI Interviewer and a Candidate for a {request.role} position at {request.company}.

Transcript:
{transcript_text}

Provide evaluation in this exact JSON format:
{{
  "overallScore": <number 1-100>,
  "categories": [
    {{"category": "Communication", "score": <number>, "fullMark": 100}},
    {{"category": "Technical Knowledge", "score": <number>, "fullMark": 100}},
    {{"category": "Problem Solving", "score": <number>, "fullMark": 100}},
    {{"category": "Cultural Fit", "score": <number>, "fullMark": 100}},
    {{"category": "Confidence", "score": <number>, "fullMark": 100}}
  ],
  "feedback": ["<specific feedback point 1>", "<specific feedback point 2>", "<specific feedback point 3>"]
}}"""

    try:
        completion = await client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            model="llama-3.3-70b-versatile",
            temperature=0,
            response_format={"type": "json_object"}
        )
        content = completion.choices[0].message.content
        if not content:
            raise HTTPException(status_code=500, detail="No analysis content")
        data = json.loads(content)
        return InterviewAnalyzeResponse(**data)
    except Exception as e:
        logger.error(f"Interview analysis error: {e}")
        return InterviewAnalyzeResponse(
            overallScore=70,
            categories=[
                {"category": "Communication", "score": 70, "fullMark": 100},
                {"category": "Technical Knowledge", "score": 70, "fullMark": 100},
                {"category": "Problem Solving", "score": 70, "fullMark": 100},
                {"category": "Cultural Fit", "score": 70, "fullMark": 100},
                {"category": "Confidence", "score": 70, "fullMark": 100}
            ],
            feedback=["Interview completed. Analysis could not be generated."]
        )
