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

# PrepAI - AI Interview Coach

![PrepAI Developer Edition](https://github.com/user-attachments/assets/595cf098-0ea5-42fc-9943-a63c2486a718)

**Master technical interviews with confidence.**  
*Real-time AI feedback | Daily Coding Challenges | GitHub Integration | High-Quality Neural Voice*

---

## 📖 About The Project

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
- **npm** (comes with Node.js)
- **Git**

### Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/StartVisionAI/PrepAI.git
   cd PrepAI
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Set Up Environment Variables**
   Create a `.env` file in the root directory and add your Groq API key:
   
   ```env
   VITE_GROQ_API_KEY=your_groq_api_key_here
   ```
   
   > **Get your FREE Groq API key**: https://console.groq.com

4. **Run the Development Server**
   ```bash
   npm run dev
   ```

5. **Launch**
   Open your browser and navigate to `http://localhost:5173`

---

## 🏗️ Building for Production

### Build the App
```bash
npm run build
```
This generates optimized static files in the `dist` folder.

### Preview Production Build Locally
```bash
npm run preview
```

### Deploy to Static Hosting

PrepAI is a **static web app** and can be deployed to any static hosting service:

#### **Vercel** (Recommended)
```bash
npm install -g vercel
vercel
```

#### **Netlify**
```bash
# Drag and drop the 'dist' folder to Netlify
# OR use Netlify CLI
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

#### **GitHub Pages**
```bash
npm run build
# Push the 'dist' folder to your gh-pages branch
```

#### **Cloudflare Pages / Firebase Hosting**
Follow their standard static site deployment guides.

### Important: Environment Variables in Production

**⚠️ Don't commit your `.env` file!** 

For deployment platforms, set environment variables in their dashboard:

- **Vercel**: Project Settings → Environment Variables
- **Netlify**: Site Settings → Build & Deploy → Environment
- **GitHub Pages**: Use GitHub Secrets for CI/CD

**Required Variables:**
```env
VITE_GROQ_API_KEY=your_groq_api_key_here
```

---

## 🔧 Advanced Configuration

### Optional: Local AI with Ollama (Development Only)

For development, you can use a local Ollama model instead of Groq to save API costs:

1. **Install Ollama**: https://ollama.com/download
2. **Pull a model**: `ollama pull llama3.2`
3. **Start Ollama**: `ollama serve`
4. **Update `.env`**:
   ```env
   VITE_USE_OLLAMA=true
   VITE_OLLAMA_URL=http://localhost:11434
   VITE_OLLAMA_MODEL=llama3.2
   ```

> **Note**: Ollama only works locally. For production deployments, use Groq (default).

---

## 📁 Project Structure

```
PrepAI/
├── components/       # React components (Sidebar, QuizLab, etc.)
├── pages/           # Main pages (Dashboard, Quiz, InterviewRoom, etc.)
├── services/        # API services (Groq, Piper TTS, Quiz generation)
├── types.ts         # TypeScript type definitions
├── index.css        # Global styles (Developer theme)
├── .env             # Environment variables (not committed)
└── dist/            # Production build output
```

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
