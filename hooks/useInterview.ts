import { useState, useRef, useCallback } from 'react';

export interface Question {
  id: string;
  text: string;
  topic: string;
}

export interface AnswerScore {
  accuracy: number;
  depth: number;
  clarity: number;
  confidence: number;
  feedback: string;
}

export interface FollowUp {
  type: string;
  question: string;
}

export interface EvaluateResponse {
  score: AnswerScore;
  follow_up: FollowUp | null;
  next_action: string;
  message: string;
}

export const useInterview = () => {
  const [session, setSession] = useState<{ id: string; role: string } | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const startSession = async (role: string, sessionId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/session/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, session_id: sessionId }),
      });
      
      if (!response.ok) throw new Error('Failed to start session');
      
      const nextQ: Question = await response.json();
      setSession({ id: sessionId, role });
      setCurrentQuestion(nextQ);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error starting session');
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      
      recorder.start(200);
      setIsRecording(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Microphone access denied');
    }
  }, []);

  const stopRecordingAndEvaluate = useCallback(async (latencySeconds: number, fillerRatio: number) => {
    if (!mediaRecorderRef.current || !session || !currentQuestion) return null;
    
    setIsLoading(true);
    setError(null);
    setIsRecording(false);
    
    return new Promise<EvaluateResponse | null>((resolve) => {
      mediaRecorderRef.current!.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Cleanup stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
        
        const formData = new FormData();
        formData.append('session_id', session.id);
        formData.append('question_text', currentQuestion.text);
        formData.append('latency_seconds', latencySeconds.toString());
        formData.append('filler_ratio', fillerRatio.toString());
        formData.append('audio_file', audioBlob, 'recording.webm');
        
        try {
          const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/session/evaluate`, {
            method: 'POST',
            headers: {
              'X-Session-ID': session.id
            },
            body: formData,
          });
          
          if (!response.ok) throw new Error('Failed to evaluate answer');
          
          const result: EvaluateResponse = await response.json();
          resolve(result);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Unknown error evaluating answer');
          resolve(null);
        } finally {
          setIsLoading(false);
        }
      };
      
      mediaRecorderRef.current!.stop();
    });
  }, [session, currentQuestion]);

  const advanceQuestion = async () => {
    if (!session) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/session/next`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: session.id }),
      });
      
      if (!response.ok) throw new Error('Failed to get next question');
      
      const nextQ: Question = await response.json();
      setCurrentQuestion(nextQ);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error advancing question');
    } finally {
      setIsLoading(false);
    }
  };
  
  const getReportUrl = () => {
    if (!session) return null;
    return `${import.meta.env.VITE_API_URL || ''}/session/report?session_id=${session.id}`;
  };

  return {
    session,
    currentQuestion,
    setCurrentQuestion,
    isLoading,
    error,
    isRecording,
    startSession,
    startRecording,
    stopRecordingAndEvaluate,
    advanceQuestion,
    getReportUrl
  };
};
