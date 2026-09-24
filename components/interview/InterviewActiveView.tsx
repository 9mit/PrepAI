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
  <div className="flex-1 flex flex-col p-3 sm:p-6 lg:p-8 overflow-hidden animate-fadeIn max-w-7xl mx-auto w-full">
    {/* Top Session HUD Bar */}
    <div className="glass-panel p-3.5 sm:p-4 rounded-xl border border-[var(--glass-border)] mb-4 sm:mb-6 flex flex-wrap items-center justify-between gap-4">
      {/* Question Progress */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-sm bg-[var(--bg-accent)] border border-[var(--glass-border)] flex items-center justify-center font-mono text-xs font-bold text-white">
          Q{mainQuestionCount}
        </div>
        <div>
          <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--text-muted)] block">
            Progress
          </span>
          <span className="font-mono text-xs font-bold text-white">
            {mainQuestionCount} of {totalQuestions} Questions
          </span>
        </div>
        <div className="w-20 h-1.5 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden hidden sm:block">
          <div
            className="h-full bg-[var(--neon-cyan)] transition-all duration-300 rounded-full"
            style={{ width: `${Math.min((mainQuestionCount / totalQuestions) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Real-time State & Delivery Pill */}
      <div className="flex items-center gap-2 sm:gap-3">
        <span
          className={`font-mono text-[10px] uppercase font-bold tracking-wider px-3 py-1 rounded-full border transition-all ${
            isListening
              ? 'bg-[var(--neon-emerald)]/15 border-[var(--neon-emerald)]/40 text-[var(--neon-emerald)]'
              : isSpeaking
                ? 'bg-[var(--neon-cyan)]/15 border-[var(--neon-cyan)]/40 text-[var(--neon-cyan)]'
                : isProcessing
                  ? 'bg-[var(--neon-orange)]/15 border-[var(--neon-orange)]/40 text-[var(--neon-orange)]'
                  : 'bg-[rgba(255,255,255,0.05)] border-[var(--glass-border)] text-white'
          }`}
          aria-live="polite"
        >
          {isListening && (
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--neon-emerald)] animate-ping" />
              Listening to you
            </span>
          )}
          {isSpeaking && (
            <span className="inline-flex items-center gap-1.5">
              <i className="fa-solid fa-volume-high text-xs" />
              Interviewer Speaking (Space to interrupt)
            </span>
          )}
          {isProcessing && (
            <span className="inline-flex items-center gap-1.5">
              <i className="fa-solid fa-circle-notch animate-spin text-xs" />
              Analyzing Response…
            </span>
          )}
          {!isListening && !isSpeaking && !isProcessing && 'Session Active'}
        </span>

        {liveConfidence !== null && (
          <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[var(--glass-border)] bg-[rgba(255,255,255,0.02)] font-mono text-[9px] text-[var(--text-secondary)]">
            Delivery: <strong className="text-white">~{liveConfidence}%</strong>
          </span>
        )}

        {silenceHint && isListening && (
          <span className="font-mono text-[9px] text-[var(--neon-orange)] animate-pulse hidden lg:inline">
            {silenceHint}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onLeave}
          className="btn-secondary py-2 px-3 text-[10px] font-mono tracking-wider"
          aria-label="Leave interview without analysis"
        >
          Leave
        </button>
        <button
          type="button"
          onClick={onEnd}
          className="btn-secondary py-2 px-3 text-[10px] font-mono tracking-wider border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50"
          aria-label="End interview and view feedback"
        >
          <i className="fa-solid fa-flag-checkered text-xs"></i>
          <span>End & Analyze</span>
        </button>
      </div>
    </div>

    {/* Dual Viewport & Transcript Grid */}
    <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 min-h-0 overflow-hidden">
      {/* Video & Avatar Container (7 cols) */}
      <div className="lg:col-span-7 flex flex-col gap-4 min-h-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1 min-h-[300px] sm:min-h-[380px]">
          {/* Candidate Camera View */}
          <div className="relative rounded-xl overflow-hidden bg-black border border-[var(--glass-border)] flex items-center justify-center shadow-lg">
            {cameraEnabled ? (
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover grayscale contrast-125 brightness-90"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-[var(--text-muted)] gap-2">
                <i className="fa-solid fa-video-slash text-3xl" />
                <span className="font-mono text-[10px] uppercase tracking-wider">Camera Inactive</span>
              </div>
            )}
            <div className="absolute top-4 left-4 px-2.5 py-1 rounded bg-black/80 border border-[rgba(255,255,255,0.1)] font-mono text-[9px] uppercase tracking-widest text-white flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isListening ? 'bg-[var(--neon-emerald)] animate-pulse' : 'bg-red-500'}`} />
              Candidate Mic
            </div>
          </div>

          {/* AI Interviewer Avatar View */}
          <div className="relative rounded-xl overflow-hidden bg-[var(--bg-charcoal)] border border-[var(--glass-border)] flex flex-col items-center justify-center shadow-lg">
            <div className="flex-1 flex items-center justify-center relative w-full">
              {isSpeaking && (
                <div
                  className="absolute w-48 h-48 rounded-full speaking-ring opacity-20"
                  style={{ background: selectedColor.hex }}
                />
              )}
              <div
                className={`w-32 h-32 rounded-lg flex items-center justify-center transition-all duration-300 avatar-glow ${
                  isSpeaking ? 'scale-105' : ''
                }`}
                style={{
                  border: `1px solid ${selectedColor.hex}50`,
                  background: `${selectedColor.hex}10`,
                }}
              >
                <i className={`fa-solid ${selectedStyle.icon} text-5xl`} style={{ color: selectedColor.hex }} />
              </div>
            </div>

            <div
              className="absolute top-4 right-4 px-2.5 py-1 rounded bg-black/80 border border-[rgba(255,255,255,0.1)] font-mono text-[9px] uppercase tracking-wider flex items-center gap-1.5"
              style={{ color: selectedColor.hex }}
            >
              <i className="fa-solid fa-microchip text-xs" />
              <span>{selectedStyle.label}</span>
            </div>

            <div className="p-3 w-full border-t border-[var(--glass-border)] bg-[rgba(0,0,0,0.4)] text-center font-mono text-[9px] text-[var(--text-muted)] uppercase tracking-wider">
              AI Interviewer Engine · Adaptive Turn Logic
            </div>
          </div>
        </div>

        {/* Keyboard Shortcuts Hint Bar */}
        <div className="px-4 py-2 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[var(--glass-border)] flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)]">
          <span>Shortcuts:</span>
          <span className="flex items-center gap-3">
            <span><kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-accent)] text-white border border-[var(--glass-border)]">Space</kbd> Interrupt</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-accent)] text-white border border-[var(--glass-border)]">Esc</kbd> Leave</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-accent)] text-white border border-[var(--glass-border)]">Ctrl+E</kbd> Finish</span>
          </span>
        </div>
      </div>

      {/* Live Stream Transcript (5 cols) */}
      <div className="lg:col-span-5 flex flex-col rounded-xl overflow-hidden glass-panel border border-[var(--glass-border)] min-h-[300px]">
        <div className="p-3.5 border-b border-[var(--glass-border)] bg-[rgba(255,255,255,0.02)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-bars-staggered text-xs text-[var(--text-secondary)]"></i>
            <span className="font-mono text-xs uppercase font-bold tracking-wider text-white">
              Live Transcript
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--neon-emerald)] animate-pulse"></span>
            <span className="font-mono text-[9px] text-[var(--neon-emerald)] uppercase tracking-widest font-bold">
              Synced
            </span>
          </div>
        </div>

        <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 scroll-smooth scrollbar-hide bg-[rgba(5,7,13,0.7)] text-sm">
          {transcription.map((item, i) => (
            <div key={`${item.sender}-${i}-${item.text.slice(0, 10)}`} className="space-y-1">
              <div className="flex items-center justify-between">
                <span
                  className="font-mono text-[9px] uppercase font-bold tracking-wider flex items-center gap-1.5"
                  style={{
                    color: item.sender === 'AI' ? selectedColor.hex : 'var(--neon-emerald)',
                  }}
                >
                  <i className={item.sender === 'AI' ? 'fa-solid fa-robot' : 'fa-solid fa-user'} />
                  {item.sender === 'AI' ? selectedStyle.label : 'You (Candidate)'}
                </span>
              </div>
              <div
                className={`p-3 rounded-md text-xs sm:text-[13px] leading-relaxed font-sans ${
                  item.sender === 'AI'
                    ? 'bg-[var(--bg-accent)] text-slate-100 border border-[rgba(255,255,255,0.06)]'
                    : 'bg-[rgba(16,185,129,0.06)] text-slate-200 border border-[rgba(16,185,129,0.15)] ml-3'
                }`}
              >
                {item.text || (item.sender === 'You' ? 'Listening to speech…' : '…')}
                {item.sender === 'AI' && i === transcription.length - 1 && isProcessing && (
                  <span className="w-1.5 h-3.5 bg-[var(--neon-cyan)] inline-block ml-1 animate-pulse" />
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
