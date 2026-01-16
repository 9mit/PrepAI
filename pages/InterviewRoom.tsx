
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { UserProfile, InterviewResult } from '../types';
import { streamChatWithInterviewer, analyzeInterview, ChatMessage } from '../services/groq';
import { initPiper, speakWithPiper } from '../services/piper';

interface InterviewRoomProps {
  user: UserProfile;
  onFinish: () => void;
}

const AVATAR_STYLES = [
  {
    id: 'robot',
    label: 'Tech Bot',
    icon: 'fa-robot',
    description: 'A highly analytical neural architect, specializing in code precision, architectural patterns, and systematic problem-solving.'
  },
  {
    id: 'professional',
    label: 'Executive',
    icon: 'fa-user-tie',
    description: 'A direct and authoritative industry leader, focused on high-level strategy, cultural alignment, and measurable business impact.'
  },
  {
    id: 'brain',
    label: 'Neural Core',
    icon: 'fa-brain',
    description: 'An insightful pattern-recognition intelligence that probes the depths of soft skills, adaptability, and cognitive flexibility.'
  },
];

const AVATAR_COLORS = [
  { id: 'emerald', label: 'Emerald', hex: '#10B981', bg: 'bg-emerald-500', shadow: '0 0 20px rgba(16, 185, 129, 0.4)', glow: 'rgba(16,185,129,0.8)' },
  { id: 'cyan', label: 'Cyan', hex: '#06B6D4', bg: 'bg-cyan-500', shadow: '0 0 20px rgba(6, 182, 212, 0.4)', glow: 'rgba(6,182,212,0.8)' },
  { id: 'orange', label: 'Orange', hex: '#F97316', bg: 'bg-orange-500', shadow: '0 0 20px rgba(249, 115, 22, 0.4)', glow: 'rgba(249,115,22,0.8)' },
  { id: 'violet', label: 'Violet', hex: '#8B5CF6', bg: 'bg-violet-500', shadow: '0 0 20px rgba(139, 92, 246, 0.4)', glow: 'rgba(139,92,246,0.8)' },
];

const InterviewRoom: React.FC<InterviewRoomProps> = ({ user, onFinish }) => {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcription, setTranscription] = useState<{ sender: 'AI' | 'You', text: string }[]>([]);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const [cameraEnabled, setCameraEnabled] = useState(true);

  // Piper TTS states
  const [piperLoading, setPiperLoading] = useState(true);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [usePiper, setUsePiper] = useState(false);

  const [role, setRole] = useState(localStorage.getItem('last_target_role') || 'Senior Software Engineer');
  const [company, setCompany] = useState(localStorage.getItem('last_target_company') || 'Google');

  const [selectedStyle, setSelectedStyle] = useState(AVATAR_STYLES[0]);
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const recognitionRef = useRef<any>(null);
  const conversationRef = useRef<ChatMessage[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const isSpeakingRef = useRef(false);

  useEffect(() => {
    localStorage.setItem('last_target_role', role);
    localStorage.setItem('last_target_company', company);
    synthRef.current = window.speechSynthesis;

    // Initialize Piper TTS
    const loadPiper = async () => {
      try {
        await initPiper({
          onDownloadProgress: (percent) => setDownloadProgress(percent),
          onInit: () => {
            setUsePiper(true);
            setPiperLoading(false);
            console.log("Piper TTS ready");
          },
          onError: (err) => {
            console.error("Piper init failed, falling back to browser TTS", err);
            setUsePiper(false);
            setPiperLoading(false);
          }
        });
      } catch (e) {
        setUsePiper(false);
        setPiperLoading(false);
      }
    };
    loadPiper();
  }, []);

  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcription]);

  // Robust Text-to-Speech Queue with Fallback
  const speakText = useCallback((text: string) => {
    return new Promise<void>(async (resolve, reject) => {
      const cleanText = text.replace(/[*#]/g, '').trim();
      if (!cleanText) return resolve();

      setIsSpeaking(true);
      isSpeakingRef.current = true;

      // Priority 1: High Quality Piper TTS
      if (usePiper) {
        try {
          await speakWithPiper(cleanText,
            () => { }, // onStart handled by wrapper or below
            () => {   // onEnd
              setIsSpeaking(false);
              isSpeakingRef.current = false;
              resolve();
            }
          );
          return;
        } catch (e) {
          console.warn("Piper failed, falling back to browser TTS", e);
          // Fallthrough to browser TTS
        }
      }

      // Priority 2: Browser Native TTS
      if (!synthRef.current) {
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        return resolve();
      }

      const utterance = new SpeechSynthesisUtterance(cleanText);
      const voices = synthRef.current.getVoices();
      const preferredVoice = voices.find(v => v.name === 'Google US English') ||
        voices.find(v => v.name.includes('Google') && v.lang.startsWith('en')) ||
        voices.find(v => v.name.includes('Zira')) ||
        voices.find(v => v.lang.startsWith('en'));

      if (preferredVoice) utterance.voice = preferredVoice;
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.onend = () => {
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        resolve();
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        resolve();
      };

      synthRef.current.speak(utterance);
    });
  }, [usePiper]);

  const processUserInput = useCallback(async (userText: string) => {
    if (!userText.trim()) return;

    setTranscription(prev => [...prev, { sender: 'You', text: userText }]);
    conversationRef.current.push({ role: 'user', content: userText });

    setIsProcessing(true);

    try {
      // Count current questions asked
      const questionCount = conversationRef.current.filter(m => m.role === 'assistant').length;
      const totalQuestions = 5;

      const systemPrompt = `You are a professional ${selectedStyle.label} interviewer from ${company} conducting a ${role} interview.

Your Mission:
- You MUST ask exactly ${totalQuestions} technical/behavioral questions total.
- Currently on question ${questionCount + 1}/${totalQuestions}.
- Keep your responses BRIEF (1-2 sentences) + ask your next question.
- Be conversational and encouraging.
- Build on previous answers naturally.
- ${questionCount < totalQuestions - 1 ? 'Ask your next question immediately after acknowledging their answer.' : 'This is your FINAL question. After their response, wrap up gracefully.'}
- Do NOT say "goodbye" or "thank you for your time" until you've asked all ${totalQuestions} questions.
- Maintain smooth conversation flow without long pauses.`;

      const stream = streamChatWithInterviewer(conversationRef.current, systemPrompt);

      let fullResponse = '';
      let currentSentence = '';

      setTranscription(prev => [...prev, { sender: 'AI', text: '' }]);

      for await (const chunk of stream) {
        setIsProcessing(false);
        fullResponse += chunk;
        currentSentence += chunk;

        setTranscription(prev => {
          const newArr = [...prev];
          const last = newArr[newArr.length - 1];
          if (last.sender === 'AI') {
            last.text = fullResponse;
          }
          return newArr;
        });

        // Basic sentence boundary detection
        if (/[.!?]/.test(chunk) || (currentSentence.length > 50 && /[,;]/.test(chunk))) {
          await speakText(currentSentence);
          currentSentence = '';
        }
      }

      if (currentSentence.trim()) {
        await speakText(currentSentence);
      }

      conversationRef.current.push({ role: 'assistant', content: fullResponse });

      if (recognitionRef.current && isActive) {
        try { recognitionRef.current.start(); } catch { }
      }

    } catch (error) {
      console.error('Error in streaming:', error);
      setIsProcessing(false);
      speakText("I'm sorry, I missed that. Could you repeat?");
    }
  }, [company, role, selectedStyle, isActive, speakText]);

  const startInterview = async () => {
    setIsConnecting(true);
    setTranscription([]);
    conversationRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: cameraEnabled });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        throw new Error('Please use Chrome or Edge for voice features.');
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      let finalTranscript = '';
      let silenceTimer: any = null;

      recognition.onresult = (event: any) => {
        if (isSpeakingRef.current) return;

        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        // Only auto-submit if silence is detected for a SIGNIFICANT time (3.5s)
        // enabling users to pause and think
        clearTimeout(silenceTimer);

        if (finalTranscript.length > 0 || interimTranscript.length > 0) {
          silenceTimer = setTimeout(() => {
            const fullText = (finalTranscript + interimTranscript).trim();
            // Only submit if we have meaningful content (> 5 chars)
            if (fullText.length > 5 && !isSpeakingRef.current) {
              recognition.stop();
              processUserInput(fullText);
            }
          }, 3500); // Increased from 1500ms to 3500ms
        }
      };

      recognition.onend = () => setIsListening(false);
      recognition.onstart = () => setIsListening(true);
      recognitionRef.current = recognition;

      setIsActive(true);
      setIsConnecting(false);

      const intro = `Hello ${user.name.split(' ')[0]}. I'm your ${selectedStyle.label} interviewer from ${company}. I'll be asking you about 5 questions for the ${role} position. Let's start: Tell me about a challenging technical project you've worked on recently.`;
      setTranscription([{ sender: 'AI', text: intro }]);
      conversationRef.current.push({ role: 'assistant', content: intro });

      await speakText(intro);
      recognition.start();

    } catch (err: any) {
      console.error(err);
      setIsConnecting(false);
      alert(err.message || "Microphone access required.");
    }
  };

  const endInterview = async () => {
    if (recognitionRef.current) recognitionRef.current.stop();
    if (synthRef.current) synthRef.current.cancel();
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());

    setIsActive(false);

    if (transcription.length < 2) {
      onFinish();
      return;
    }

    setIsAnalyzing(true);
    try {
      const transcriptStrings = transcription.map(t =>
        `${t.sender === 'AI' ? 'Interviewer' : 'Candidate'}: ${t.text}`
      );
      const analysis = await analyzeInterview(transcriptStrings, role, company);
      const result: InterviewResult = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        role,
        company,
        overallScore: analysis.overallScore,
        categories: analysis.categories,
        feedback: analysis.feedback,
        transcription: transcriptStrings
      };
      const existingHistory = JSON.parse(localStorage.getItem('interview_history') || '[]');
      localStorage.setItem('interview_history', JSON.stringify([result, ...existingHistory]));
      onFinish();
    } catch (error) {
      console.error(error);
      onFinish();
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-deep)]">
      <style>{`
        @keyframes subtlePulse {
          0% { transform: scale(1); box-shadow: 0 0 20px -5px var(--glow-color); }
          50% { transform: scale(1.02); box-shadow: 0 0 50px 0px var(--glow-color); }
          100% { transform: scale(1); box-shadow: 0 0 20px -5px var(--glow-color); }
        }
        .avatar-glow {
          --glow-color: ${selectedColor.glow};
          animation: subtlePulse 3s ease-in-out infinite;
        }
        .speaking-ring {
          animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        .terminal-text {
            font-family: var(--font-mono);
            letter-spacing: -0.01em;
        }
      `}</style>

      {/* Setup Screen */}
      {!isActive && !isConnecting && !isAnalyzing ? (
        <div className="flex-1 flex items-center justify-center p-6 animate-fadeIn">
          <div className="max-w-4xl w-full p-8 md:p-12 rounded-lg glass-panel relative border border-[var(--glass-border)] shadow-2xl">
            {/* Model Download Indicator */}
            {piperLoading && (
              <div className="absolute inset-0 bg-[rgba(0,0,0,0.95)] z-20 rounded-lg flex flex-col items-center justify-center p-8 backdrop-blur-md">
                <div className="w-12 h-12 border-2 border-t-[var(--neon-emerald)] border-[rgba(255,255,255,0.1)] animate-spin mb-6"></div>
                <h3 className="text-sm font-mono uppercase tracking-[0.3em] text-white mb-2">System.Init(Neural_Voice)</h3>
                <p className="text-[var(--text-secondary)] font-mono text-[10px] mb-6 text-center max-w-sm">Fetching high-fidelity neural dependencies (~50MB)...</p>
                <div className="w-64 h-1 bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--neon-emerald)] transition-all duration-300" style={{ width: `${downloadProgress}%` }}></div>
                </div>
                <p className="font-mono text-[10px] text-[var(--neon-emerald)] mt-2">{downloadProgress}%</p>
              </div>
            )}

            <div className="flex items-center gap-6 mb-12 pb-8 border-b border-[rgba(255,255,255,0.05)]">
              <div className="w-16 h-16 rounded-sm flex items-center justify-center transition-all duration-500 shadow-2xl border" style={{ borderColor: selectedColor.hex, background: `${selectedColor.hex}10` }}>
                <i className="fa-solid fa-terminal text-2xl" style={{ color: selectedColor.hex }}></i>
              </div>
              <div>
                <h2 className="text-4xl font-black uppercase tracking-tighter text-white font-mono">Session_Config</h2>
                <div className="flex items-center gap-3 mt-1">
                  <p className="text-xs font-mono text-[var(--text-secondary)] uppercase tracking-widest">Target: {company}.env</p>
                  {usePiper &&
                    <span className="status-badge bg-[var(--neon-emerald)]/10 text-[var(--neon-emerald)] border border-[var(--neon-emerald)]/30">Neural_Bridge_Active</span>
                  }
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
              <div className="space-y-8">
                <div>
                  <label className="label-premium">Position_Title</label>
                  <input className="input-premium" value={role} onChange={e => setRole(e.target.value)} />
                </div>
                <div>
                  <label className="label-premium">Organization</label>
                  <input className="input-premium" value={company} onChange={e => setCompany(e.target.value)} />
                </div>
              </div>

              <div className="space-y-8">
                <div>
                  <label className="label-premium">AI_Persona_Protocol</label>
                  <div className="grid grid-cols-3 gap-4">
                    {AVATAR_STYLES.map(style => (
                      <button
                        key={style.id}
                        onClick={() => setSelectedStyle(style)}
                        className={`p-4 rounded-md transition-all duration-200 flex flex-col items-center justify-center gap-2 border ${selectedStyle.id === style.id ? 'bg-[var(--bg-accent)]' : 'bg-transparent'}`}
                        style={{
                          borderColor: selectedStyle.id === style.id ? selectedColor.hex : 'rgba(255,255,255,0.05)',
                          color: selectedStyle.id === style.id ? selectedColor.hex : 'var(--text-secondary)'
                        }}
                      >
                        <i className={`fa-solid ${style.icon} text-xl`}></i>
                        <span className="font-mono text-[9px] uppercase font-bold tracking-tighter">{style.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="label-premium">Visual_System_Theme</label>
                  <div className="flex items-center justify-center gap-6 p-4 rounded-md bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]">
                    {AVATAR_COLORS.map(color => (
                      <button
                        key={color.id}
                        onClick={() => setSelectedColor(color)}
                        className={`w-6 h-6 rounded-full transition-all duration-300 border-2 ${selectedColor.id === color.id ? 'border-white scale-125' : 'border-transparent'}`}
                        style={{ background: color.hex, boxShadow: selectedColor.id === color.id ? color.shadow : 'none' }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={startInterview}
              disabled={piperLoading}
              className="btn-primary w-full py-6 text-lg tracking-[0.2em]"
              style={{ background: selectedColor.hex, color: '#000' }}
            >
              Execute_Interview();
            </button>
          </div>
        </div>
      ) : isActive ? (
        <div className="flex-1 flex flex-col p-4 md:p-10 overflow-hidden animate-fadeIn">
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 relative overflow-hidden">
            <div className="lg:col-span-8 flex flex-col gap-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1">
                {/* Candidate Video */}
                <div className="relative rounded-lg overflow-hidden min-h-[400px] bg-black border border-[rgba(255,255,255,0.05)]">
                  {cameraEnabled ? (
                    <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover grayscale brightness-75 contrasts-125" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
                      <i className="fa-solid fa-video-slash text-5xl"></i>
                    </div>
                  )}
                  <div className="absolute top-6 left-6 px-3 py-1 bg-black/80 border border-[rgba(255,255,255,0.1)] font-mono text-[9px] uppercase tracking-widest text-white flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                    User_Live
                  </div>
                </div>

                {/* AI Avatar */}
                <div className="relative rounded-lg overflow-hidden flex flex-col min-h-[400px] bg-black border border-[rgba(255,255,255,0.05)]">
                  <div className="flex-1 flex items-center justify-center relative bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.02)_0%,transparent_100%)]">
                    {isSpeaking && (
                      <div className="absolute w-64 h-64 rounded-full speaking-ring opacity-10" style={{ background: selectedColor.hex }}></div>
                    )}
                    <div className={`w-40 h-40 rounded-sm flex items-center justify-center transition-all duration-300 avatar-glow ${isSpeaking ? 'scale-105' : ''}`} style={{ border: `1px solid ${selectedColor.hex}40`, background: `${selectedColor.hex}05` }}>
                      <i className={`fa-solid ${selectedStyle.icon} text-6xl`} style={{ color: selectedColor.hex }}></i>
                    </div>
                  </div>
                  <div className="absolute top-6 right-6 px-3 py-1 bg-black/80 border border-[rgba(255,255,255,0.1)] font-mono text-[9px] uppercase tracking-widest flex items-center gap-2" style={{ color: selectedColor.hex }}>
                    <i className="fa-solid fa-microchip"></i>
                    {selectedStyle.label}_Protocol
                  </div>
                </div>
              </div>

              {/* Status Bar */}
              <div className="p-6 rounded-lg flex items-center justify-between glass-panel border border-[rgba(255,255,255,0.05)]">
                <div className="flex gap-8">
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-[8px] uppercase tracking-widest text-[var(--text-muted)]">Core_Status</span>
                    <span className={`font-mono text-xs uppercase tracking-[0.2em] ${isListening ? 'text-[var(--neon-emerald)]' : isSpeaking ? 'text-[var(--neon-cyan)]' : 'text-white'}`}>
                      {isListening ? '>> Listening' : isSpeaking ? '>> Speaking' : isProcessing ? '>> Thinking' : '>> Standing_By'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-[8px] uppercase tracking-widest text-[var(--text-muted)]">Latency_MS</span>
                    <span className="font-mono text-xs text-white">12.4ms</span>
                  </div>
                </div>
                <button onClick={endInterview} className="btn-secondary border-red-500/50 text-red-500 hover:bg-red-500/10 px-10">Abort_Session</button>
              </div>
            </div>

            {/* Transcript Panel - Terminal Style */}
            <div className="lg:col-span-4 flex flex-col rounded-lg overflow-hidden glass-panel border border-[rgba(255,255,255,0.05)]">
              <div className="p-4 bg-[rgba(255,255,255,0.02)] border-b border-[rgba(255,255,255,0.05)] flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase font-bold tracking-[0.4em] text-white">Output_Stream</span>
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[var(--bg-accent)]"></div>
                  <div className="w-2 h-2 rounded-full bg-[var(--bg-accent)]"></div>
                  <div className="w-2 h-2 rounded-full bg-[var(--neon-emerald)] animate-pulse"></div>
                </div>
              </div>

              <div className="flex-1 p-6 overflow-y-auto space-y-6 scroll-smooth scrollbar-hide bg-[rgba(0,0,0,0.5)]">
                {transcription.map((item, i) => (
                  <div key={i} className="flex flex-col gap-2 font-mono">
                    <span className="text-[9px] uppercase tracking-[0.3em] flex items-center gap-2" style={{ color: item.sender === 'AI' ? selectedColor.hex : 'var(--neon-emerald)' }}>
                      {item.sender === 'AI' ? `> ${selectedStyle.label}` : '> User_Node'}
                    </span>
                    <div className="text-[13px] leading-relaxed terminal-text pl-4 border-l border-[rgba(255,255,255,0.05)]" style={{ color: item.sender === 'AI' ? '#E2E8F0' : '#CBD5E1' }}>
                      {item.text}
                      {item.sender === 'AI' && i === transcription.length - 1 && isProcessing && (
                        <span className="w-2 h-4 bg-[var(--neon-cyan)] inline-block ml-1 animate-pulse"></span>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={transcriptEndRef} />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/90 backdrop-blur-xl">
          <div className="text-center p-12 max-w-lg w-full font-mono">
            <div className="w-16 h-1 bg-[rgba(255,255,255,0.05)] mx-auto mb-8 rounded-full overflow-hidden">
              <div className="h-full bg-[var(--neon-cyan)] animate-[scanline_2s_linear_infinite]"></div>
            </div>
            <h3 className="text-sm font-bold tracking-[0.5em] uppercase mb-4 text-white">{isAnalyzing ? 'Analyzing_Payload' : 'Handshaking...'}</h3>
            <p className="text-[10px] tracking-widest text-[var(--text-muted)] uppercase">
              {isAnalyzing ? 'Compiling evaluation matrices' : 'Establishing secure neural uplink'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterviewRoom;
