---
title: Prepai Advanced Interview Platform
emoji: 🚀
colorFrom: indigo
colorTo: blue
sdk: docker
pinned: false
license: mit
short_description: 'PrepAI is a cutting-edge interview preparation platform'
app_port: 7860
---

# PrepAI — AI Interview Coach

<img width="916" height="922" alt="image" src="https://github.com/user-attachments/assets/dd3647f9-66f2-4961-932e-031a4f63f0cd" />


**Master technical interviews with confidence.**  
*Real-time AI feedback | Daily Coding Challenges | GitHub Integration | High-Quality Neural Voice*

---

## 📖 About The Project

### Problem Specialization Statement

PrepAI v2 specializes in adaptive AI-driven interview coaching because generic chatbots cannot track performance across a session, adapt difficulty in real-time, or produce a quantified score. PrepAI v2 closes this gap with a full agentic loop — evaluate, decide, follow-up, adapt — making it a purpose-built agent rather than a prompt-wrapped chatbot. As someone actively interviewing for AI/ML SDE roles, I built this to solve a problem I face personally, which is why every design decision reflects real user need.

**PrepAI** is a cutting-edge interview preparation platform designed to bridge the gap between candidate potential and interview performance.

**What it does:**
- **Simulates Reality**: Conducts voice-based technical interviews using advanced AI Personas
- **Daily Quiz**: AI-generated topic-based coding challenges with interactive execution
- **Analyzes Identity**: Parses your resume locally and scans your GitHub profile to tailor questions
- **Provides Insights**: Real-time, actionable feedback on your answer quality and communication style

Built with a **developer-first mindset**, featuring a **high-contrast dark theme**, **monospaced typography**, and a **privacy-first local architecture**.

---

## 🚀 Key Features

- **🤖 Open-Source AI**: Powered by **Groq (Llama 3.3)** for intelligent, fast, and free AI interactions
- **🗣️ High-Quality Neural Voice**: Uses **Piper TTS (WASM)** for local, privacy-first speech synthesis
- **📄 Privacy-First**: Resume parsing and voice generation happen locally or via secure open-source APIs
- **🧩 Daily Quiz**: Interactive coding challenges with browser-based execution and interview questions
- **🐙 GitHub Integration**: Analyzes your repositories directly in the sidebar
- **💎 Developer UI/UX**: High-contrast dark theme with neon accents and terminal aesthetics
- **📊 Detailed Analytics**: Visualizes your skill growth with Radar charts and session tracking

---

## 🛠️ Getting Started

### Prerequisites
- **Node.js** (v18 or higher)
- **Python** (3.11 or higher)
- **Docker** + **Docker Compose** (recommended)
- **Git**

### Environment Variables

Copy `.env.example` to `.env` and fill in your keys:

```bash
cp .env.example .env
```

| Variable | Description | Required |
|:---|:---|:---:|
| `GROQ_API_KEY` | Groq LLM API key ([get free key](https://console.groq.com)) | ✅ |
| `REDIS_URL` | Redis connection string for session memory | ✅ |
| `HUGGINGFACE_API_KEY` | HuggingFace Inference API key (for Whisper STT) | For voice |
| `FRONTEND_URL` | Allowed CORS origin for the frontend | Production |
| `VITE_API_URL` | Backend URL the frontend calls | ✅ |

> ⚠️ **Security**: Never commit `.env` with real values. The Groq API key is loaded **server-side only** via `python-dotenv`. The frontend bundle contains no API keys.

### Option A: Docker (Recommended)

```bash
git clone https://github.com/StartVisionAI/PrepAI.git
cd PrepAI
cp .env.example .env
# Edit .env with your API keys
docker-compose up --build
```

Frontend at `http://localhost:7860`, Backend at `http://localhost:8000`.

### Option B: Manual Setup

**Backend:**
```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate
# macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
cp ../.env.example ../.env
# Edit ../.env with your API keys
uvicorn main:app --reload --port 8000
```

**Frontend (separate terminal):**
```bash
# From project root
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 📐 Performance Metrics & Scoring Formula

PrepAI calculates a **1-to-10,000 integer score** using a weighted five-axis formula:

```
Score = (accuracy × 0.35 + depth × 0.25 + adaptability × 0.20 + speed × 0.10 + confidence × 0.10) / 100 × 10,000
```

The result is clamped to `[1, 10000]` and returned as an integer.

| Axis | Weight | Source |
|:---|:---:|:---|
| **Accuracy** | 0.35 | Factual correctness scored by the Groq LLM rubric (0–100) |
| **Depth** | 0.25 | Technical depth and detail scored by the Groq LLM rubric (0–100) |
| **Adaptability** | 0.20 | Inverse of follow-up count: `100 - (follow_ups × 20)` — fewer follow-ups = higher score |
| **Speed** | 0.10 | Response latency normalized against a 30-second baseline |
| **Confidence** | 0.10 | `100 - (filler_word_ratio × 100)` — derived from transcript analysis |

---

## 📊 Benchmark Comparison: PrepAI v2 vs. Generic AI Chatbot

Five identical tasks were run on both PrepAI v2 and a general-purpose AI assistant (such as Cursor's Claude), with outputs compared side by side to demonstrate where a specialized agent outperforms a general model.

| Task | PrepAI v2 | Generic AI Chatbot (Claude/GPT) |
| :--- | :--- | :--- |
| **Task 1: Evaluate a shallow answer** | **Structured JSON Score**. Returns a validated Pydantic JSON object with explicit scores for accuracy, depth, clarity, and confidence (e.g., `{"accuracy": 40, "depth": 20, ...}`). | **Freeform Text**. Returns conversational text with qualitative feedback, difficult to parse programmatically without brittle regex or separate extraction passes. |
| **Task 2: Generate a follow-up** | **Typed Follow-up (Python Logic)**. Deterministically categorizes the follow-up as `probe`, `challenge`, or `hint` based on the exact evaluation score. | **Generic Response**. Guesses whether to ask another question or give a hint based on the LLM's internal weights, lacking deterministic structure. |
| **Task 3: Track session memory** | **Persistent Redis Memory**. Accurately tracks `questions_asked`, running averages of axes scores, and `follow_ups_used` across the entire 1-hour session. | **Context Window Dependency**. Relies purely on appending to the chat history. Struggles to track quantitative metrics like running averages accurately over many turns. |
| **Task 4: Numeric performance score** | **1-to-10,000 Integer**. Returns a mathematically calculated integer using a strict weighted formula `(accuracy*0.35 + depth*0.25 + adaptability*0.20 + speed*0.10 + confidence*0.10) / 100 * 10000`. | **Unavailable / Hallucinated**. Feature is fundamentally unavailable. When asked to score, it invents a subjective number that does not follow a strict multi-axis formula. |
| **Task 5: Downloadable PDF report** | **Generated PDF (ReportLab)**. Creates a concrete, downloadable `.pdf` file with per-question scores, adaptability metrics, and recommended study areas. | **Not Possible**. Chatbots can generate markdown or text summaries, but cannot natively generate and serve binary `.pdf` files without external plugins or wrappers. |

### Conclusion
Generic chatbots operate strictly as text-in/text-out systems. **PrepAI v2** functions as a true agentic loop. By removing the decision-making from the LLM and anchoring it in deterministic Python logic, PrepAI v2 reliably scores, adapts, and tracks candidate performance in ways a prompt-wrapped chatbot cannot achieve.

---

## 💡 Usage Examples

### API Examples

**Start a session:**
```bash
curl -X POST http://localhost:8000/session/start \
  -H "Content-Type: application/json" \
  -d '{"role": "Senior Software Engineer", "session_id": "test-001"}'
```

**Evaluate an answer (with audio):**
```bash
curl -X POST http://localhost:8000/session/evaluate \
  -F "session_id=test-001" \
  -F "question_text=Explain the difference between TCP and UDP" \
  -F "latency_seconds=22.5" \
  -F "filler_ratio=0.05" \
  -F "audio_file=@recording.webm"
```

**Evaluate an answer (text only):**
```bash
curl -X POST http://localhost:8000/session/evaluate \
  -F "session_id=test-001" \
  -F "question_text=Explain the difference between TCP and UDP" \
  -F "text_answer=TCP is connection-oriented and guarantees delivery..."
```

### Workflow

1. **Start a session** by providing your target role — the agent generates the first question.
2. **Speak or type your answer** — the agent evaluates it and decides: advance (score ≥ 80), probe deeper (50–79), or give a hint and retry (< 50).
3. **Receive your report** — after all questions, download a PDF with your 1-to-10,000 score, per-axis breakdowns, and recommended study areas.

---

## 📁 Project Structure

```
PrepAI/
├── backend/          # FastAPI backend (agent loop, evaluator, memory)
│   ├── main.py       # Routes + agent decision logic
│   ├── models.py     # Pydantic models for all request/response schemas
│   └── services/     # Evaluator, follow-up, planner, report, transcriber
├── components/       # React components (Sidebar, QuizLab, etc.)
├── pages/            # Main pages (Dashboard, Quiz, InterviewRoom, etc.)
├── hooks/            # Custom React hooks (useInterview, etc.)
├── services/         # Frontend API proxy services (groq, piper, github)
├── types.ts          # TypeScript type definitions
├── index.css         # Global styles (Developer theme)
├── .env.example      # Environment variable template
└── docker-compose.yml
```

---

## 🔐 Security Notes

- **No API keys in the frontend bundle.** All LLM calls (Groq) route through the FastAPI backend. The `GROQ_API_KEY` is loaded server-side via `python-dotenv` and never exposed to the browser.
- **`.env` is gitignored.** The repository ships `.env.example` with placeholder values only.
- **Session data expires.** Redis keys are set with a 1-hour TTL via `setex`.
- **Audio is processed in-memory.** Voice recordings are transcribed via the HuggingFace Whisper API without being written to persistent disk.

---

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

---

## 📄 License

This project is licensed under the MIT License.

---

## 🙏 Acknowledgments

- **Groq** for blazing-fast open-source LLM inference
- **Piper TTS** for high-quality local speech synthesis
- **Vite + React** for lightning-fast development experience
