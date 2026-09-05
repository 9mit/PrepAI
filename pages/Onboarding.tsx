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
        console.warn("Groq parsing failed, falling back to basic extraction", groqError);
        throw groqError;
      }

      setFormData(prev => ({
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
      console.error("Analysis failed", error);
      setErrorMsg("Could not read or parse that file. " + (error as Error).message);
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
      setFormData(prev => ({
        ...prev,
        name: parsedData.name || prev.name,
        skills: (parsedData.skills && Array.isArray(parsedData.skills) && parsedData.skills.length > 0) ? parsedData.skills : prev.skills,
        experience: parsedData.experience || prev.experience,
        education: parsedData.education || prev.education,
        projects: parsedData.projects || prev.projects,
        githubUrl: parsedData.githubUrl || prev.githubUrl
      }));

      setStep(3);
    } catch (error) {
      console.error("Analysis failed", error);
      setErrorMsg("Could not analyze that text. Try entering details manually. " + (error as Error).message);
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
    <div className="min-h-screen flex flex-col bg-[var(--bg-deep)]">
      <div className="w-full h-1 bg-[var(--bg-accent)]">
        <div
          className="h-full transition-all duration-700 ease-out"
          style={{
            width: `${(step / 3) * 100}%`,
            background: 'var(--neon-emerald)',
            boxShadow: 'var(--glow-emerald)'
          }}
        />
      </div>

      <div className="flex-1 flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[var(--neon-emerald)] opacity-[0.02] blur-[100px] rounded-full pointer-events-none"></div>

        <div className="max-w-4xl w-full relative z-10">
          {step === 1 && (
            <div className="space-y-16 animate-fadeIn text-center">
              <div className="space-y-4">
                <span className="text-[10px] font-mono font-bold uppercase tracking-[0.5em] text-[var(--neon-cyan)]">Step 1 of 3</span>
                <h2 className="text-6xl font-black tracking-tighter uppercase text-white font-mono">Set up your profile</h2>
                <p className="font-mono text-xs uppercase tracking-widest text-[var(--text-muted)] max-w-lg mx-auto">
                  Add a resume or enter your background so practice interviews match your goals.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
                <button
                  onClick={handleNext}
                  className="p-10 border border-[rgba(255,255,255,0.05)] bg-[var(--bg-surface)] text-left group transition-all duration-200 hover:border-[var(--neon-emerald)] hover:bg-[var(--bg-accent)]"
                >
                  <div className="mb-8 font-mono text-[10px] text-[var(--neon-emerald)] tracking-[0.3em] uppercase">01 // Resume</div>
                  <div className="w-16 h-16 border border-[rgba(255,255,255,0.05)] flex items-center justify-center mb-8 group-hover:border-[var(--neon-emerald)] group-hover:bg-[var(--neon-emerald)]/5 transition-all">
                    <i className="fa-solid fa-cloud-bolt text-3xl text-[var(--text-secondary)] group-hover:text-[var(--neon-emerald)]"></i>
                  </div>
                  <h3 className="text-xl font-bold mb-3 font-mono uppercase text-white tracking-widest">Upload resume</h3>
                  <p className="font-mono text-[10px] leading-relaxed text-[var(--text-muted)] uppercase tracking-tighter">
                    Upload a PDF or paste resume text. We will extract key details for you.
                  </p>
                </button>

                <button
                  onClick={() => setStep(3)}
                  className="p-10 border border-[rgba(255,255,255,0.05)] bg-[var(--bg-surface)] text-left group transition-all duration-200 hover:border-[var(--neon-cyan)] hover:bg-[var(--bg-accent)]"
                >
                  <div className="mb-8 font-mono text-[10px] text-[var(--neon-cyan)] tracking-[0.3em] uppercase">02 // Manual</div>
                  <div className="w-16 h-16 border border-[rgba(255,255,255,0.05)] flex items-center justify-center mb-8 group-hover:border-[var(--neon-cyan)] group-hover:bg-[var(--neon-cyan)]/5 transition-all">
                    <i className="fa-solid fa-keyboard text-3xl text-[var(--text-secondary)] group-hover:text-[var(--neon-cyan)]"></i>
                  </div>
                  <h3 className="text-xl font-bold mb-3 font-mono uppercase text-white tracking-widest">Enter manually</h3>
                  <p className="font-mono text-[10px] leading-relaxed text-[var(--text-muted)] uppercase tracking-tighter">
                    Type your name, skills, and experience yourself.
                  </p>
                </button>
              </div>

              <button
                type="button"
                onClick={onBack}
                className="font-mono text-[10px] uppercase font-bold tracking-widest text-[var(--text-muted)] hover:text-white transition-colors"
              >
                Back
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8 animate-fadeIn max-w-2xl mx-auto">
              <div className="flex items-end justify-between border-b border-[rgba(255,255,255,0.05)] pb-6">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-[0.4em] text-[var(--neon-emerald)]">Step 2 of 3</span>
                  <h2 className="text-3xl font-black uppercase tracking-tighter text-white font-mono mt-2">Add your resume</h2>
                </div>
                <button
                  onClick={() => setUseTextPaste(!useTextPaste)}
                  className="btn-secondary text-[9px] py-1.5 px-4"
                >
                  {useTextPaste ? 'Switch to upload' : 'Paste text instead'}
                </button>
              </div>

              {errorMsg && (
                <div role="alert" className="p-4 border border-red-500/30 bg-red-500/5 text-red-400 font-mono text-[10px] uppercase tracking-widest">
                  {errorMsg}
                </div>
              )}

              {useTextPaste ? (
                <div className="space-y-6">
                  <textarea
                    className="input-premium h-64 resize-none"
                    placeholder="Paste your resume text here…"
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                  />
                  <button
                    onClick={handleResumeTextAnalysis}
                    disabled={loading || !resumeText.trim()}
                    className="btn-primary w-full py-5 disabled:opacity-40"
                    style={{ background: 'var(--neon-emerald)', color: '#000' }}
                  >
                    {loading ? 'Analyzing…' : 'Analyze resume'}
                  </button>
                  <button onClick={handleBack} className="w-full py-4 font-mono text-[10px] uppercase font-bold tracking-widest text-[var(--text-muted)] hover:text-white transition-colors">Back</button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div
                    onClick={triggerFileSelect}
                    className="border border-dashed border-[rgba(255,255,255,0.1)] p-16 text-center cursor-pointer hover:border-[var(--neon-emerald)] transition-colors bg-[var(--bg-surface)]"
                  >
                    <div className="flex flex-col items-center gap-4">
                      <i className="fa-solid fa-file-arrow-up text-3xl text-[var(--text-muted)]"></i>
                      <p className="font-mono text-xs uppercase tracking-widest text-white">Drop PDF or click to upload</p>
                      <p className="font-mono text-[9px] text-[var(--text-muted)] uppercase">PDF preferred</p>
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".pdf,image/*" className="hidden" />
                  </div>
                  {loading && (
                    <div className="flex items-center justify-center gap-4 py-4 animate-pulse">
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--neon-emerald)]"></div>
                      <span className="font-mono uppercase tracking-[0.3em] text-[9px] text-[var(--neon-emerald)]">Reading resume…</span>
                    </div>
                  )}
                  <button onClick={handleBack} className="w-full py-4 font-mono text-[10px] uppercase font-bold tracking-widest text-[var(--text-muted)] hover:text-white transition-colors">Back</button>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-12 animate-fadeIn">
              <div className="text-center space-y-3">
                <span className="text-[10px] font-mono font-bold uppercase tracking-[0.4em] text-[var(--neon-cyan)]">Step 3 of 3</span>
                <h2 className="text-4xl font-black uppercase font-mono tracking-tighter text-white">Confirm your details</h2>
                <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Review and edit before continuing.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10 p-12 border border-[rgba(255,255,255,0.05)] bg-[var(--bg-surface)]">
                <div className="space-y-3">
                  <label className="label-premium">Full name</label>
                  <input
                    className="input-premium"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-3">
                  <label className="label-premium">GitHub (optional)</label>
                  <input
                    className="input-premium"
                    placeholder="github.com/username"
                    value={formData.githubUrl || ''}
                    onChange={(e) => setFormData({ ...formData, githubUrl: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2 space-y-3">
                  <label className="label-premium">Skills (comma-separated)</label>
                  <input
                    className="input-premium"
                    value={formData.skills.join(', ')}
                    onChange={(e) => setFormData({ ...formData, skills: e.target.value.split(',').map(s => s.trim()) })}
                  />
                </div>
                <div className="md:col-span-2 space-y-3">
                  <label className="label-premium">Experience</label>
                  <textarea
                    className="input-premium h-40 resize-none leading-relaxed"
                    value={formData.experience}
                    onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button onClick={() => setStep(1)} className="flex-1 font-mono text-[10px] uppercase font-bold tracking-[0.2em] text-[var(--text-muted)] hover:text-white transition-colors">Back</button>
                <button
                  onClick={handleSubmit}
                  className="flex-[3] btn-primary py-6"
                  style={{ background: 'var(--neon-emerald)', color: '#000' }}
                >
                  Save and continue
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
