from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Dict, Literal


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


def _default_running_scores() -> Dict[str, float]:
    return {"accuracy": 0.0, "depth": 0.0, "clarity": 0.0, "confidence": 0.0}


class SessionState(BaseModel):
    session_id: str
    target_role: str
    target_questions: int = 5
    questions_asked: List[str] = Field(default_factory=list)
    evaluation_results: List[EvaluationRecord] = Field(default_factory=list)
    running_scores: Dict[str, float] = Field(default_factory=_default_running_scores)
    follow_ups_used: int = 0
    is_completed: bool = False
    answer_summaries: List[str] = Field(default_factory=list)
    topics_covered: List[str] = Field(default_factory=list)
    claims_made: List[str] = Field(default_factory=list)
    open_threads: List[str] = Field(default_factory=list)
    job_description: str = ""
    resume_context: str = ""
    interview_field: str = ""
    company_style: str = ""
    interview_mode: str = ""
    domain_pack: str = ""
    strong_advances: int = 0
    intensity_nudge: str = ""


class StartSessionRequest(BaseModel):
    role: str = Field(..., description="Target role for the interview", max_length=200)
    session_id: str = Field(..., description="Unique session identifier", max_length=128)
    target_questions: int = Field(5, ge=1, le=20, description="Total questions for the interview session")
    job_description: str = Field("", max_length=4000)
    resume_context: str = Field("", max_length=3000)
    interview_field: str = Field("", max_length=64)
    company_style: str = Field("", max_length=64)
    interview_mode: str = Field("", max_length=64)
    domain_pack: str = Field("", max_length=64)


class NextQuestionRequest(BaseModel):
    session_id: str = Field(..., description="Session to advance", max_length=128)


class EvaluateAnswerResponse(BaseModel):
    score: AnswerScore
    follow_up: Optional[FollowUp] = None
    next_action: str = Field(..., description="'advance', 'follow_up', 'retry', or 'end'")
    message: str = Field(..., description="Message for the user")


class ResumeParseRequest(BaseModel):
    text: str = Field(..., description="Raw resume text to parse", max_length=80000)


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
    role: Literal["user", "assistant"] = Field(..., description="'user' or 'assistant' only")
    content: str = Field(..., max_length=8000)

    @field_validator("content")
    @classmethod
    def content_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("content must not be empty")
        return v


class InterviewChatRequest(BaseModel):
    messages: List[ChatMessageItem] = Field(..., max_length=80)
    system_prompt: str = Field(..., max_length=12000)


class InterviewAnalyzeCategory(BaseModel):
    category: str
    score: int
    fullMark: int = 100


class InterviewAnalyzeRequest(BaseModel):
    transcription: List[str]
    role: str = Field(..., max_length=200)
    company: str = Field(..., max_length=200)
    job_description: str = Field("", max_length=4000)
    resume_context: str = Field("", max_length=3000)
    interview_field: str = Field("", max_length=64)
    company_style: str = Field("", max_length=64)
    interview_mode: str = Field("", max_length=64)
    domain_pack: str = Field("", max_length=64)


class CategoryExplanation(BaseModel):
    category: str = ""
    why: str = ""
    tip: str = ""
    betterAnswer: str = ""
    excellentAnswer: str = ""
    tips: List[str] = []
    commonMistakes: List[str] = []


class SampleAnswerItem(BaseModel):
    questionTheme: str = ""
    example: str = ""


class InterviewAnalyzeResponse(BaseModel):
    overallScore: int
    categories: List[InterviewAnalyzeCategory]
    feedback: List[str]
    strengths: List[str] = []
    weaknesses: List[str] = []
    categoryExplanations: List[CategoryExplanation] = []
    improvementPlan: List[str] = []
    sampleAnswers: List[SampleAnswerItem] = []


class InterviewClientReportRequest(BaseModel):
    """PDF report payload for chat-based interview sessions stored on the client."""
    session_id: str = Field(..., min_length=1, max_length=128)
    role: str = Field(..., max_length=200)
    company: str = Field(..., max_length=200)
    overall_score: int = Field(..., ge=1, le=100, description="Overall score on 1-100 scale")
    categories: List[InterviewAnalyzeCategory] = []
    feedback: List[str] = []
    date: Optional[str] = None
    strengths: List[str] = []
    weaknesses: List[str] = []
    improvement_plan: List[str] = []


class FeedbackRequest(BaseModel):
    type: Literal["bug", "feature", "rating", "idea"] = "idea"
    message: str = Field(..., min_length=1, max_length=4000)
    rating: Optional[int] = Field(None, ge=1, le=5)
