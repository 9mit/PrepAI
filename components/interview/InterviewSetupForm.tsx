import React, { useState } from 'react';
import { INTERVIEW_FIELDS, COMPANY_STYLES, INTERVIEW_MODES } from '../../constants';
import { DOMAIN_PACKS } from '../../services/domainPacks';
import { MAX_JD_CHARS } from '../../services/interviewContext';
import { SpeechPace } from '../../services/voiceUtils';
import { ChipButton } from '../ChipButton';
import {
  AVATAR_STYLES,
  AVATAR_COLORS,
  INTENSITY_MODES,
  SPEECH_PACES,
  AvatarStyle,
  AvatarColor,
  IntensityMode,
  InterviewFieldId,
  CompanyStyleId,
  InterviewModeId,
} from './interviewConstants';

export interface InterviewSetupFormProps {
  onBack: () => void;
  piperLoading: boolean;
  downloadProgress: number;
  usePiper: boolean;
  setupError: string;
  role: string;
  company: string;
  interviewField: InterviewFieldId;
  interviewMode: InterviewModeId;
  companyStyle: CompanyStyleId;
  domainPackId: string;
  speechPace: SpeechPace;
  jobDescription: string;
  useProfileResume: boolean;
  resumePaste: string;
  selectedStyle: AvatarStyle;
  selectedColor: AvatarColor;
  selectedIntensity: IntensityMode;
  githubRepos: { id: number | string; name: string }[];
  onRoleChange: (v: string) => void;
  onCompanyChange: (v: string) => void;
  onFieldChange: (v: InterviewFieldId) => void;
  onModeChange: (v: InterviewModeId, persona?: AvatarStyle) => void;
  onCompanyStyleChange: (v: CompanyStyleId) => void;
  onDomainPackChange: (v: string) => void;
  onSpeechPaceChange: (v: SpeechPace) => void;
  onJobDescriptionChange: (v: string) => void;
  onUseProfileResumeChange: (v: boolean) => void;
  onResumePasteChange: (v: string) => void;
  onStyleChange: (v: AvatarStyle) => void;
  onColorChange: (v: AvatarColor) => void;
  onIntensityChange: (v: IntensityMode) => void;
  onStart: () => void;
}

const InterviewSetupForm: React.FC<InterviewSetupFormProps> = ({
  onBack,
  piperLoading,
  downloadProgress,
  usePiper,
  setupError,
  role,
  company,
  interviewField,
  interviewMode,
  companyStyle,
  domainPackId,
  speechPace,
  jobDescription,
  useProfileResume,
  resumePaste,
  selectedStyle,
  selectedColor,
  selectedIntensity,
  githubRepos,
  onRoleChange,
  onCompanyChange,
  onFieldChange,
  onModeChange,
  onCompanyStyleChange,
  onDomainPackChange,
  onSpeechPaceChange,
  onJobDescriptionChange,
  onUseProfileResumeChange,
  onResumePasteChange,
  onStyleChange,
  onColorChange,
  onIntensityChange,
  onStart,
}) => {
  const [activeTab, setActiveTab] = useState<'basics' | 'advanced'>('basics');

  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 animate-fadeIn">
      <div className="max-w-4xl w-full p-6 sm:p-8 md:p-10 rounded-xl glass-panel relative border border-[var(--glass-border)] shadow-2xl">
        {/* Piper Voice Download Overlay */}
        {piperLoading && (
          <div className="absolute inset-0 bg-[rgba(5,7,13,0.95)] z-30 rounded-xl flex flex-col items-center justify-center p-8 backdrop-blur-md">
            <div className="w-12 h-12 border-2 border-t-[var(--neon-emerald)] border-[rgba(255,255,255,0.1)] rounded-full animate-spin mb-6" />
            <h3 className="text-sm font-mono uppercase tracking-[0.3em] text-white mb-2">Preparing Voice Synthesizer</h3>
            <p className="text-[var(--text-secondary)] font-mono text-[10px] mb-6 text-center max-w-sm">
              Downloading local neural speech engine for zero-latency audio (~50MB)…
            </p>
            <div className="w-64 h-1.5 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--neon-emerald)] transition-all duration-300"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
            <p className="font-mono text-[10px] text-[var(--neon-emerald)] mt-2 font-bold">{downloadProgress}% Complete</p>
          </div>
        )}

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-[var(--glass-border)]">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-md flex items-center justify-center transition-all duration-300 shadow-lg border"
              style={{ borderColor: selectedColor.hex, background: `${selectedColor.hex}15` }}
            >
              <i className="fa-solid fa-microphone text-xl" style={{ color: selectedColor.hex }} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white font-mono">
                  Session Setup
                </h2>
                <span className="px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-wider bg-[var(--neon-emerald)]/15 text-[var(--neon-emerald)] border border-[var(--neon-emerald)]/30">
                  {usePiper ? 'Neural Audio' : 'Web Speech'}
                </span>
              </div>
              <p className="text-xs font-mono text-[var(--text-muted)] uppercase tracking-wider mt-0.5">
                Tailor your target company, interview domain, and AI persona
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onBack}
            className="btn-secondary text-[10px] px-4 py-2 self-start sm:self-center"
          >
            ← Back to Home
          </button>
        </div>

        {/* Tabs: Quick Setup vs In-depth Context */}
        <div className="flex rounded-md p-1 bg-[rgba(255,255,255,0.03)] border border-[var(--glass-border)] mb-8">
          <button
            type="button"
            onClick={() => setActiveTab('basics')}
            className={`flex-1 py-2 font-mono text-xs uppercase font-bold tracking-wider rounded transition-all ${
              activeTab === 'basics'
                ? 'bg-[var(--bg-accent)] text-white shadow-sm border border-[rgba(255,255,255,0.1)]'
                : 'text-[var(--text-muted)] hover:text-white'
            }`}
          >
            1. Role & Format
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('advanced')}
            className={`flex-1 py-2 font-mono text-xs uppercase font-bold tracking-wider rounded transition-all ${
              activeTab === 'advanced'
                ? 'bg-[var(--bg-accent)] text-white shadow-sm border border-[rgba(255,255,255,0.1)]'
                : 'text-[var(--text-muted)] hover:text-white'
            }`}
          >
            2. Interviewer Persona & Resume
          </button>
        </div>

        {/* Tab 1: Role & Format */}
        {activeTab === 'basics' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="label-premium">Target Job Title</label>
                <input
                  className="input-premium"
                  value={role}
                  onChange={(e) => onRoleChange(e.target.value)}
                  placeholder="e.g. Senior Frontend Engineer, Product Manager, Data Scientist"
                />
              </div>

              <div className="space-y-1.5">
                <label className="label-premium">Target Company (Optional)</label>
                <input
                  className="input-premium"
                  value={company}
                  onChange={(e) => onCompanyChange(e.target.value)}
                  placeholder="e.g. Stripe, Google, Figma, Meta, or Stealth Startup"
                />
              </div>
            </div>

            {/* Field & Mode Chips */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="space-y-2">
                <label className="label-premium">Interview Field / Discipline</label>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Interview field">
                  {INTERVIEW_FIELDS.map((field) => (
                    <ChipButton
                      key={field.id}
                      label={field.label}
                      selected={interviewField === field.id}
                      onClick={() => onFieldChange(field.id)}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="label-premium">Interview Mode / Focus</label>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Interview mode">
                  {INTERVIEW_MODES.map((mode) => (
                    <ChipButton
                      key={mode.id}
                      label={mode.label}
                      selected={interviewMode === mode.id}
                      accent="emerald"
                      onClick={() => {
                        const persona = AVATAR_STYLES.find((a) => a.id === mode.softPersona);
                        onModeChange(mode.id, persona);
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Company Style & Domain Pack */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="space-y-2">
                <label className="label-premium">Company Culture Style</label>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Company style">
                  {COMPANY_STYLES.map((style) => (
                    <ChipButton
                      key={style.id}
                      label={style.label}
                      selected={companyStyle === style.id}
                      accent="orange"
                      onClick={() => onCompanyStyleChange(style.id)}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="label-premium">Curated Domain Pack</label>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1" role="group" aria-label="Domain pack">
                  {DOMAIN_PACKS.map((pack) => (
                    <ChipButton
                      key={pack.id}
                      label={pack.label}
                      selected={domainPackId === pack.id}
                      accent="emerald"
                      onClick={() => onDomainPackChange(pack.id)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Persona & Resume Context */}
        {activeTab === 'advanced' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Interviewer Persona Cards */}
            <div className="space-y-2">
              <label className="label-premium">Interviewer Persona</label>
              <div className="grid grid-cols-3 gap-3">
                {AVATAR_STYLES.map((style) => (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => onStyleChange(style)}
                    className={`p-3.5 rounded-md transition-all flex flex-col items-center justify-center gap-2 border text-center ${
                      selectedStyle.id === style.id ? 'bg-[var(--bg-accent)]' : 'bg-transparent'
                    }`}
                    style={{
                      borderColor: selectedStyle.id === style.id ? selectedColor.hex : 'var(--glass-border)',
                      color: selectedStyle.id === style.id ? selectedColor.hex : 'var(--text-secondary)',
                    }}
                  >
                    <i className={`fa-solid ${style.icon} text-lg`} />
                    <span className="font-mono text-[10px] uppercase font-bold tracking-tight">{style.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty & Speech Pace */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
              <div className="space-y-2">
                <label className="label-premium">Interview Rigor / Difficulty</label>
                <div className="flex items-center gap-2 p-1.5 rounded-md bg-[rgba(255,255,255,0.02)] border border-[var(--glass-border)]">
                  {INTENSITY_MODES.map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => onIntensityChange(mode)}
                      className={`flex-1 py-1.5 rounded font-mono text-[10px] uppercase tracking-wider transition-all ${
                        selectedIntensity.id === mode.id
                          ? 'bg-white text-black font-bold shadow-sm'
                          : 'text-[var(--text-secondary)] hover:text-white'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="label-premium">Interviewer Speech Pace</label>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Speaking pace">
                  {SPEECH_PACES.map((p) => (
                    <ChipButton
                      key={p}
                      label={p}
                      selected={speechPace === p}
                      onClick={() => onSpeechPaceChange(p)}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Accent Color Palette */}
            <div className="space-y-2 pt-2">
              <label className="label-premium">Theme Accent Color</label>
              <div className="flex flex-wrap gap-2.5" role="group" aria-label="Accent color">
                {AVATAR_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    aria-label={c.label}
                    className={`w-7 h-7 rounded-sm border transition-transform ${
                      selectedColor.id === c.id ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                    style={{ background: c.hex }}
                    onClick={() => onColorChange(c)}
                  />
                ))}
              </div>
            </div>

            {/* Job Description & Resume Context */}
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <label className="label-premium mb-0">Job Description (Optional)</label>
                  <span className="font-mono text-[9px] text-[var(--text-muted)]">
                    {jobDescription.length}/{MAX_JD_CHARS} chars
                  </span>
                </div>
                <textarea
                  className="input-premium h-24 resize-none text-xs"
                  value={jobDescription}
                  maxLength={MAX_JD_CHARS}
                  onChange={(e) => onJobDescriptionChange(e.target.value)}
                  placeholder="Paste specific job requirements to tailor questions directly to the JD…"
                  aria-label="Job description"
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2.5 font-mono text-[10px] uppercase tracking-wider text-[var(--text-secondary)] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={useProfileResume}
                    onChange={(e) => onUseProfileResumeChange(e.target.checked)}
                    className="accent-[var(--neon-emerald)] w-3.5 h-3.5"
                  />
                  <span>Use saved candidate profile & resume</span>
                </label>
              </div>

              <div className="space-y-1.5">
                <label className="label-premium">Custom Project Highlights (Optional)</label>
                <textarea
                  className="input-premium h-16 resize-none text-xs"
                  value={resumePaste}
                  onChange={(e) => onResumePasteChange(e.target.value)}
                  placeholder="Paste extra talking points or projects for the AI interviewer to probe…"
                  aria-label="Extra resume notes"
                />
              </div>
            </div>
          </div>
        )}

        {/* GitHub Context Preview */}
        {githubRepos.length > 0 && (
          <div className="mt-6 p-3 rounded bg-[var(--neon-cyan)]/5 border border-[var(--neon-cyan)]/20 flex items-center gap-3">
            <i className="fa-brands fa-github text-[var(--neon-cyan)] text-sm shrink-0"></i>
            <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--text-secondary)]">
              GitHub context active: {githubRepos.length} repos available for question referencing.
            </span>
          </div>
        )}

        {/* Setup Error Banner */}
        {setupError && (
          <div
            role="alert"
            className="mt-6 p-3.5 rounded border border-red-500/30 bg-red-500/10 text-red-400 font-mono text-[10px] uppercase tracking-wider flex items-center gap-2"
          >
            <i className="fa-solid fa-triangle-exclamation text-xs"></i>
            <span>{setupError}</span>
          </div>
        )}

        {/* Launch Button */}
        <div className="mt-8 pt-6 border-t border-[var(--glass-border)]">
          <button
            type="button"
            onClick={onStart}
            disabled={piperLoading}
            className="btn-primary w-full py-4 text-xs font-mono font-bold tracking-widest transition-all duration-300"
            style={{
              background: `linear-gradient(135deg, ${selectedColor.hex} 0%, #10B981 100%)`,
              color: '#000000',
            }}
          >
            <i className="fa-solid fa-bolt text-sm"></i>
            <span>Launch Mock Interview</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default InterviewSetupForm;
