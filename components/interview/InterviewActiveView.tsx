import React, { RefObject } from 'react';
import { AvatarColor, AvatarStyle, TranscriptLine } from './interviewConstants';

export interface InterviewActiveViewProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  transcriptEndRef: RefObject<HTMLDivElement | null>;
  cameraEnabled: boolean;
  selectedStyle: AvatarStyle;
  selectedColor: AvatarColor;
  isSpeaking: boolean;
  isListening: boolean;
  isProcessing: boolean;
  liveConfidence: number | null;
  silenceHint: string;
  mainQuestionCount: number;
  totalQuestions: number;
  transcription: TranscriptLine[];
  onLeave: () => void;
  onEnd: () => void;
}

const InterviewActiveView: React.FC<InterviewActiveViewProps> = ({
  videoRef,
  transcriptEndRef,
  cameraEnabled,
  selectedStyle,
  selectedColor,
  isSpeaking,
  isListening,
  isProcessing,
  liveConfidence,
  silenceHint,
  mainQuestionCount,
  totalQuestions,
  transcription,
  onLeave,
  onEnd,
}) => (
  <div className="flex-1 flex flex-col p-4 md:p-10 overflow-hidden animate-fadeIn">
    <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 relative overflow-hidden">
      <div className="lg:col-span-8 flex flex-col gap-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1">
          <div className="relative rounded-lg overflow-hidden min-h-[400px] bg-black border border-[rgba(255,255,255,0.05)]">
            {cameraEnabled ? (
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover grayscale brightness-75 contrasts-125"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
                <i className="fa-solid fa-video-slash text-5xl" />
              </div>
            )}
            <div className="absolute top-6 left-6 px-3 py-1 bg-black/80 border border-[rgba(255,255,255,0.1)] font-mono text-[9px] uppercase tracking-widest text-white flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
              You
            </div>
          </div>

          <div className="relative rounded-lg overflow-hidden flex flex-col min-h-[400px] bg-black border border-[rgba(255,255,255,0.05)]">
            <div className="flex-1 flex items-center justify-center relative bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.02)_0%,transparent_100%)]">
              {isSpeaking && (
                <div
                  className="absolute w-64 h-64 rounded-full speaking-ring opacity-10"
                  style={{ background: selectedColor.hex }}
                />
              )}
              <div
                className={`w-40 h-40 rounded-sm flex items-center justify-center transition-all duration-300 avatar-glow ${
                  isSpeaking ? 'scale-105' : ''
                }`}
                style={{
                  border: `1px solid ${selectedColor.hex}40`,
                  background: `${selectedColor.hex}05`,
                }}
              >
                <i className={`fa-solid ${selectedStyle.icon} text-6xl`} style={{ color: selectedColor.hex }} />
              </div>
            </div>
            <div
              className="absolute top-6 right-6 px-3 py-1 bg-black/80 border border-[rgba(255,255,255,0.1)] font-mono text-[9px] uppercase tracking-widest flex items-center gap-2"
              style={{ color: selectedColor.hex }}
            >
              <i className="fa-solid fa-microchip" />
              {selectedStyle.label}
            </div>
          </div>
        </div>

        <div className="p-6 rounded-lg flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 glass-panel border border-[rgba(255,255,255,0.05)]">
          <div className="flex gap-8">
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[8px] uppercase tracking-widest text-[var(--text-muted)]">Status</span>
              <span
                className={`font-mono text-xs uppercase tracking-[0.2em] ${
                  isListening
                    ? 'text-[var(--neon-emerald)]'
                    : isSpeaking
                      ? 'text-[var(--neon-cyan)]'
                      : 'text-white'
                }`}
                aria-live="polite"
              >
                {isListening
                  ? 'Listening'
                  : isSpeaking
                    ? 'Speaking (Space to interrupt)'
                    : isProcessing
                      ? 'Thinking'
                      : 'Ready'}
              </span>
              {liveConfidence !== null && (
                <span className="font-mono text-[8px] text-[var(--text-muted)]">Delivery ~{liveConfidence}</span>
              )}
              {silenceHint && isListening && (
                <span className="font-mono text-[8px] text-[var(--neon-orange)]">{silenceHint}</span>
              )}
              <span className="font-mono text-[8px] text-[var(--text-muted)] mt-1">
                Shortcuts: Space interrupt · Esc Leave · Ctrl+E End
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[8px] uppercase tracking-widest text-[var(--text-muted)]">Questions</span>
              <span className="font-mono text-xs text-white">
                {mainQuestionCount}/{totalQuestions}
              </span>
            </div>
          </div>
          <div className="flex gap-3 flex-wrap justify-end">
            <button
              type="button"
              onClick={onLeave}
              className="btn-secondary px-6"
              aria-label="Leave interview without analysis"
            >
              Leave
            </button>
            <button
              type="button"
              onClick={onEnd}
              className="btn-secondary border-red-500/50 text-red-500 hover:bg-red-500/10 px-8"
              aria-label="End interview and view results"
            >
              End interview
            </button>
          </div>
        </div>
      </div>

      <div className="lg:col-span-4 flex flex-col rounded-lg overflow-hidden glass-panel border border-[rgba(255,255,255,0.05)]">
        <div className="p-4 bg-[rgba(255,255,255,0.02)] border-b border-[rgba(255,255,255,0.05)] flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase font-bold tracking-[0.4em] text-white">Transcript</span>
          <div className="flex gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[var(--bg-accent)]" />
            <div className="w-2 h-2 rounded-full bg-[var(--bg-accent)]" />
            <div className="w-2 h-2 rounded-full bg-[var(--neon-emerald)] animate-pulse" />
          </div>
        </div>

        <div className="flex-1 p-6 overflow-y-auto space-y-6 scroll-smooth scrollbar-hide bg-[rgba(0,0,0,0.5)]">
          {transcription.map((item, i) => (
            <div key={`${item.sender}-${i}-${item.text.slice(0, 12)}`} className="flex flex-col gap-2 font-mono">
              <span
                className="text-[9px] uppercase tracking-[0.3em] flex items-center gap-2"
                style={{
                  color: item.sender === 'AI' ? selectedColor.hex : 'var(--neon-emerald)',
                }}
              >
                {item.sender === 'AI' ? selectedStyle.label : 'You'}
              </span>
              <div
                className="text-[13px] leading-relaxed terminal-text pl-4 border-l border-[rgba(255,255,255,0.05)] break-words"
                style={{ color: item.sender === 'AI' ? '#E2E8F0' : '#CBD5E1' }}
              >
                {item.text || (item.sender === 'You' ? '...' : '')}
                {item.sender === 'AI' && i === transcription.length - 1 && isProcessing && (
                  <span className="w-2 h-4 bg-[var(--neon-cyan)] inline-block ml-1 animate-pulse" />
                )}
              </div>
            </div>
          ))}
          <div ref={transcriptEndRef} />
        </div>
      </div>
    </div>
  </div>
);

export default InterviewActiveView;
