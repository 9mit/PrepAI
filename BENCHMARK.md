# Benchmark Comparison: PrepAI v2 vs. Generic AI Chatbot

This document presents a side-by-side comparison of **PrepAI v2** against a generic AI chatbot (such as Cursor's Claude) on the five core tasks required for an adaptive AI Interview Coach Agent.

| Task | PrepAI v2 | Generic AI Chatbot (Claude/GPT) |
| :--- | :--- | :--- |
| **Task 1: Evaluate a shallow answer** | **Structured JSON Score**. Returns a validated Pydantic JSON object with explicit scores for accuracy, depth, clarity, and confidence (e.g., `{"accuracy": 40, "depth": 20, ...}`). | **Freeform Text**. Returns conversational text with qualitative feedback, difficult to parse programmatically without brittle regex or separate extraction passes. |
| **Task 2: Generate a follow-up** | **Typed Follow-up (Python Logic)**. Deterministically categorizes the follow-up as `probe`, `challenge`, or `hint` based on the exact evaluation score. | **Generic Response**. Guesses whether to ask another question or give a hint based on the LLM's internal weights, lacking deterministic structure. |
| **Task 3: Track session memory** | **Persistent Redis Memory**. Accurately tracks `questions_asked`, running averages of axes scores, and `follow_ups_used` across the entire 1-hour session. | **Context Window Dependency**. Relies purely on appending to the chat history. Struggles to track quantitative metrics like running averages accurately over many turns. |
| **Task 4: Numeric performance score** | **1-to-10,000 Integer**. Returns a mathematically calculated integer using a strict weighted formula `(accuracy*0.35 + depth*0.25 + adaptability*0.20 + speed*0.10 + confidence*0.10) / 100 * 10000`. | **Unavailable / Hallucinated**. Feature is fundamentally unavailable. When asked to score, it invents a subjective number that does not follow a strict multi-axis formula. |
| **Task 5: Downloadable PDF report** | **Generated PDF (ReportLab)**. Creates a concrete, downloadable `.pdf` file with per-question scores, adaptability metrics, and recommended study areas. | **Not Possible**. Chatbots can generate markdown or text summaries, but cannot natively generate and serve binary `.pdf` files without external plugins or wrappers. |

### Conclusion
Generic chatbots operate strictly as text-in/text-out systems. **PrepAI v2** functions as a true agentic loop. By removing the decision-making from the LLM and anchoring it in deterministic Python logic, PrepAI v2 reliably scores, adapts, and tracks candidate performance in ways a prompt-wrapped chatbot cannot achieve.
