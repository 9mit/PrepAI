from typing import Literal

from pydantic import BaseModel, Field, field_validator


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


def _default_running_scores() -> dict[str, float]:
    return {"accuracy": 0.0, "depth": 0.0, "clarity": 0.0, "confidence": 0.0}


class SessionState(BaseModel):
    session_id: str
    target_role: str
    target_questions: int = 5
    questions_asked: list[str] = Field(default_factory=list)
    evaluation_results: list[EvaluationRecord] = Field(default_factory=list)
    running_scores: dict[str, float] = Field(default_factory=_default_running_scores)
    follow_ups_used: int = 0
    is_completed: bool = False
    answer_summaries: list[str] = Field(default_factory=list)
    topics_covered: list[str] = Field(default_factory=list)
    claims_made: list[str] = Field(default_factory=list)
    open_threads: list[str] = Field(default_factory=list)
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
    follow_up: FollowUp | None = None
    next_action: str = Field(..., description="'advance', 'follow_up', 'retry', or 'end'")
    message: str = Field(..., description="Message for the user")


class ResumeParseRequest(BaseModel):
    text: str = Field(..., description="Raw resume text to parse", max_length=80000)


class ResumeParseResponse(BaseModel):
    name: str = ""
    email: str = ""
    skills: list[str] = []
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
    messages: list[ChatMessageItem] = Field(..., max_length=80)
    system_prompt: str = Field(..., max_length=12000)


class InterviewAnalyzeCategory(BaseModel):
    category: str
    score: int
    fullMark: int = 100


class InterviewAnalyzeRequest(BaseModel):
    transcription: list[str]
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
    tips: list[str] = []
    commonMistakes: list[str] = []


class SampleAnswerItem(BaseModel):
    questionTheme: str = ""
    example: str = ""


class InterviewAnalyzeResponse(BaseModel):
    overallScore: int
    categories: list[InterviewAnalyzeCategory]
    feedback: list[str]
    strengths: list[str] = []
    weaknesses: list[str] = []
    categoryExplanations: list[CategoryExplanation] = []
    improvementPlan: list[str] = []
    sampleAnswers: list[SampleAnswerItem] = []


class InterviewClientReportRequest(BaseModel):
    """PDF report payload for chat-based interview sessions stored on the client."""
    session_id: str = Field(..., min_length=1, max_length=128)
    role: str = Field(..., max_length=200)
    company: str = Field(..., max_length=200)
    overall_score: int = Field(..., ge=1, le=100, description="Overall score on 1-100 scale")
    categories: list[InterviewAnalyzeCategory] = []
    feedback: list[str] = []
    date: str | None = None
    strengths: list[str] = []
    weaknesses: list[str] = []
    improvement_plan: list[str] = []


class FeedbackRequest(BaseModel):
    type: Literal["bug", "feature", "rating", "idea"] = "idea"
    message: str = Field(..., min_length=1, max_length=4000)
    rating: int | None = Field(None, ge=1, le=5)


class QuizQuestionModel(BaseModel):
    question: str
    options: list[str]
    correctAnswer: int = Field(0, ge=0, le=3)
    explanation: str


class QuizGenerateRequest(BaseModel):
    topic: str = Field(..., min_length=1, max_length=200)
    difficulty: Literal["easy", "medium", "hard"] = "medium"
    domain: str | None = Field("", max_length=100)


class QuizGenerateResponse(BaseModel):
    topic: str
    difficulty: str
    conceptExplanation: str
    syntaxGuide: str
    quizQuestions: list[QuizQuestionModel]

