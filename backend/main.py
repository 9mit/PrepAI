import io
import json
import logging
import os
import sys
import time
from collections import defaultdict
from contextlib import asynccontextmanager
from pathlib import Path

# Ensure backend directory is on sys.path for both local root and container execution
_backend_dir = str(Path(__file__).resolve().parent)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

from dotenv import load_dotenv
from fastapi import (
    Depends,
    FastAPI,
    File,
    Form,
    Header,
    HTTPException,
    Request,
    UploadFile,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response, StreamingResponse
from models import (
    EvaluateAnswerResponse,
    EvaluationRecord,
    FeedbackRequest,
    InterviewAnalyzeRequest,
    InterviewAnalyzeResponse,
    InterviewChatRequest,
    InterviewClientReportRequest,
    NextQuestionRequest,
    Question,
    QuizGenerateRequest,
    QuizGenerateResponse,
    QuizQuestionModel,
    ResumeParseRequest,
    ResumeParseResponse,
    StartSessionRequest,
)
from prompts import (
    ANALYZE_SYSTEM_SUFFIX,
    PARSE_RESUME_SYSTEM,
    SYSTEM_GUARDRAIL,
    build_analyze_user_prompt,
    build_parse_resume_user_prompt,
)
from pydantic import ValidationError
from services.evaluator import evaluate_answer
from services.follow_up import generate_follow_up
from services.llm import (
    chat_completion_with_fallback,
    get_groq_client,
    get_primary_model,
)
from services.memory import (
    create_session,
    get_session,
    init_redis,
    ping_redis,
    save_session,
)
from services.planner import get_next_question
from services.report import generate_client_report_bytes, generate_report_bytes
from services.security import (
    audit_event,
    enforce_issue_rate,
    mint_access_token,
    require_bearer,
    sanitize_filename,
    trusted_client_ip,
)
from services.transcriber import transcribe_audio
from starlette.middleware.base import BaseHTTPMiddleware

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DISABLE_DOCS = os.getenv("DISABLE_DOCS", "false").lower() in ("1", "true", "yes")
PREPAI_ENV = os.getenv("PREPAI_ENV", os.getenv("ENV", os.getenv("ENVIRONMENT", "development"))).lower()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    if PREPAI_ENV in ("production", "prod"):
        if not os.getenv("PREPAI_JWT_SECRET", "").strip():
            raise RuntimeError("PREPAI_JWT_SECRET is required when PREPAI_ENV=production")
    await init_redis()
    yield


app = FastAPI(
    title="PrepAI v2 Backend",
    lifespan=lifespan,
    docs_url=None if DISABLE_DOCS else "/docs",
    redoc_url=None if DISABLE_DOCS else "/redoc",
    openapi_url=None if DISABLE_DOCS else "/openapi.json",
)

MAX_AUDIO_BYTES = 20 * 1024 * 1024
MAX_RESUME_CHARS = 80_000
MAX_SYSTEM_PROMPT_CHARS = 12_000
MAX_TRANSCRIPT_LINES = 200
RATE_LIMIT_WINDOW_SEC = 60
RATE_LIMIT_MAX_REQUESTS = 30

_rate_buckets: dict[str, list[float]] = defaultdict(list)

ALLOWED_AUDIO_TYPES = {
    "audio/webm",
    "audio/wav",
    "audio/wave",
    "audio/x-wav",
    "audio/mpeg",
    "audio/mp3",
    "audio/mp4",
    "audio/ogg",
    "audio/flac",
}


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault(
            "Permissions-Policy",
            "camera=(self), microphone=(self), geolocation=()",
        )
        response.headers.setdefault(
            "Content-Security-Policy",
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://cdnjs.cloudflare.com; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com https://cdn.tailwindcss.com; "
            "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com data:; "
            "img-src 'self' data: blob: https:; "
            "connect-src 'self' https://api.github.com https://huggingface.co https://*.hf.space http://localhost:* http://127.0.0.1:*; "
            "media-src 'self' blob:; "
            "worker-src 'self' blob:; "
            "frame-ancestors 'self' https://huggingface.co https://*.huggingface.co; "
            "base-uri 'self'; "
            "form-action 'self'",
        )
        if request.url.scheme == "https":
            response.headers.setdefault(
                "Strict-Transport-Security",
                "max-age=31536000; includeSubDomains",
            )
        return response


def _build_cors_origins() -> list[str]:
    origins = [
        "http://localhost:7860",
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:4173",
        "http://127.0.0.1:7860",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:4173",
    ]
    extra = os.getenv("FRONTEND_URL", "").strip()
    if extra:
        origins.append(extra.rstrip("/"))
    space_host = os.getenv("SPACE_HOST", "").strip()
    if space_host:
        origins.append(f"https://{space_host.rstrip('/')}")
    seen: set[str] = set()
    out: list[str] = []
    for o in origins:
        if o and o not in seen:
            seen.add(o)
            out.append(o)
    return out


app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_build_cors_origins(),
    allow_origin_regex=r"https://.*\.hf\.space",
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)




def _enforce_rate_limit(request: Request) -> None:
    ip = trusted_client_ip(request)
    now = time.time()
    if len(_rate_buckets) > 500:
        stale = [k for k, timestamps in _rate_buckets.items() if not timestamps or (now - timestamps[-1] >= RATE_LIMIT_WINDOW_SEC)]
        for k in stale:
            _rate_buckets.pop(k, None)
    bucket = [t for t in _rate_buckets[ip] if now - t < RATE_LIMIT_WINDOW_SEC]
    if len(bucket) >= RATE_LIMIT_MAX_REQUESTS:
        audit_event("rate_limited", request, {"ip": ip})
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Try again shortly.")
    bucket.append(now)
    _rate_buckets[ip] = bucket


@app.get("/health")
async def health():
    redis_ok = await ping_redis()
    status = "ok" if redis_ok else "degraded"
    code = 200 if redis_ok else 503
    return JSONResponse(status_code=code, content={"status": status, "redis": redis_ok})


@app.post("/auth/session")
async def create_auth_session(http_request: Request):
    """Issue a short-lived guest access token required for protected API routes."""
    ip = trusted_client_ip(http_request)
    enforce_issue_rate(ip)
    token, expires_in = mint_access_token(subject=f"guest:{ip}")
    audit_event("auth_issued", http_request, {})
    return {"access_token": token, "token_type": "bearer", "expires_in": expires_in}


@app.post("/session/start", response_model=Question)
async def start_session(
    request: StartSessionRequest,
    http_request: Request,
    _claims: dict = Depends(require_bearer),
):
    _enforce_rate_limit(http_request)
    session = await create_session(
        request.session_id,
        request.role,
        target_questions=request.target_questions,
        job_description=request.job_description,
        resume_context=request.resume_context,
        interview_field=request.interview_field,
        company_style=request.company_style,
        interview_mode=request.interview_mode,
        domain_pack=request.domain_pack,
    )
    next_q = await get_next_question(session)
    session.questions_asked.append(next_q.text)
    if next_q.topic and next_q.topic not in session.topics_covered:
        session.topics_covered.append(next_q.topic)
    await save_session(session)
    audit_event("session_start", http_request, {"session_id": request.session_id[:64]})
    return next_q


@app.post("/session/evaluate", response_model=EvaluateAnswerResponse)
async def evaluate_turn(
    http_request: Request,
    session_id: str = Header(..., alias="X-Session-ID"),
    question_text: str = Form(...),
    text_answer: str | None = Form(None),
    latency_seconds: float = Form(30.0),
    filler_ratio: float = Form(0.0),
    audio_file: UploadFile | None = File(None),
    _claims: dict = Depends(require_bearer),
):
    _enforce_rate_limit(http_request)

    session = await get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or expired")

    answer = text_answer
    if audio_file is not None:
        content_type = (audio_file.content_type or "").split(";")[0].strip().lower()
        if content_type not in ALLOWED_AUDIO_TYPES:
            raise HTTPException(status_code=400, detail=f"Unsupported audio type: {content_type}")
        audio_bytes = await audio_file.read()
        if len(audio_bytes) > MAX_AUDIO_BYTES:
            raise HTTPException(status_code=413, detail="Audio file too large (max 20MB)")
        if audio_bytes:
            filename = getattr(audio_file, "filename", None) or "recording.webm"
            transcribed = await transcribe_audio(audio_bytes, filename=filename)
            if not transcribed or not transcribed.strip():
                raise HTTPException(status_code=502, detail="Audio transcription failed or produced empty text")
            answer = transcribed

    if not answer or not str(answer).strip():
        raise HTTPException(status_code=400, detail="No answer provided")

    score = await evaluate_answer(question_text, answer)

    # One-line memory for planner / follow-ups
    summary_line = f"Q: {question_text[:80]} | Acc {score.accuracy}/Dep {score.depth}: {score.feedback[:120]}"
    session.answer_summaries.append(summary_line)
    if len(session.answer_summaries) > 12:
        session.answer_summaries = session.answer_summaries[-12:]

    # Thread state: claim excerpt + open gap
    claim = " ".join(str(answer).split()[:18])
    if claim:
        session.claims_made.append(claim[:140])
        session.claims_made = session.claims_made[-8:]
    if score.accuracy < 80 or score.depth < 80:
        gap = f"Gap on: {question_text[:60]}"
        if gap not in session.open_threads:
            session.open_threads.append(gap)
            session.open_threads = session.open_threads[-6:]
    elif session.open_threads:
        session.open_threads = session.open_threads[1:]

    session.running_scores["accuracy"] += score.accuracy
    session.running_scores["depth"] += score.depth
    session.running_scores["clarity"] += score.clarity
    session.running_scores["confidence"] += score.confidence
    session.evaluation_results.append(EvaluationRecord(
        question=question_text,
        answer=answer,
        score=score,
        latency=latency_seconds,
        filler_ratio=filler_ratio,
    ))

    avg_score = (score.accuracy + score.depth + score.clarity + score.confidence) / 4.0

    follow_up = None
    next_action = "advance"
    message = "Great! Let's move on to the next question."

    if avg_score >= 80:
        next_action = "advance"
        message = "Excellent answer. Moving on."
        session.strong_advances += 1
        if session.strong_advances >= 2:
            session.intensity_nudge = "Increase difficulty: ask sharper trade-offs and challenge assumptions."
    elif avg_score >= 50:
        next_action = "follow_up"
        session.follow_ups_used += 1
        follow_up = await generate_follow_up(question_text, answer, score, session)
        message = "Good start, but let's dig deeper."
    else:
        next_action = "retry"
        session.follow_ups_used += 1
        follow_up = await generate_follow_up(question_text, answer, score, session)
        message = "Let's try that again with a hint."

    target_q = getattr(session, "target_questions", 5) or 5
    if next_action == "advance" and len(session.questions_asked) >= target_q:
        next_action = "end"
        session.is_completed = True
        message = "Interview completed. Generating report."

    await save_session(session)
    return EvaluateAnswerResponse(
        score=score,
        follow_up=follow_up,
        next_action=next_action,
        message=message,
    )


@app.post("/session/next", response_model=Question)
async def get_next(
    request: NextQuestionRequest,
    http_request: Request,
    _claims: dict = Depends(require_bearer),
):
    _enforce_rate_limit(http_request)
    session = await get_session(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    next_q = await get_next_question(session)
    session.questions_asked.append(next_q.text)
    if next_q.topic and next_q.topic not in session.topics_covered:
        session.topics_covered.append(next_q.topic)
    await save_session(session)
    return next_q


@app.get("/session/report")
async def get_report(
    session_id: str,
    http_request: Request,
    _claims: dict = Depends(require_bearer),
):
    _enforce_rate_limit(http_request)
    session = await get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    avg_latency = 30.0
    avg_filler = 0.0
    if session.evaluation_results:
        avg_latency = sum(r.latency for r in session.evaluation_results) / len(session.evaluation_results)
        avg_filler = sum(r.filler_ratio for r in session.evaluation_results) / len(session.evaluation_results)

    pdf_bytes = await generate_report_bytes(session, avg_latency, avg_filler)
    if not pdf_bytes:
        raise HTTPException(status_code=500, detail="Failed to generate report")

    safe_id = sanitize_filename(session_id)
    audit_event("session_report", http_request, {"session_id": safe_id})
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="report_{safe_id}.pdf"'},
    )


@app.post("/parse-resume", response_model=ResumeParseResponse)
async def parse_resume(
    request: ResumeParseRequest,
    http_request: Request,
    _claims: dict = Depends(require_bearer),
):
    _enforce_rate_limit(http_request)
    if len(request.text) > MAX_RESUME_CHARS:
        raise HTTPException(status_code=413, detail="Resume text too large")

    system_prompt = SYSTEM_GUARDRAIL + PARSE_RESUME_SYSTEM
    user_prompt = build_parse_resume_user_prompt(request.text[:MAX_RESUME_CHARS])

    try:
        content = await chat_completion_with_fallback(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0,
            max_tokens=1500,
            response_format={"type": "json_object"},
        )
        if not content:
            raise HTTPException(status_code=500, detail="No content received from Groq")
        data = json.loads(content)
        return ResumeParseResponse(**data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Resume parse error: %s", e, exc_info=True)
        audit_event("parse_resume_error", http_request, {"error": type(e).__name__})
        raise HTTPException(status_code=500, detail="Failed to parse resume")


@app.post("/interview/chat")
async def interview_chat(
    request: InterviewChatRequest,
    http_request: Request,
    _claims: dict = Depends(require_bearer),
):
    _enforce_rate_limit(http_request)
    if len(request.system_prompt) > MAX_SYSTEM_PROMPT_CHARS:
        raise HTTPException(status_code=413, detail="System prompt too large")
    if len(request.messages) > 80:
        raise HTTPException(status_code=413, detail="Too many messages")

    client = get_groq_client()
    guarded_system = SYSTEM_GUARDRAIL + request.system_prompt
    full_messages = [{"role": "system", "content": guarded_system}] + [
        {"role": m.role, "content": m.content[:8000]}
        for m in request.messages
        if m.role in ("user", "assistant")
    ]

    async def event_generator():
        try:
            stream = await client.chat.completions.create(
                messages=full_messages,
                model=get_primary_model(),
                temperature=0.7,
                max_tokens=1500,
                stream=True,
            )
            async for chunk in stream:
                token = chunk.choices[0].delta.content or ""
                if token:
                    yield f"data: {json.dumps({'token': token})}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            logger.error("Interview chat stream error: %s", e, exc_info=True)
            yield f"data: {json.dumps({'error': 'Stream failed'})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.post("/quiz/generate", response_model=QuizGenerateResponse)
async def generate_quiz_endpoint(
    request: QuizGenerateRequest,
    http_request: Request,
    _claims: dict = Depends(require_bearer),
):
    _enforce_rate_limit(http_request)
    difficulty_guide = {
        "easy": "Keep questions beginner-friendly with clear, unambiguous concepts.",
        "hard": "Make questions advanced, scenario-based; test deep trade-offs and edge cases.",
        "medium": "Mix fundamental to intermediate questions with practical applied scenarios.",
    }.get(request.difficulty, "Mix fundamental to intermediate questions.")

    domain_context = f" Domain: {request.domain}." if request.domain else ""

    system_prompt = (
        f"{SYSTEM_GUARDRAIL}You are a master technical and career educator at PrepAI. "
        f"Generate a top-tier interview preparation quiz for topic: '{request.topic}'.{domain_context}\n"
        f"Difficulty: {request.difficulty}. {difficulty_guide}\n\n"
        "REQUIREMENTS:\n"
        "1. conceptExplanation: Deep, intuitive ELI5 explanation of the core concept (2-3 paragraphs).\n"
        "2. syntaxGuide: Key frameworks, mental models, formulas, or syntax examples (code only if technical topic).\n"
        "3. quizQuestions: Exactly 5 high-quality multiple choice questions.\n"
        "4. Each question must have exactly 4 distinct options.\n"
        "5. correctAnswer: 0, 1, 2, or 3 (0-indexed).\n"
        "6. explanation: Clear explanation of why the correct option is right and others are suboptimal.\n"
        "Output ONLY valid JSON matching the schema."
    )

    user_prompt = f"Generate 5 MCQ questions for: {request.topic} ({request.difficulty} difficulty)."

    try:
        content = await chat_completion_with_fallback(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.4,
            max_tokens=2200,
            response_format={"type": "json_object"},
        )
        data = json.loads(content)
        raw_q = data.get("quizQuestions") or data.get("questions") or []
        questions = []
        for idx, q in enumerate(raw_q[:5]):
            opts = [str(o) for o in q.get("options", [])][:4]
            while len(opts) < 4:
                opts.append(f"Option {len(opts) + 1}")
            c_idx = q.get("correctAnswer", q.get("correct_answer", 0))
            if not isinstance(c_idx, int) or c_idx < 0 or c_idx > 3:
                c_idx = 0
            questions.append(
                QuizQuestionModel(
                    question=str(q.get("question", f"Question {idx + 1} on {request.topic}")),
                    options=opts,
                    correctAnswer=c_idx,
                    explanation=str(q.get("explanation", "Review core principles for details.")),
                )
            )

        if len(questions) < 5:
            for i in range(len(questions), 5):
                questions.append(
                    QuizQuestionModel(
                        question=f"Which practice is most effective when working with {request.topic}?",
                        options=[
                            "Consistent structured evaluation and iterative validation",
                            "Ignoring edge cases and bypassing documentation",
                            "Skipping testing in favor of immediate deployment",
                            "Using undocumented assumptions without verification",
                        ],
                        correctAnswer=0,
                        explanation="Structured evaluation and validation prevent defects and ensure maintainability.",
                    )
                )

        return QuizGenerateResponse(
            topic=str(data.get("topic", request.topic)),
            difficulty=str(data.get("difficulty", request.difficulty)),
            conceptExplanation=str(data.get("conceptExplanation", f"Overview of {request.topic}")),
            syntaxGuide=str(data.get("syntaxGuide", f"Key practices for {request.topic}")),
            quizQuestions=questions,
        )
    except Exception as exc:
        logger.error("Quiz generation error: %s", exc, exc_info=True)
        fallback_questions = [
            QuizQuestionModel(
                question=f"What is the foundational principle behind {request.topic}?",
                options=[
                    "Systematic problem solving with clear trade-offs and validation",
                    "Relying on arbitrary conventions without documentation",
                    "Avoiding modularity in large applications",
                    "Deprecating backward compatibility without notice",
                ],
                correctAnswer=0,
                explanation="Structured problem solving with measurable validation is central to professional practice.",
            ),
            QuizQuestionModel(
                question=f"How should you handle unexpected edge cases in {request.topic}?",
                options=[
                    "Implement defensive validation, graceful degradation, and clear logging",
                    "Silently suppress errors and return undefined states",
                    "Crash the entire process immediately",
                    "Ignore them until reported in production",
                ],
                correctAnswer=0,
                explanation="Defensive validation and graceful error recovery ensure high reliability.",
            ),
            QuizQuestionModel(
                question=f"When discussing {request.topic} in an interview, what is the best strategy?",
                options=[
                    "Use the STAR method: Situation, Task, Action, Result with quantifiable impact",
                    "Give brief one-word answers without elaboration",
                    "Avoid mentioning real-world metrics or outcomes",
                    "Focus only on negative setbacks without showing resolution",
                ],
                correctAnswer=0,
                explanation="The STAR method provides structure, context, and clear demonstrable outcomes.",
            ),
            QuizQuestionModel(
                question=f"Which metric is most relevant when assessing success in {request.topic}?",
                options=[
                    "Measurable impact on reliability, performance, or business outcomes",
                    "Total number of lines of code written",
                    "Number of meetings scheduled per week",
                    "Complexity of unnecessary abstractions added",
                ],
                correctAnswer=0,
                explanation="Impact is measured by tangible improvements in reliability, user experience, and velocity.",
            ),
            QuizQuestionModel(
                question=f"What demonstrates senior-level mastery of {request.topic}?",
                options=[
                    "Balancing trade-offs, architecture scalability, and clear cross-team communication",
                    "Knowing syntax without understanding underlying performance trade-offs",
                    "Refusing to adapt when project constraints change",
                    "Prioritizing theoretical elegance over pragmatic delivery",
                ],
                correctAnswer=0,
                explanation="Senior practitioners balance architecture, real-world constraints, and team communication.",
            ),
        ]
        return QuizGenerateResponse(
            topic=request.topic,
            difficulty=request.difficulty,
            conceptExplanation=f"Deep dive into {request.topic}: understanding trade-offs, practical applications, and interview frameworks.",
            syntaxGuide=f"Best practices and key patterns for mastering {request.topic} in technical interviews.",
            quizQuestions=fallback_questions,
        )


@app.post("/interview/analyze", response_model=InterviewAnalyzeResponse)
async def interview_analyze(
    request: InterviewAnalyzeRequest,
    http_request: Request,
    _claims: dict = Depends(require_bearer),
):
    _enforce_rate_limit(http_request)
    if len(request.transcription) > MAX_TRANSCRIPT_LINES:
        raise HTTPException(status_code=413, detail="Transcript too long")

    transcript_text = "\n".join(request.transcription[:MAX_TRANSCRIPT_LINES])
    context_extra = ""
    if request.job_description:
        context_extra += f"\nJob description excerpt:\n{request.job_description[:2000]}\n"
    if request.resume_context:
        context_extra += f"\nResume context excerpt:\n{request.resume_context[:2000]}\n"
    if request.interview_field or request.company_style or request.interview_mode or request.domain_pack:
        context_extra += (
            f"\nField: {request.interview_field or 'n/a'}; "
            f"Company style: {request.company_style or 'n/a'}; "
            f"Mode: {request.interview_mode or 'n/a'}; "
            f"Domain pack: {request.domain_pack or 'n/a'}\n"
        )

    system_prompt = SYSTEM_GUARDRAIL + ANALYZE_SYSTEM_SUFFIX
    user_prompt = build_analyze_user_prompt(
        role=request.role,
        company=request.company,
        context_extra=context_extra,
        transcript_text=transcript_text,
    )

    try:
        content = await chat_completion_with_fallback(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0,
            max_tokens=2500,
            response_format={"type": "json_object"},
        )
        if not content:
            raise HTTPException(status_code=500, detail="No analysis content")
        data = json.loads(content)
        return InterviewAnalyzeResponse(**data)
    except ValidationError as e:
        logger.error("Interview analysis validation error: %s", e)
    except Exception as e:
        logger.error("Interview analysis error: %s", e, exc_info=True)

    return InterviewAnalyzeResponse(
        overallScore=70,
        categories=[
            {"category": "Communication", "score": 70, "fullMark": 100},
            {"category": "Role Knowledge", "score": 70, "fullMark": 100},
            {"category": "Problem Solving", "score": 70, "fullMark": 100},
            {"category": "Cultural Fit", "score": 70, "fullMark": 100},
            {"category": "Confidence", "score": 70, "fullMark": 100},
        ],
        feedback=["Interview completed. Analysis could not be generated."],
        strengths=[],
        weaknesses=[],
        categoryExplanations=[],
        improvementPlan=["Retry a practice interview focusing on structured answers."],
        sampleAnswers=[],
    )


@app.post("/feedback")
async def submit_feedback(
    request: FeedbackRequest,
    http_request: Request,
    _claims: dict = Depends(require_bearer),
):
    _enforce_rate_limit(http_request)
    audit_event(
        "user_feedback",
        http_request,
        {"type": request.type, "rating": request.rating, "len": len(request.message)},
    )
    logger.info(
        "User feedback type=%s rating=%s message=%s",
        request.type,
        request.rating,
        request.message[:500],
    )
    return {"ok": True}


@app.post("/interview/report")
async def interview_client_report(
    request: InterviewClientReportRequest,
    http_request: Request,
    _claims: dict = Depends(require_bearer),
):
    _enforce_rate_limit(http_request)
    pdf_bytes = await generate_client_report_bytes(request)
    if not pdf_bytes:
        raise HTTPException(status_code=500, detail="Failed to generate report")
    safe_id = sanitize_filename(request.session_id)
    audit_event("client_report", http_request, {"session_id": safe_id})
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="report_{safe_id}.pdf"'},
    )
