import io
import asyncio
import logging
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from models import SessionState, InterviewClientReportRequest

logger = logging.getLogger(__name__)


def compute_final_score(session_state: SessionState, avg_latency: float, avg_filler_ratio: float) -> int:
    """
    Official formula:
    (accuracy*0.35 + depth*0.25 + adaptability*0.20 + speed*0.10 + confidence*0.10) / 100 * 10000
    clamped to [1, 10000].
    """
    n_evals = len(session_state.evaluation_results) if session_state.evaluation_results else 1
    avg_accuracy = session_state.running_scores["accuracy"] / n_evals
    avg_depth = session_state.running_scores["depth"] / n_evals
    adaptability = max(0.0, 100.0 - (session_state.follow_ups_used * 20.0))
    speed = 100.0 if avg_latency <= 30.0 else max(0.0, 100.0 - (avg_latency - 30.0) * 2)
    confidence = max(0.0, 100.0 - (avg_filler_ratio * 100.0))

    score_raw = (
        avg_accuracy * 0.35
        + avg_depth * 0.25
        + adaptability * 0.20
        + speed * 0.10
        + confidence * 0.10
    ) / 100.0 * 10000.0

    return int(max(1, min(10000, score_raw)))


def scale_overall_to_10000(overall_score_100: int) -> int:
    """Map a 1-100 overall score onto the 1-10000 display scale (linear)."""
    return int(max(1, min(10000, round(overall_score_100 * 100))))


def _weak_topics_from_categories(categories: list) -> list[str]:
    weak = []
    for cat in categories:
        name = getattr(cat, "category", None) or (cat.get("category") if isinstance(cat, dict) else None)
        score = getattr(cat, "score", None) if not isinstance(cat, dict) else cat.get("score")
        if name is not None and score is not None and score < 70:
            weak.append(str(name))
    return weak[:5] if weak else ["Review core concepts in depth", "Practice concise structured answers"]


def _draw_pdf(
    title: str,
    lines: list[tuple[str, int]],
    study_areas: list[str],
) -> bytes:
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    y = 750
    c.setFont("Helvetica-Bold", 14)
    c.drawString(72, y, title[:90])
    y -= 28
    c.setFont("Helvetica", 11)
    for text, gap in lines:
        if y < 80:
            c.showPage()
            y = 750
            c.setFont("Helvetica", 11)
        c.drawString(72, y, text[:100])
        y -= gap
    y -= 10
    c.setFont("Helvetica-Bold", 12)
    c.drawString(72, y, "Recommended Study Areas:")
    y -= 20
    c.setFont("Helvetica", 11)
    for area in study_areas:
        if y < 80:
            c.showPage()
            y = 750
            c.setFont("Helvetica", 11)
        c.drawString(90, y, f"- {area[:90]}")
        y -= 18
    c.save()
    buffer.seek(0)
    return buffer.read()


def _generate_report_sync(session_state: SessionState, avg_latency: float, avg_filler_ratio: float) -> bytes:
    n_evals = len(session_state.evaluation_results) if session_state.evaluation_results else 1
    avg_accuracy = session_state.running_scores["accuracy"] / n_evals
    avg_depth = session_state.running_scores["depth"] / n_evals
    adaptability = max(0.0, 100.0 - (session_state.follow_ups_used * 20.0))
    speed = 100.0 if avg_latency <= 30.0 else max(0.0, 100.0 - (avg_latency - 30.0) * 2)
    confidence = max(0.0, 100.0 - (avg_filler_ratio * 100.0))
    final_score = compute_final_score(session_state, avg_latency, avg_filler_ratio)

    weak = []
    for record in session_state.evaluation_results:
        if record.score.accuracy < 70 or record.score.depth < 70:
            weak.append(record.question[:60])
    if not weak:
        weak = [
            "Review core concepts in depth",
            "Practice concise answering (reduce follow-ups)",
            "Improve response speed",
        ]

    lines = [
        (f"Session ID: {session_state.session_id}", 20),
        (f"Role: {session_state.target_role}", 20),
        (f"FINAL SCORE (1-10000): {final_score}", 28),
        (f"Accuracy (avg): {avg_accuracy:.1f}/100", 18),
        (f"Depth (avg): {avg_depth:.1f}/100", 18),
        (f"Adaptability: {adaptability:.1f}/100 ({session_state.follow_ups_used} follow-ups)", 18),
        (f"Speed: {speed:.1f}/100 (avg latency {avg_latency:.1f}s)", 18),
        (f"Confidence: {confidence:.1f}/100 (filler ratio {avg_filler_ratio:.2f})", 18),
    ]
    try:
        return _draw_pdf(f"PrepAI Interview Report: {session_state.target_role}", lines, weak[:5])
    except Exception as e:
        logger.error(f"Error generating PDF: {e}")
        return b""


def _generate_client_report_sync(payload: InterviewClientReportRequest) -> bytes:
    scaled = scale_overall_to_10000(payload.overall_score)
    lines = [
        (f"Session ID: {payload.session_id}", 20),
        (f"Role: {payload.role} @ {payload.company}", 20),
        (f"Date: {payload.date or 'N/A'}", 20),
        (f"Overall (1-100): {payload.overall_score}", 20),
        (f"FINAL SCORE (1-10000): {scaled}", 28),
    ]
    for cat in payload.categories:
        lines.append((f"{cat.category}: {cat.score}/{cat.fullMark}", 16))
    if payload.feedback:
        lines.append(("", 10))
        lines.append(("Feedback:", 18))
        for fb in payload.feedback[:8]:
            lines.append((f"* {fb[:95]}", 16))
    study = _weak_topics_from_categories(payload.categories)
    try:
        return _draw_pdf(f"PrepAI Interview Report: {payload.role}", lines, study)
    except Exception as e:
        logger.error(f"Error generating client PDF: {e}")
        return b""


async def generate_report_bytes(session_state: SessionState, avg_latency: float, avg_filler_ratio: float) -> bytes:
    return await asyncio.to_thread(_generate_report_sync, session_state, avg_latency, avg_filler_ratio)


async def generate_client_report_bytes(payload: InterviewClientReportRequest) -> bytes:
    return await asyncio.to_thread(_generate_client_report_sync, payload)
