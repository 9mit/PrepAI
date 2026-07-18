import React from 'react';
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
}) => (
  <div className="flex-1 flex items-center justify-center p-6 animate-fadeIn">
    <div className="max-w-4xl w-full p-8 md:p-12 rounded-lg glass-panel relative border border-[var(--glass-border)] shadow-2xl">
      {piperLoading && (
        <div className="absolute inset-0 bg-[rgba(0,0,0,0.95)] z-20 rounded-lg flex flex-col items-center justify-center p-8 backdrop-blur-md">
          <div className="w-12 h-12 border-2 border-t-[var(--neon-emerald)] border-[rgba(255,255,255,0.1)] animate-spin mb-6" />
          <h3 className="text-sm font-mono uppercase tracking-[0.3em] text-white mb-2">Preparing voice</h3>
          <p className="text-[var(--text-secondary)] font-mono text-[10px] mb-6 text-center max-w-sm">
            Downloading voice model (~50MB)…
          </p>
          <div className="w-64 h-1 bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden">
            <div className="h-full bg-[var(--neon-emerald)] transition-all duration-300" style={{ width: `${downloadProgress}%` }} />
          </div>
          <p className="font-mono text-[10px] text-[var(--neon-emerald)] mt-2">{downloadProgress}%</p>
        </div>
      )}

      <div className="flex items-center justify-between gap-6 mb-12 pb-8 border-b border-[rgba(255,255,255,0.05)]">
        <div className="flex items-center gap-6">
          <div
            className="w-16 h-16 rounded-sm flex items-center justify-center transition-all duration-500 shadow-2xl border"
            style={{ borderColor: selectedColor.hex, background: `${selectedColor.hex}10` }}
          >
            <i className="fa-solid fa-terminal text-2xl" style={{ color: selectedColor.hex }} />
          </div>
          <div>
            <h2 className="text-4xl font-black uppercase tracking-tighter text-white font-mono">Interview setup</h2>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-xs font-mono text-[var(--text-secondary)] uppercase tracking-widest">
                {company.trim() || 'Your target company'}
              </p>
              {usePiper && (
                <span className="status-badge bg-[var(--neon-emerald)]/10 text-[var(--neon-emerald)] border border-[var(--neon-emerald)]/30">
                  Voice ready
                </span>
              )}
            </div>
          </div>
        </div>
        <button type="button" onClick={onBack} className="btn-secondary text-[10px] px-6 py-3 shrink-0">
          Back
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
        <div className="space-y-8">
          <div>
            <label className="label-premium">Job title</label>
            <input
              className="input-premium"
              value={role}
              onChange={(e) => onRoleChange(e.target.value)}
              placeholder="e.g. Marketing Manager, MBA Finance, HR Business Partner"
            />
          </div>
          <div>
            <label className="label-premium">Company</label>
            <input
              className="input-premium"
              value={company}
              onChange={(e) => onCompanyChange(e.target.value)}
              placeholder="Your target company"
            />
          </div>
          <div>
            <label className="label-premium">Interview field</label>
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
          <div>
            <label className="label-premium">Interview mode</label>
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
          <div>
            <label className="label-premium">Company style</label>
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
          <div>
            <label className="label-premium">Domain pack</label>
            <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto" role="group" aria-label="Domain pack">
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
          <div>
            <label className="label-premium">Speaking pace</label>
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

        <div className="space-y-8">
          <div>
            <label className="label-premium">Interviewer style</label>
            <div className="grid grid-cols-3 gap-4">
              {AVATAR_STYLES.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => onStyleChange(style)}
                  className={`p-4 rounded-md transition-all duration-200 flex flex-col items-center justify-center gap-2 border focus:outline-none focus:ring-1 focus:ring-[var(--neon-cyan)] ${
                    selectedStyle.id === style.id ? 'bg-[var(--bg-accent)]' : 'bg-transparent'
                  }`}
                  style={{
                    borderColor: selectedStyle.id === style.id ? selectedColor.hex : 'rgba(255,255,255,0.05)',
                    color: selectedStyle.id === style.id ? selectedColor.hex : 'var(--text-secondary)',
                  }}
                >
                  <i className={`fa-solid ${style.icon} text-xl`} />
                  <span className="font-mono text-[9px] uppercase font-bold tracking-tighter">{style.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label-premium">Difficulty</label>
            <div className="flex items-center justify-between p-4 rounded-md bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]">
              {INTENSITY_MODES.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => onIntensityChange(mode)}
                  className={`px-4 py-2 rounded font-mono text-[10px] uppercase tracking-widest transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-white ${
                    selectedIntensity.id === mode.id
                      ? 'bg-white text-black font-bold'
                      : 'text-[var(--text-secondary)] hover:text-white'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Accent color">
            {AVATAR_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-label={c.label}
                className={`w-8 h-8 rounded-sm border focus:outline-none focus:ring-1 focus:ring-white ${
                  selectedColor.id === c.id ? 'border-white' : 'border-transparent'
                }`}
                style={{ background: c.hex }}
                onClick={() => onColorChange(c)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-6 mb-10">
        <div>
          <label className="label-premium">Job description (optional)</label>
          <textarea
            className="input-premium h-28 resize-none"
            value={jobDescription}
            maxLength={MAX_JD_CHARS}
            onChange={(e) => onJobDescriptionChange(e.target.value)}
            placeholder="Paste the job description to tailor questions…"
            aria-label="Job description"
          />
        </div>
        <label className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-[var(--text-secondary)] cursor-pointer">
          <input
            type="checkbox"
            checked={useProfileResume}
            onChange={(e) => onUseProfileResumeChange(e.target.checked)}
            className="accent-[var(--neon-emerald)]"
          />
          Use profile resume
        </label>
        <div>
          <label className="label-premium">Extra resume notes (optional)</label>
          <textarea
            className="input-premium h-20 resize-none"
            value={resumePaste}
            onChange={(e) => onResumePasteChange(e.target.value)}
            placeholder="Paste extra project highlights if needed…"
            aria-label="Extra resume notes"
          />
        </div>
      </div>

      {setupError && (
        <div
          role="alert"
          className="mb-6 p-4 border border-red-500/30 bg-red-500/5 text-red-400 font-mono text-[10px] uppercase tracking-widest"
        >
          {setupError}
        </div>
      )}

      {githubRepos.length > 0 && (
        <div className="mb-8 p-4 rounded bg-[var(--neon-cyan)]/5 border border-[var(--neon-cyan)]/20">
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--neon-cyan)] mb-2">
            GitHub context: {githubRepos.length} repositories
          </p>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {githubRepos.map((repo) => (
              <span
                key={repo.id}
                className="px-2 py-1 bg-black/40 border border-[rgba(255,255,255,0.1)] text-[var(--text-muted)] text-[8px] font-mono whitespace-nowrap"
              >
                {repo.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onStart}
        disabled={piperLoading}
        className="btn-primary w-full py-6 text-lg tracking-[0.2em]"
        style={{ background: selectedColor.hex, color: '#000' }}
      >
        Start interview
      </button>
    </div>
  </div>
);

export default InterviewSetupForm;
