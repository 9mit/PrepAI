from pydantic import BaseModel, Field
from typing import List, Optional, Dict

class AnswerScore(BaseModel):
    accuracy: int = Field(..., ge=0, le=100, description="Accuracy of the answer")
    depth: int = Field(..., ge=0, le=100, description="Depth of knowledge demonstrated")
    clarity: int = Field(..., ge=0, le=100, description="Clarity and structure of the explanation")
    confidence: int = Field(..., ge=0, le=100, description="Confidence level inferred from the answer content")
    feedback: str = Field(..., description="Brief feedback explaining the scores")

class FollowUp(BaseModel):
    type: str = Field(..., description="Type of follow-up: 'challenge', 'probe', or 'hint'")
    question: str = Field(..., description="The follow-up question text")

class Question(BaseModel):
    id: str
    text: str
    topic: str

class EvaluationRecord(BaseModel):
    question: str
    answer: str
    score: AnswerScore
    latency: float = 30.0
    filler_ratio: float = 0.0

class SessionState(BaseModel):
    session_id: str
    target_role: str
    questions_asked: List[str] = []
    evaluation_results: List[EvaluationRecord] = []
    running_scores: Dict[str, float] = {"accuracy": 0, "depth": 0, "clarity": 0, "confidence": 0}
    follow_ups_used: int = 0
    is_completed: bool = False

class StartSessionRequest(BaseModel):
    role: str = Field(..., description="Target role for the interview")
    session_id: str = Field(..., description="Unique session identifier")

class NextQuestionRequest(BaseModel):
    session_id: str = Field(..., description="Session to advance")

class EvaluateAnswerRequest(BaseModel):
    session_id: str
    question_text: str
    text_answer: Optional[str] = None
    latency_seconds: float = 30.0
    filler_ratio: float = 0.0

class EvaluateAnswerResponse(BaseModel):
    score: AnswerScore
    follow_up: Optional[FollowUp] = None
    next_action: str = Field(..., description="'advance', 'follow_up', 'retry', or 'end'")
    message: str = Field(..., description="Message for the user")

# ── Frontend-proxy models (moved from client-side Groq calls) ──────────────

class ResumeParseRequest(BaseModel):
    text: str = Field(..., description="Raw resume text to parse")

class ResumeParseResponse(BaseModel):
    name: str = ""
    email: str = ""
    skills: List[str] = []
    experience: str = ""
    education: str = ""
    projects: str = ""
    githubUrl: str = ""
    bio: str = ""
    age: int = 0

class ChatMessageItem(BaseModel):
    role: str = Field(..., description="'user' or 'assistant'")
    content: str

class InterviewChatRequest(BaseModel):
    messages: List[ChatMessageItem]
    system_prompt: str

class InterviewAnalyzeCategory(BaseModel):
    category: str
    score: int
    fullMark: int = 100

class InterviewAnalyzeRequest(BaseModel):
    transcription: List[str]
    role: str
    company: str

class InterviewAnalyzeResponse(BaseModel):
    overallScore: int
    categories: List[InterviewAnalyzeCategory]
    feedback: List[str]
