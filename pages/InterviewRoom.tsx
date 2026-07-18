import React, { useState, useRef, useEffect, useCallback } from 'react';
import { UserProfile, InterviewResult } from '../types';
import { ChatMessage } from '../services/groq';
import { initPiper, speakWithPiper } from '../services/piper';
import { useInterviewSession } from '../hooks/useInterviewSession';
import { apiFetch, ensureAccessToken } from '../services/apiClient';

interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly 0: { transcript: string };
}

interface SpeechRecognitionEventLike extends Event {
  readonly resultIndex: number;
  readonly results: ArrayLike<SpeechRecognitionResultLike> & { length: number };
}

interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

interface InterviewRoomProps {
  user: UserProfile;
  onFinish: () => void;
}

type TurnState = 'idle' | 'listening' | 'processing' | 'speaking';

interface EvaluateApiResponse {
  next_action: string;
  message: string;
  follow_up: { type: string; question: string } | null;
  score?: { accuracy: number; depth: number; clarity: number; confidence: number; feedback: string };
}

const TOTAL_QUESTIONS = 5;

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

const INTENSITY_MODES = [
  { id: 'standard', label: 'Standard', multiplier: 1, color: 'var(--text-secondary)' },
  { id: 'aggressive', label: 'Aggressive', multiplier: 1.5, color: '#F87171' },
  { id: 'zen', label: 'Zen', multiplier: 0.7, color: '#60A5FA' },
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
  const [transcription, setTranscription] = useState<{ sender: 'AI' | 'You'; text: string }[]>([]);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const [cameraEnabled, setCameraEnabled] = useState(true);

  const [piperLoading, setPiperLoading] = useState(true);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [usePiper, setUsePiper] = useState(false);

  const [role, setRole] = useState(localStorage.getItem('last_target_role') || 'Senior Software Engineer');
  const [company, setCompany] = useState(localStorage.getItem('last_target_company') || 'Google');

  const [selectedStyle, setSelectedStyle] = useState(AVATAR_STYLES[0]);
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0]);
  const [selectedIntensity, setSelectedIntensity] = useState(INTENSITY_MODES[0]);

  const {
    githubData,
    loadGithubContext,
    streamInterviewerResponse,
    runAnalysis,
  } = useInterviewSession();

  const videoRef = useRef<HTMLVideoElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const conversationRef = useRef<ChatMessage[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const isSpeakingRef = useRef(false);
  const isActiveRef = useRef(false);
  const turnStateRef = useRef<TurnState>('idle');
  const finalTranscriptRef = useRef('');
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftYouIndexRef = useRef<number | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const currentQuestionRef = useRef('');
  const [mainQuestionCount, setMainQuestionCount] = useState(0);
  const askedQuestionsRef = useRef<string[]>([]);
  const advancedQuestionCountRef = useRef(0);
  const processUserInputRef = useRef<(text: string) => Promise<void>>(async () => undefined);
  const resumeListeningRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    localStorage.setItem('last_target_role', role);
    localStorage.setItem('last_target_company', company);
    synthRef.current = window.speechSynthesis;

    const loadPiper = async () => {
      try {
        await initPiper({
          onDownloadProgress: (percent) => setDownloadProgress(percent),
          onInit: () => {
            setUsePiper(true);
            setPiperLoading(false);
          },
          onError: () => {
            setUsePiper(false);
            setPiperLoading(false);
          }
        });
      } catch {
        setUsePiper(false);
        setPiperLoading(false);
      }
    };
    loadPiper();

    if (user.githubUrl) {
      loadGithubContext(user.githubUrl);
    }
  }, [user.githubUrl, loadGithubContext, role, company]);

  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcription]);

  const clearSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  const resetSttBuffer = () => {
    clearSilenceTimer();
    finalTranscriptRef.current = '';
    draftYouIndexRef.current = null;
  };

  const setTurn = (state: TurnState) => {
    turnStateRef.current = state;
    setIsProcessing(state === 'processing');
    setIsSpeaking(state === 'speaking');
    setIsListening(state === 'listening');
  };

  const resumeListening = useCallback(() => {
    if (!isActiveRef.current) return;
    resetSttBuffer();
    setTurn('listening');
    isSpeakingRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch {
        // Already started
      }
    }
  }, []);

  useEffect(() => {
    resumeListeningRef.current = resumeListening;
  }, [resumeListening]);

  const speakText = useCallback((text: string) => {
    return new Promise<void>(async (resolve) => {
      const cleanText = text.replace(/[*#]/g, '').trim();
      if (!cleanText) {
        resolve();
        return;
      }

      setTurn('speaking');
      isSpeakingRef.current = true;

      if (usePiper) {
        try {
          await speakWithPiper(
            cleanText,
            () => undefined,
            () => {
              isSpeakingRef.current = false;
              resolve();
            }
          );
          return;
        } catch {
          // Fall through to browser TTS
        }
      }

      if (!synthRef.current) {
        isSpeakingRef.current = false;
        resolve();
        return;
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
        isSpeakingRef.current = false;
        resolve();
      };
      utterance.onerror = () => {
        isSpeakingRef.current = false;
        resolve();
      };

      synthRef.current.speak(utterance);
    });
  }, [usePiper]);

  const buildSystemPrompt = useCallback((mode: 'next' | 'follow_up_fallback', lastAnswer?: string) => {
    const githubContext = githubData.length > 0
      ? `\nCandidate's GitHub Projects to reference: ${githubData.map(r => `${r.name} (${r.description || 'No description'})`).join('; ')}`
      : '';
    const asked = askedQuestionsRef.current;
    const askedBlock = asked.length
      ? `\nAlready asked (NEVER repeat these verbatim):\n${asked.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
      : '';
    const progress = advancedQuestionCountRef.current;

    if (mode === 'follow_up_fallback') {
      return `You are a professional ${selectedStyle.label} interviewer (${selectedStyle.description}) from ${company} for a ${role} role.
Intensity: ${selectedIntensity.label}.
The candidate just answered: "${(lastAnswer || '').slice(0, 500)}"
Current main question was: "${currentQuestionRef.current}"
Ask ONE short probing follow-up that digs into gaps or asks for a concrete example. Do NOT ask a brand-new topic. Do NOT repeat the same question. 1-2 sentences max.${githubContext}`;
    }

    return `You are a professional ${selectedStyle.label} interviewer (${selectedStyle.description}) from ${company} conducting a ${role} interview.
Intensity Protocol: ${selectedIntensity.label}. Higher intensity = more critical probing.

Rules:
- Ask exactly ${TOTAL_QUESTIONS} DISTINCT main questions across the interview (currently advanced ${progress}/${TOTAL_QUESTIONS}).
- Keep responses BRIEF (1-2 sentences) then ask exactly ONE new question.
- NEVER repeat a previous question. Move to a NEW technical/behavioral topic.
- Do NOT wrap up until all ${TOTAL_QUESTIONS} main questions are done.
${askedBlock}${githubContext}`;
  }, [company, role, selectedStyle, selectedIntensity, githubData]);

  const deliverAiLine = useCallback(async (text: string, opts?: { countAsMainQuestion?: boolean }) => {
    const clean = text.trim();
    if (!clean) return;

    setTranscription(prev => [...prev, { sender: 'AI', text: clean }]);
    conversationRef.current.push({ role: 'assistant', content: clean });

    if (opts?.countAsMainQuestion) {
      askedQuestionsRef.current.push(clean);
      advancedQuestionCountRef.current += 1;
      setMainQuestionCount(advancedQuestionCountRef.current);
      currentQuestionRef.current = clean;
    }

    await speakText(clean);
    resumeListeningRef.current();
  }, [speakText]);

  const streamNextQuestion = useCallback(async (userText: string, mode: 'next' | 'follow_up_fallback') => {
    setTranscription(prev => [...prev, { sender: 'AI', text: '' }]);
    let fullResponse = '';

    await streamInterviewerResponse(
      conversationRef.current,
      buildSystemPrompt(mode, userText),
      (chunk) => {
        fullResponse += chunk;
        setTranscription(prev => {
          const newArr = [...prev];
          const last = newArr[newArr.length - 1];
          if (last && last.sender === 'AI') {
            newArr[newArr.length - 1] = { ...last, text: fullResponse };
          }
          return newArr;
        });
      },
      async (completed) => {
        const finalText = completed.trim() || fullResponse.trim();
        if (!finalText) return;
        conversationRef.current.push({ role: 'assistant', content: finalText });
        if (mode === 'next') {
          askedQuestionsRef.current.push(finalText);
          advancedQuestionCountRef.current += 1;
          setMainQuestionCount(advancedQuestionCountRef.current);
          currentQuestionRef.current = finalText;
        } else {
          currentQuestionRef.current = finalText;
        }
        await speakText(finalText);
      }
    );
  }, [streamInterviewerResponse, buildSystemPrompt, speakText]);

  const evaluateAnswer = useCallback(async (userText: string): Promise<EvaluateApiResponse | null> => {
    if (!sessionIdRef.current) return null;
    try {
      const token = await ensureAccessToken();
      const form = new FormData();
      form.append('question_text', currentQuestionRef.current || 'Tell me about yourself');
      form.append('text_answer', userText);
      form.append('latency_seconds', '30');
      form.append('filler_ratio', '0.05');

      const response = await apiFetch('/session/evaluate', {
        method: 'POST',
        headers: {
          'X-Session-ID': sessionIdRef.current,
          Authorization: `Bearer ${token}`,
        },
        body: form,
      });
      if (!response.ok) return null;
      return await response.json() as EvaluateApiResponse;
    } catch {
      return null;
    }
  }, []);

  const processUserInput = useCallback(async (userText: string) => {
    const trimmed = userText.trim();
    if (!trimmed) return;
    if (turnStateRef.current === 'processing' || turnStateRef.current === 'speaking') return;

    clearSilenceTimer();
    finalTranscriptRef.current = '';
    draftYouIndexRef.current = null;
    setTurn('processing');
    isSpeakingRef.current = false;

    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }

    setTranscription(prev => {
      const last = prev[prev.length - 1];
      if (last?.sender === 'You') {
        const copy = [...prev];
        copy[copy.length - 1] = { sender: 'You', text: trimmed };
        return copy;
      }
      return [...prev, { sender: 'You', text: trimmed }];
    });
    conversationRef.current.push({ role: 'user', content: trimmed });

    try {
      if (advancedQuestionCountRef.current >= TOTAL_QUESTIONS) {
        await deliverAiLine('Thank you. That covers our questions for today. Ending the interview now.', { countAsMainQuestion: false });
        setTurn('idle');
        return;
      }

      const evaluation = await evaluateAnswer(trimmed);

      if (evaluation?.follow_up?.question && (evaluation.next_action === 'follow_up' || evaluation.next_action === 'retry')) {
        await deliverAiLine(evaluation.follow_up.question, { countAsMainQuestion: false });
        return;
      }

      if (evaluation?.next_action === 'end') {
        await deliverAiLine(evaluation.message || 'Interview complete. Great work today.', { countAsMainQuestion: false });
        setTurn('idle');
        return;
      }

      if (evaluation?.next_action === 'advance') {
        await streamNextQuestion(trimmed, 'next');
        resumeListeningRef.current();
        return;
      }

      // Evaluate unavailable: ask probing follow-up OR a new non-repeating question
      await streamNextQuestion(trimmed, 'follow_up_fallback');
      resumeListeningRef.current();
    } catch {
      setIsProcessing(false);
      await deliverAiLine("I'm sorry, I missed that. Could you repeat your answer?");
    }
  }, [deliverAiLine, evaluateAnswer, streamNextQuestion]);

  useEffect(() => {
    processUserInputRef.current = processUserInput;
  }, [processUserInput]);

  const updateLiveYouDraft = (text: string) => {
    setTranscription(prev => {
      const idx = draftYouIndexRef.current;
      if (idx !== null && prev[idx]?.sender === 'You') {
        const copy = [...prev];
        copy[idx] = { sender: 'You', text };
        return copy;
      }
      draftYouIndexRef.current = prev.length;
      return [...prev, { sender: 'You', text }];
    });
  };

  const startInterview = async () => {
    setIsConnecting(true);
    setTranscription([]);
    conversationRef.current = [];
      askedQuestionsRef.current = [];
    advancedQuestionCountRef.current = 0;
    setMainQuestionCount(0);
    sessionIdRef.current = null;
    resetSttBuffer();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: cameraEnabled });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      const win = window as Window & {
        SpeechRecognition?: SpeechRecognitionCtor;
        webkitSpeechRecognition?: SpeechRecognitionCtor;
      };
      const SpeechRecognitionCtor = win.SpeechRecognition || win.webkitSpeechRecognition;
      if (!SpeechRecognitionCtor) {
        throw new Error('Please use Chrome or Edge for voice features.');
      }

      // Start agentic session for evaluate/follow-up decisions
      const sessionId = `iv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      sessionIdRef.current = sessionId;
      try {
        await apiFetch('/session/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role, session_id: sessionId }),
        });
      } catch {
        // Continue without agentic evaluate; prompt fallback still works
      }

      const recognition = new SpeechRecognitionCtor();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        if (turnStateRef.current !== 'listening' || isSpeakingRef.current) return;

        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const piece = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscriptRef.current += `${piece} `;
          } else {
            interimTranscript += piece;
          }
        }

        const liveText = `${finalTranscriptRef.current}${interimTranscript}`.trim();
        if (liveText) {
          updateLiveYouDraft(liveText);
        }

        clearSilenceTimer();
        if (liveText.length > 0) {
          silenceTimerRef.current = setTimeout(() => {
            if (turnStateRef.current !== 'listening' || isSpeakingRef.current) return;
            const fullText = `${finalTranscriptRef.current}${interimTranscript}`.trim();
            if (fullText.length > 5) {
              finalTranscriptRef.current = '';
              clearSilenceTimer();
              try {
                recognition.stop();
              } catch {
                // ignore
              }
              void processUserInputRef.current(fullText);
            }
          }, 2800);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        if (isActiveRef.current && turnStateRef.current === 'listening' && !isSpeakingRef.current) {
          try {
            recognition.start();
          } catch {
            // ignore
          }
        }
      };
      recognition.onstart = () => {
        if (turnStateRef.current === 'listening') setIsListening(true);
      };
      recognitionRef.current = recognition;

      isActiveRef.current = true;
      setIsActive(true);
      setIsConnecting(false);

      const intro = `Hello ${user.name.split(' ')[0]}. I'm your ${selectedStyle.label} interviewer from ${company}. I'll ask about ${TOTAL_QUESTIONS} questions for the ${role} position. Let's start: Tell me about a challenging technical project you've worked on recently.`;
      askedQuestionsRef.current = [intro];
      advancedQuestionCountRef.current = 1;
      setMainQuestionCount(1);
      currentQuestionRef.current = intro;
      setTranscription([{ sender: 'AI', text: intro }]);
      conversationRef.current.push({ role: 'assistant', content: intro });

      setTurn('speaking');
      await speakText(intro);
      resumeListening();
    } catch (err: unknown) {
      setIsConnecting(false);
      isActiveRef.current = false;
      alert(err instanceof Error ? err.message : 'Microphone access required.');
    }
  };

  const endInterview = async () => {
    isActiveRef.current = false;
    turnStateRef.current = 'idle';
    resetSttBuffer();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
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
      const analysis = await runAnalysis(transcriptStrings, role, company);
      const result: InterviewResult = {
        id: sessionIdRef.current || Date.now().toString(),
        date: new Date().toISOString(),
        role,
        company,
        overallScore: analysis.overallScore,
        categories: analysis.categories,
        feedback: analysis.feedback,
        transcription: transcriptStrings
      };
      const existingHistory = JSON.parse(localStorage.getItem('interview_history') || '[]') as InterviewResult[];
      localStorage.setItem('interview_history', JSON.stringify([result, ...existingHistory]));
      onFinish();
    } catch {
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

      {!isActive && !isConnecting && !isAnalyzing ? (
        <div className="flex-1 flex items-center justify-center p-6 animate-fadeIn">
          <div className="max-w-4xl w-full p-8 md:p-12 rounded-lg glass-panel relative border border-[var(--glass-border)] shadow-2xl">
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
                        type="button"
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
                  <label className="label-premium">Interview_Intensity_Matrix</label>
                  <div className="flex items-center justify-between p-4 rounded-md bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]">
                    {INTENSITY_MODES.map(mode => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setSelectedIntensity(mode)}
                        className={`px-4 py-2 rounded font-mono text-[10px] uppercase tracking-widest transition-all duration-200 ${selectedIntensity.id === mode.id ? 'bg-white text-black font-bold' : 'text-[var(--text-secondary)] hover:text-white'}`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {githubData.length > 0 && (
              <div className="mb-8 p-4 rounded bg-[var(--neon-cyan)]/5 border border-[var(--neon-cyan)]/20">
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--neon-cyan)] mb-2 flex items-center gap-2">
                  <i className="fa-brands fa-github"></i> Neural_Context_Loaded: {githubData.length} Repositories Found
                </p>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {githubData.map(repo => (
                    <span key={repo.id} className="px-2 py-1 bg-black/40 border border-[rgba(255,255,255,0.1)] text-[var(--text-muted)] text-[8px] font-mono whitespace-nowrap">
                      {repo.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
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

              <div className="p-6 rounded-lg flex items-center justify-between glass-panel border border-[rgba(255,255,255,0.05)]">
                <div className="flex gap-8">
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-[8px] uppercase tracking-widest text-[var(--text-muted)]">Core_Status</span>
                    <span className={`font-mono text-xs uppercase tracking-[0.2em] ${isListening ? 'text-[var(--neon-emerald)]' : isSpeaking ? 'text-[var(--neon-cyan)]' : 'text-white'}`}>
                      {isListening ? '>> Listening' : isSpeaking ? '>> Speaking' : isProcessing ? '>> Thinking' : '>> Standing_By'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-[8px] uppercase tracking-widest text-[var(--text-muted)]">Main_Qs</span>
                    <span className="font-mono text-xs text-white">{mainQuestionCount}/{TOTAL_QUESTIONS}</span>
                  </div>
                </div>
                <button type="button" onClick={endInterview} className="btn-secondary border-red-500/50 text-red-500 hover:bg-red-500/10 px-10">Abort_Session</button>
              </div>
            </div>

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
                  <div key={`${item.sender}-${i}-${item.text.slice(0, 12)}`} className="flex flex-col gap-2 font-mono">
                    <span className="text-[9px] uppercase tracking-[0.3em] flex items-center gap-2" style={{ color: item.sender === 'AI' ? selectedColor.hex : 'var(--neon-emerald)' }}>
                      {item.sender === 'AI' ? `> ${selectedStyle.label}` : '> User_Node'}
                    </span>
                    <div className="text-[13px] leading-relaxed terminal-text pl-4 border-l border-[rgba(255,255,255,0.05)] break-words" style={{ color: item.sender === 'AI' ? '#E2E8F0' : '#CBD5E1' }}>
                      {item.text || (item.sender === 'You' ? '...' : '')}
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
