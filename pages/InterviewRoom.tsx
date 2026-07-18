import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { UserProfile, InterviewResult, InterviewContext } from '../types';
import { ChatMessage } from '../services/groq';
import { useInterviewSession } from '../hooks/useInterviewSession';
import { apiFetch, ensureAccessToken } from '../services/apiClient';
import { INTERVIEW_FIELDS, COMPANY_STYLES, INTERVIEW_MODES } from '../constants';
import {
  buildResumeSnippet,
  truncateJd,
  persistInterviewPrefs,
  readPrefillFromStorage,
} from '../services/interviewContext';
import { DOMAIN_PACKS, FIELD_TO_PACK } from '../services/domainPacks';
import { estimateFillerRatio, estimateSpeakingConfidence, paceToRate, SpeechPace } from '../services/voiceUtils';
import { recordPracticeActivity } from '../services/growth';
import { upsertSeat } from '../services/templates';
import { buildInterviewerSystemPrompt } from '../services/prompts/interviewer';
import { stripControlChars } from '../services/sanitize';
import { track } from '../services/telemetry';
import InterviewSetupForm from '../components/interview/InterviewSetupForm';
import InterviewActiveView from '../components/interview/InterviewActiveView';
import {
  AVATAR_STYLES,
  AVATAR_COLORS,
  INTENSITY_MODES,
  TOTAL_QUESTIONS_DEFAULT,
  InterviewFieldId,
  CompanyStyleId,
  InterviewModeId,
  TurnState,
} from '../components/interview/interviewConstants';

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
  onBack: () => void;
}

interface EvaluateApiResponse {
  next_action: string;
  message: string;
  follow_up: { type: string; question: string } | null;
  score?: { accuracy: number; depth: number; clarity: number; confidence: number; feedback: string };
}

const InterviewRoom: React.FC<InterviewRoomProps> = ({ user, onFinish, onBack }) => {
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

  const [setupError, setSetupError] = useState('');
  const [role, setRole] = useState(localStorage.getItem('last_target_role') || 'Product Manager');
  const [company, setCompany] = useState(localStorage.getItem('last_target_company') || '');
  const [interviewField, setInterviewField] = useState<InterviewFieldId>(
    (localStorage.getItem('last_interview_field') as InterviewFieldId) || 'business'
  );
  const [jobDescription, setJobDescription] = useState(localStorage.getItem('last_job_description') || '');
  const [useProfileResume, setUseProfileResume] = useState(true);
  const [resumePaste, setResumePaste] = useState('');
  const [companyStyle, setCompanyStyle] = useState<CompanyStyleId>(
    (localStorage.getItem('last_company_style') as CompanyStyleId) || 'product'
  );
  const [interviewMode, setInterviewMode] = useState<InterviewModeId>(
    (localStorage.getItem('last_interview_mode') as InterviewModeId) || 'behavioral'
  );
  const [domainPackId, setDomainPackId] = useState(
    localStorage.getItem('last_domain_pack') || FIELD_TO_PACK['business'] || 'consulting'
  );
  const [speechPace, setSpeechPace] = useState<SpeechPace>('normal');
  const [liveConfidence, setLiveConfidence] = useState<number | null>(null);
  const topicsCoveredRef = useRef<string[]>([]);

  const [selectedStyle, setSelectedStyle] = useState(AVATAR_STYLES[0]);
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0]);
  const [selectedIntensity, setSelectedIntensity] = useState(INTENSITY_MODES[0]);

  const modeMeta = useMemo(
    () => INTERVIEW_MODES.find((m) => m.id === interviewMode) || INTERVIEW_MODES[1],
    [interviewMode]
  );
  const styleMeta = useMemo(
    () => COMPANY_STYLES.find((s) => s.id === companyStyle) || COMPANY_STYLES[0],
    [companyStyle]
  );
  const totalQuestions = modeMeta.questionCount || TOTAL_QUESTIONS_DEFAULT;

  useEffect(() => {
    const prefill = readPrefillFromStorage();
    if (prefill.field && INTERVIEW_FIELDS.some((f) => f.id === prefill.field)) {
      setInterviewField(prefill.field as InterviewFieldId);
    }
    if (prefill.mode && INTERVIEW_MODES.some((m) => m.id === prefill.mode)) {
      setInterviewMode(prefill.mode as InterviewModeId);
      const m = INTERVIEW_MODES.find((x) => x.id === prefill.mode);
      if (m?.softPersona) {
        const persona = AVATAR_STYLES.find((a) => a.id === m.softPersona);
        if (persona) setSelectedStyle(persona);
      }
    }
    if (prefill.domainPack && DOMAIN_PACKS.some((p) => p.id === prefill.domainPack)) {
      setDomainPackId(prefill.domainPack);
    }
  }, []);

  useEffect(() => {
    const mapped = FIELD_TO_PACK[interviewField];
    if (mapped && !localStorage.getItem('last_domain_pack')) {
      setDomainPackId(mapped);
    }
  }, [interviewField]);

  useEffect(() => {
    if (!isActive) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === ' ') {
        if (isSpeakingRef.current) {
          e.preventDefault();
          if (synthRef.current) synthRef.current.cancel();
          isSpeakingRef.current = false;
          setIsSpeaking(false);
          resumeListeningRef.current();
        }
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        leaveEarlyRef.current();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        void endInterviewRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isActive]);

  const resumeSnippet = useMemo(
    () => buildResumeSnippet(user, useProfileResume, resumePaste),
    [user, useProfileResume, resumePaste]
  );

  const interviewCtx: InterviewContext = useMemo(() => ({
    role,
    company,
    interviewField,
    jobDescription: truncateJd(jobDescription),
    resumeSnippet,
    companyStyle: `${styleMeta.label}: ${styleMeta.hint}`,
    interviewMode: `${modeMeta.label}: ${modeMeta.hint}`,
    personaLabel: selectedStyle.label,
    personaDescription: selectedStyle.description,
    intensityLabel: selectedIntensity.label,
  }), [role, company, interviewField, jobDescription, resumeSnippet, styleMeta, modeMeta, selectedStyle, selectedIntensity]);

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
  const leaveEarlyRef = useRef<() => void>(() => undefined);
  const endInterviewRef = useRef<() => Promise<void>>(async () => undefined);
  const [silenceHint, setSilenceHint] = useState('');

  useEffect(() => {
    localStorage.setItem('last_target_role', role);
    localStorage.setItem('last_target_company', company);
    synthRef.current = window.speechSynthesis;

    const loadPiper = async () => {
      try {
        const piper = await import('../services/piper');
        await piper.initPiper({
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
          const { speakWithPiper } = await import('../services/piper');
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
      utterance.rate = paceToRate(speechPace);
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
  }, [usePiper, speechPace]);

  const buildSystemPrompt = useCallback((mode: 'next' | 'follow_up_fallback', lastAnswer?: string) => {
    const githubSummary = githubData.length > 0
      ? `Candidate's GitHub Projects to reference: ${githubData.map(r => `${r.name} (${r.description || 'No description'})`).join('; ')}`
      : '';
    return buildInterviewerSystemPrompt({
      mode,
      role,
      company,
      interviewField,
      interviewCtx,
      domainPackId,
      selectedStyle,
      selectedIntensity,
      modeMeta,
      styleMeta,
      totalQuestions,
      progress: advancedQuestionCountRef.current,
      topicsCovered: topicsCoveredRef.current,
      askedQuestions: askedQuestionsRef.current,
      currentQuestion: currentQuestionRef.current,
      lastAnswer,
      githubSummary: githubSummary || undefined,
      compactDefaults: interviewMode === 'behavioral' && companyStyle === 'product',
    });
  }, [company, role, selectedStyle, selectedIntensity, githubData, interviewField, interviewCtx, modeMeta, styleMeta, totalQuestions, domainPackId, interviewMode, companyStyle]);

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
      const topicHint = clean.replace(/\?.*$/, '').slice(0, 80).trim();
      if (topicHint && !topicsCoveredRef.current.includes(topicHint)) {
        topicsCoveredRef.current = [...topicsCoveredRef.current, topicHint].slice(-10);
      }
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
          const topicHint = finalText.replace(/\?.*$/, '').slice(0, 80).trim();
          if (topicHint && !topicsCoveredRef.current.includes(topicHint)) {
            topicsCoveredRef.current = [...topicsCoveredRef.current, topicHint].slice(-10);
          }
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
      const filler = estimateFillerRatio(userText);
      form.append('question_text', currentQuestionRef.current || 'Tell me about yourself');
      form.append('text_answer', userText);
      form.append('latency_seconds', '30');
      form.append('filler_ratio', String(filler));

      const response = await apiFetch('/session/evaluate', {
        method: 'POST',
        headers: {
          'X-Session-ID': sessionIdRef.current,
          Authorization: `Bearer ${token}`,
        },
        body: form,
      });
      if (!response.ok) return null;
      const data = await response.json() as EvaluateApiResponse;
      const apiConf = data.score?.confidence;
      setLiveConfidence(estimateSpeakingConfidence(userText, filler, apiConf));
      return data;
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
      if (advancedQuestionCountRef.current >= totalQuestions) {
        await deliverAiLine('Thank you. That covers our questions for today. Ending the interview now.', { countAsMainQuestion: false });
        setTurn('idle');
        return;
      }

      const evaluation = await evaluateAnswer(trimmed);

      if (evaluation?.follow_up?.question && (evaluation.next_action === 'follow_up' || evaluation.next_action === 'retry')) {
        if (evaluation.next_action === 'retry') track('evaluate_retry', { mode: interviewMode });
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
  }, [deliverAiLine, evaluateAnswer, streamNextQuestion, totalQuestions, interviewMode]);

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
    setSetupError('');
    if (!role.trim()) {
      setSetupError('Please enter a job title before starting.');
      return;
    }
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
          body: JSON.stringify({
            role,
            session_id: sessionId,
            job_description: truncateJd(jobDescription),
            resume_context: resumeSnippet,
            interview_field: interviewField,
            company_style: companyStyle,
            interview_mode: interviewMode,
            domain_pack: domainPackId,
          }),
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
        setSilenceHint('');
        if (liveText.length > 0) {
          setSilenceHint('Waiting for pause…');
          silenceTimerRef.current = setTimeout(() => {
            if (turnStateRef.current !== 'listening' || isSpeakingRef.current) return;
            const fullText = `${finalTranscriptRef.current}${interimTranscript}`.trim();
            if (fullText.length > 5) {
              finalTranscriptRef.current = '';
              clearSilenceTimer();
              setSilenceHint('');
              try {
                recognition.stop();
              } catch {
                // ignore
              }
              void processUserInputRef.current(fullText);
            }
          }, 3200);
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

      persistInterviewPrefs({
        role,
        company,
        interviewField,
        jobDescription: truncateJd(stripControlChars(jobDescription)),
        companyStyle,
        interviewMode,
        domainPack: domainPackId,
      });
      topicsCoveredRef.current = [];
      recordPracticeActivity();
      track('interview_start', { mode: interviewMode, pack: domainPackId, field: interviewField });

      const companyLabel = company.trim() || 'your target company';
      const intro = `Hello ${user.name.split(' ')[0]}. I'm your ${selectedStyle.label} interviewer from ${companyLabel}. This is a ${modeMeta.label} style interview with about ${totalQuestions} questions for the ${role} position. Let's start: Tell me about a challenging project or initiative you've worked on recently.`;
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
      setSetupError(err instanceof Error ? err.message : 'Microphone access required.');
    }
  };

  const leaveEarly = () => {
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
    track('interview_leave', { mode: interviewMode });
    onBack();
  };
  leaveEarlyRef.current = leaveEarly;

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
      onBack();
      return;
    }

    setIsAnalyzing(true);
    try {
      const transcriptStrings = transcription.map(t =>
        `${t.sender === 'AI' ? 'Interviewer' : 'Candidate'}: ${t.text}`
      );
      const analysis = await runAnalysis(transcriptStrings, role, company, {
        jobDescription: truncateJd(stripControlChars(jobDescription)),
        resumeContext: stripControlChars(resumeSnippet),
        interviewField,
        companyStyle,
        interviewMode,
        domainPack: domainPackId,
      });
      const result: InterviewResult = {
        id: sessionIdRef.current || Date.now().toString(),
        date: new Date().toISOString(),
        role,
        company,
        overallScore: analysis.overallScore,
        categories: analysis.categories,
        feedback: analysis.feedback,
        transcription: transcriptStrings,
        strengths: analysis.strengths,
        weaknesses: analysis.weaknesses,
        categoryExplanations: analysis.categoryExplanations,
        improvementPlan: analysis.improvementPlan,
        sampleAnswers: analysis.sampleAnswers,
        field: interviewField,
        mode: interviewMode,
        companyStyle,
        domainPack: domainPackId,
      };
      const existingHistory = JSON.parse(localStorage.getItem('interview_history') || '[]') as InterviewResult[];
      localStorage.setItem('interview_history', JSON.stringify([result, ...existingHistory]));
      const activeSeat = localStorage.getItem('prepai_active_seat');
      if (activeSeat) {
        upsertSeat(activeSeat, analysis.overallScore);
      }
      track('interview_end', { mode: interviewMode, score: analysis.overallScore, pack: domainPackId });
      onFinish();
    } catch {
      track('interview_analyze_fail', { mode: interviewMode });
      onFinish();
    } finally {
      setIsAnalyzing(false);
    }
  };
  endInterviewRef.current = endInterview;

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
        <InterviewSetupForm
          onBack={onBack}
          piperLoading={piperLoading}
          downloadProgress={downloadProgress}
          usePiper={usePiper}
          setupError={setupError}
          role={role}
          company={company}
          interviewField={interviewField}
          interviewMode={interviewMode}
          companyStyle={companyStyle}
          domainPackId={domainPackId}
          speechPace={speechPace}
          jobDescription={jobDescription}
          useProfileResume={useProfileResume}
          resumePaste={resumePaste}
          selectedStyle={selectedStyle}
          selectedColor={selectedColor}
          selectedIntensity={selectedIntensity}
          githubRepos={githubData}
          onRoleChange={setRole}
          onCompanyChange={setCompany}
          onFieldChange={setInterviewField}
          onModeChange={(mode, persona) => {
            setInterviewMode(mode);
            if (persona) setSelectedStyle(persona);
          }}
          onCompanyStyleChange={setCompanyStyle}
          onDomainPackChange={setDomainPackId}
          onSpeechPaceChange={setSpeechPace}
          onJobDescriptionChange={(v) => setJobDescription(stripControlChars(v))}
          onUseProfileResumeChange={setUseProfileResume}
          onResumePasteChange={(v) => setResumePaste(stripControlChars(v))}
          onStyleChange={setSelectedStyle}
          onColorChange={setSelectedColor}
          onIntensityChange={setSelectedIntensity}
          onStart={startInterview}
        />
      ) : isActive ? (
        <InterviewActiveView
          videoRef={videoRef}
          transcriptEndRef={transcriptEndRef}
          cameraEnabled={cameraEnabled}
          selectedStyle={selectedStyle}
          selectedColor={selectedColor}
          isSpeaking={isSpeaking}
          isListening={isListening}
          isProcessing={isProcessing}
          liveConfidence={liveConfidence}
          silenceHint={silenceHint}
          mainQuestionCount={mainQuestionCount}
          totalQuestions={totalQuestions}
          transcription={transcription}
          onLeave={leaveEarly}
          onEnd={() => { void endInterview(); }}
        />
      ) : (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/90 backdrop-blur-xl">
          <div className="text-center p-12 max-w-lg w-full font-mono">
            <div className="w-16 h-1 bg-[rgba(255,255,255,0.05)] mx-auto mb-8 rounded-full overflow-hidden">
              <div className="h-full bg-[var(--neon-cyan)] animate-[scanline_2s_linear_infinite]"></div>
            </div>
            <h3 className="text-sm font-bold tracking-[0.5em] uppercase mb-4 text-white">{isAnalyzing ? 'Reviewing your answers' : 'Starting…'}</h3>
            <p className="text-[10px] tracking-widest text-[var(--text-muted)] uppercase">
              {isAnalyzing ? 'Preparing your feedback' : 'Connecting microphone and camera'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterviewRoom;
