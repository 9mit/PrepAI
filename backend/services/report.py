import os
import asyncio
import logging
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from models import SessionState

logger = logging.getLogger(__name__)

async def generate_report(session_state: SessionState, avg_latency: float, avg_filler_ratio: float) -> str:
    """Async wrapper — offloads blocking PDF generation to a thread."""
    return await asyncio.to_thread(_generate_report_sync, session_state, avg_latency, avg_filler_ratio)

def _generate_report_sync(session_state: SessionState, avg_latency: float, avg_filler_ratio: float) -> str:
    """
    Calculates final score and generates a PDF report.
    Returns the path to the PDF file.
    """
    # Calculate averages
    n_evals = len(session_state.evaluation_results) if session_state.evaluation_results else 1
    avg_accuracy = session_state.running_scores["accuracy"] / n_evals
    avg_depth = session_state.running_scores["depth"] / n_evals
    
    # The instructions for the score formula say:
    # Adaptability is the inverse of how many follow-ups were needed — fewer follow-ups means higher adaptability.
    adaptability = max(0.0, 100.0 - (session_state.follow_ups_used * 20.0))
    
    # Speed is response latency normalized against a 30-second baseline.
    # If latency is 30s, speed is decent. Let's make < 30s perfect.
    speed = 100.0 if avg_latency <= 30.0 else max(0.0, 100.0 - (avg_latency - 30.0) * 2)
    
    # Confidence is 100 minus the filler word ratio multiplied by 100.
    confidence = max(0.0, 100.0 - (avg_filler_ratio * 100.0))
    
    # Formula: Score = (accuracy*0.35 + depth*0.25 + adaptability*0.20 + speed*0.10 + confidence*0.10) / 100 * 10000
    score_raw = (
        avg_accuracy * 0.35 +
        avg_depth * 0.25 +
        adaptability * 0.20 +
        speed * 0.10 +
        confidence * 0.10
    ) / 100.0 * 10000.0
    
    final_score = int(max(1, min(10000, score_raw)))
    
    # Generate PDF
    # Since we shouldn't save to disk generally (audio never to disk), we can save PDF to a temp dir
    # But for ReportLab it's easier to write to a temp file and return the path, or return bytes.
    # We will write to a temp file in /tmp or local dir.
    os.makedirs("/tmp/prepai", exist_ok=True)
    pdf_path = f"/tmp/prepai/report_{session_state.session_id}.pdf"
    
    try:
        c = canvas.Canvas(pdf_path, pagesize=letter)
        c.drawString(100, 750, f"PrepAI Interview Report: {session_state.target_role}")
        c.drawString(100, 730, f"Session ID: {session_state.session_id}")
        c.drawString(100, 700, f"FINAL SCORE (1-10000): {final_score}")
        
        c.drawString(100, 670, f"Accuracy (avg): {avg_accuracy:.1f}/100")
        c.drawString(100, 650, f"Depth (avg): {avg_depth:.1f}/100")
        c.drawString(100, 630, f"Adaptability: {adaptability:.1f}/100 ({session_state.follow_ups_used} follow-ups)")
        c.drawString(100, 610, f"Speed: {speed:.1f}/100 (avg latency {avg_latency:.1f}s)")
        c.drawString(100, 590, f"Confidence: {confidence:.1f}/100 (filler ratio {avg_filler_ratio:.2f})")
        
        c.drawString(100, 550, "Recommended Study Areas:")
        c.drawString(120, 530, "- Review core concepts in depth")
        c.drawString(120, 510, "- Practice concise answering (reduce follow-ups)")
        c.drawString(120, 490, "- Improve response speed")
        
        c.save()
        return pdf_path
    except Exception as e:
        logger.error(f"Error generating PDF: {e}")
        return ""
