import React, { useState, useRef } from 'react';
import { UserProfile } from '../types';
import { extractTextFromPdf } from '../services/localParser';
import { parseResumeText } from '../services/groq';
import { MAX_RESUME_FILE_BYTES } from '../services/sanitize';

interface OnboardingPageProps {
  user: UserProfile;
  onComplete: (user: UserProfile) => void;
  onBack: () => void;
}

const OnboardingPage: React.FC<OnboardingPageProps> = ({ user, onComplete, onBack }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<UserProfile>(user);
  const [resumeText, setResumeText] = useState('');
  const [useTextPaste, setUseTextPaste] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_RESUME_FILE_BYTES) {
      setErrorMsg('Resume file must be 5MB or smaller.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      let text = '';
      if (file.type === 'application/pdf') {
        text = await extractTextFromPdf(file);
      } else {
        text = await file.text();
      }

      let parsedData;
      try {
        parsedData = await parseResumeText(text);
      } catch (groqError) {
        console.warn('Groq parsing failed, falling back to basic extraction', groqError);
        throw groqError;
      }

      setFormData((prev) => ({
        ...prev,
        name: parsedData.name || prev.name,
        skills: parsedData.skills?.length > 0 ? parsedData.skills : prev.skills,
        experience: parsedData.experience || prev.experience,
        education: parsedData.education || prev.education,
        projects: parsedData.projects || prev.projects,
        githubUrl: parsedData.githubUrl || prev.githubUrl,
      }));

      setStep(3);
    } catch (error) {
      console.error('Analysis failed', error);
      setErrorMsg('Could not parse resume automatically. ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleResumeTextAnalysis = async () => {
    if (!resumeText.trim()) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const parsedData = await parseResumeText(resumeText);
      setFormData((prev) => ({
        ...prev,
        name: parsedData.name || prev.name,
        skills:
          parsedData.skills && Array.isArray(parsedData.skills) && parsedData.skills.length > 0
            ? parsedData.skills
            : prev.skills,
        experience: parsedData.experience || prev.experience,
        education: parsedData.education || prev.education,
        projects: parsedData.projects || prev.projects,
        githubUrl: parsedData.githubUrl || prev.githubUrl,
      }));

      setStep(3);
    } catch (error) {
      console.error('Analysis failed', error);
      setErrorMsg('Could not parse text. Enter details manually on Step 3. ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => setStep(step + 1);
  const handleBack = () => {
    if (step === 1) {
      onBack();
      return;
    }
    setStep(step - 1);
  };

  const handleSubmit = () => {
    onComplete({ ...formData, onboarded: true });
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-deep)] font-mono">
      {/* Top Stepper Bar */}
      <div className="w-full h-1.5 bg-[var(--bg-accent)]">
        <div
          className="h-full transition-all duration-500 ease-out"
          style={{
            width: `${(step / 3) * 100}%`,
            background: 'linear-gradient(90deg, var(--neon-cyan), var(--neon-emerald))',
            boxShadow: 'var(--glow-emerald)',
          }}
        />
      </div>

      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-10 relative overflow-hidden">
        {/* Ambient Glows */}
        <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] bg-[var(--neon-emerald)] opacity-[0.03] blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[var(--neon-cyan)] opacity-[0.03] blur-[120px] rounded-full pointer-events-none"></div>

        <div className="max-w-3xl w-full relative z-10">
          {/* STEP 1: Method Selection */}
          {step === 1 && (
            <div className="space-y-8 animate-fadeIn text-center">
              <div className="space-y-3">
                <span className="saas-pill">Step 1 of 3 · Setup Method</span>
                <h2 className="text-3xl sm:text-5xl font-black tracking-tight uppercase text-white font-mono">
                  Personalize Your Coach
                </h2>
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider max-w-md mx-auto leading-relaxed">
                  Provide your background so the AI interviewer asks role-specific questions tailored to your experience.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto pt-4 text-left">
                {/* Option 1: Resume Upload */}
                <button
                  type="button"
                  onClick={handleNext}
                  className="glass-panel p-6 sm:p-8 rounded-xl border border-[var(--glass-border)] hover:border-[var(--neon-emerald)] transition-all group hover:-translate-y-1"
                >
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-[10px] text-[var(--neon-emerald)] uppercase tracking-wider font-bold">
                      Recommended
                    </span>
                    <i className="fa-solid fa-cloud-arrow-up text-lg text-[var(--text-secondary)] group-hover:text-[var(--neon-emerald)] transition-colors"></i>
                  </div>
                  <h3 className="text-lg font-bold text-white uppercase tracking-wider mb-2 font-mono">
                    Upload Resume
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] font-mono leading-relaxed">
                    Auto-extract your skills, previous roles, and project highlights from a PDF or text paste.
                  </p>
                </button>

                {/* Option 2: Manual Profile */}
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="glass-panel p-6 sm:p-8 rounded-xl border border-[var(--glass-border)] hover:border-[var(--neon-cyan)] transition-all group hover:-translate-y-1"
                >
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-[10px] text-[var(--neon-cyan)] uppercase tracking-wider font-bold">
                      Manual Entry
                    </span>
                    <i className="fa-solid fa-keyboard text-lg text-[var(--text-secondary)] group-hover:text-[var(--neon-cyan)] transition-colors"></i>
                  </div>
                  <h3 className="text-lg font-bold text-white uppercase tracking-wider mb-2 font-mono">
                    Enter Manually
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] font-mono leading-relaxed">
                    Type your target role, primary technical skills, and career focus directly into form fields.
                  </p>
                </button>
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={onBack}
                  className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-muted)] hover:text-white transition-colors"
                >
                  ← Sign Out
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Resume Input */}
          {step === 2 && (
            <div className="glass-panel p-6 sm:p-8 rounded-xl border border-[var(--glass-border)] space-y-6 animate-fadeIn max-w-xl mx-auto">
              <div className="flex items-center justify-between pb-4 border-b border-[var(--glass-border)]">
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-[var(--neon-emerald)] font-bold">
                    Step 2 of 3 · Resume Input
                  </span>
                  <h3 className="text-xl font-bold uppercase tracking-tight text-white font-mono mt-0.5">
                    Import Your Resume
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setUseTextPaste(!useTextPaste)}
                  className="btn-secondary text-[9px] py-1.5 px-3"
                >
                  {useTextPaste ? 'Upload File' : 'Paste Text'}
                </button>
              </div>

              {errorMsg && (
                <div role="alert" className="p-3 rounded border border-red-500/30 bg-red-500/10 text-red-400 text-xs">
                  {errorMsg}
                </div>
              )}

              {useTextPaste ? (
                <div className="space-y-4">
                  <textarea
                    className="input-premium h-56 resize-none text-xs leading-relaxed"
                    placeholder="Paste resume content here (roles, education, skills, projects)…"
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={handleResumeTextAnalysis}
                    disabled={loading || !resumeText.trim()}
                    className="btn-primary w-full py-3.5 text-xs font-mono font-bold tracking-wider disabled:opacity-40"
                  >
                    {loading ? 'Analyzing Resume Content…' : 'Extract & Continue →'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div
                    onClick={triggerFileSelect}
                    className="border-2 border-dashed border-[var(--glass-border)] rounded-xl p-10 text-center cursor-pointer hover:border-[var(--neon-emerald)] transition-all bg-[rgba(255,255,255,0.01)] hover:bg-[rgba(16,185,129,0.03)]"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-full border border-[var(--glass-border)] flex items-center justify-center text-[var(--neon-emerald)]">
                        <i className="fa-solid fa-file-pdf text-xl"></i>
                      </div>
                      <p className="text-xs uppercase tracking-wider text-white font-bold">
                        Drop your PDF resume here or click to browse
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
                        PDF format up to 5MB supported
                      </p>
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept=".pdf,text/plain"
                      className="hidden"
                    />
                  </div>

                  {loading && (
                    <div className="flex items-center justify-center gap-3 py-2 text-[var(--neon-emerald)] text-xs animate-pulse">
                      <i className="fa-solid fa-circle-notch animate-spin"></i>
                      <span className="uppercase tracking-wider text-[10px] font-bold">
                        Parsing resume structures…
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-[var(--glass-border)]">
                <button
                  type="button"
                  onClick={handleBack}
                  className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-muted)] hover:text-white"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="text-[10px] uppercase font-bold tracking-wider text-[var(--neon-cyan)] hover:underline"
                >
                  Skip to Manual Entry →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Confirm Profile Details */}
          {step === 3 && (
            <div className="glass-panel p-6 sm:p-8 rounded-xl border border-[var(--glass-border)] space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between pb-4 border-b border-[var(--glass-border)]">
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-[var(--neon-cyan)] font-bold">
                    Step 3 of 3 · Profile Review
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white font-mono mt-0.5">
                    Confirm Candidate Profile
                  </h3>
                </div>
                <span className="saas-pill">Local Save</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="label-premium">Candidate Full Name</label>
                  <input
                    className="input-premium text-xs"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="label-premium">GitHub Username / URL (Optional)</label>
                  <input
                    className="input-premium text-xs"
                    placeholder="github.com/username"
                    value={formData.githubUrl || ''}
                    onChange={(e) => setFormData({ ...formData, githubUrl: e.target.value })}
                  />
                </div>

                <div className="md:col-span-2 space-y-1.5">
                  <label className="label-premium">Core Skills (Comma separated)</label>
                  <input
                    className="input-premium text-xs"
                    value={formData.skills.join(', ')}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        skills: e.target.value
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </div>

                <div className="md:col-span-2 space-y-1.5">
                  <label className="label-premium">Experience & Background Highlights</label>
                  <textarea
                    className="input-premium h-28 resize-none text-xs leading-relaxed"
                    value={formData.experience}
                    onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                    placeholder="Key companies, roles, and technical accomplishments…"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[var(--glass-border)] gap-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn-secondary py-3 px-5 text-xs font-mono tracking-wider"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="btn-primary py-3 px-7 text-xs font-mono font-bold tracking-wider"
                >
                  Save Profile & Go to Dashboard →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
