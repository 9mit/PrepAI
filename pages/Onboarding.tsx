
import React, { useState, useRef } from 'react';
import { UserProfile } from '../types';
import { extractTextFromPdf } from '../services/localParser';
import { parseResumeText } from '../services/groq';

interface OnboardingPageProps {
  user: UserProfile;
  onComplete: (user: UserProfile) => void;
}

const OnboardingPage: React.FC<OnboardingPageProps> = ({ user, onComplete }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<UserProfile>(user);
  const [resumeText, setResumeText] = useState('');
  const [useTextPaste, setUseTextPaste] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
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
      alert("Failed to read file or parse with AI. Error: " + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleResumeTextAnalysis = async () => {
    if (!resumeText.trim()) return;
    setLoading(true);
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
      alert("Failed to analyze text with AI. Please try manual entry. Error: " + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => setStep(step + 1);
  const handleBack = () => setStep(step - 1);

  const handleSubmit = () => {
    onComplete({ ...formData, onboarded: true });
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-deep)]">
      {/* Progress Indicator */}
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
        {/* Matrix dot grid is in body, add subtle focal glows */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[var(--neon-emerald)] opacity-[0.02] blur-[100px] rounded-full pointer-events-none"></div>

        <div className="max-w-4xl w-full relative z-10">
          {/* Step 1: Entry Point */}
          {step === 1 && (
            <div className="space-y-16 animate-fadeIn text-center">
              <div className="space-y-4">
                <span className="text-[10px] font-mono font-bold uppercase tracking-[0.5em] text-[var(--neon-cyan)]">init_sequence</span>
                <h2 className="text-6xl font-black tracking-tighter uppercase text-white font-mono">Profile_Setup</h2>
                <p className="font-mono text-xs uppercase tracking-widest text-[var(--text-muted)] max-w-lg mx-auto">Select a protocol to initialize your candidate intelligence matrix.</p>
              </div>

              <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
                <button
                  onClick={handleNext}
                  className="p-10 border border-[rgba(255,255,255,0.05)] bg-[var(--bg-surface)] text-left group transition-all duration-200 hover:border-[var(--neon-emerald)] hover:bg-[var(--bg-accent)]"
                >
                  <div className="mb-8 font-mono text-[10px] text-[var(--neon-emerald)] tracking-[0.3em] uppercase">01 // AI_Ingest</div>
                  <div className="w-16 h-16 border border-[rgba(255,255,255,0.05)] flex items-center justify-center mb-8 group-hover:border-[var(--neon-emerald)] group-hover:bg-[var(--neon-emerald)]/5 transition-all">
                    <i className="fa-solid fa-cloud-bolt text-3xl text-[var(--text-secondary)] group-hover:text-[var(--neon-emerald)]"></i>
                  </div>
                  <h3 className="text-xl font-bold mb-3 font-mono uppercase text-white tracking-widest">Neural_Parser</h3>
                  <p className="font-mono text-[10px] leading-relaxed text-[var(--text-muted)] uppercase tracking-tighter">Automated extraction via LLM analysis. Upload PDF or paste raw text.</p>
                </button>

                <button
                  onClick={() => setStep(3)}
                  className="p-10 border border-[rgba(255,255,255,0.05)] bg-[var(--bg-surface)] text-left group transition-all duration-200 hover:border-[var(--neon-cyan)] hover:bg-[var(--bg-accent)]"
                >
                  <div className="mb-8 font-mono text-[10px] text-[var(--neon-cyan)] tracking-[0.3em] uppercase">02 // Manual_In</div>
                  <div className="w-16 h-16 border border-[rgba(255,255,255,0.05)] flex items-center justify-center mb-8 group-hover:border-[var(--neon-cyan)] group-hover:bg-[var(--neon-cyan)]/5 transition-all">
                    <i className="fa-solid fa-keyboard text-3xl text-[var(--text-secondary)] group-hover:text-[var(--neon-cyan)]"></i>
                  </div>
                  <h3 className="text-xl font-bold mb-3 font-mono uppercase text-white tracking-widest">Manual_Matrix</h3>
                  <p className="font-mono text-[10px] leading-relaxed text-[var(--text-muted)] uppercase tracking-tighter">Direct data entry. Construct your professional identity bit by bit.</p>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Ingest Logic */}
          {step === 2 && (
            <div className="space-y-8 animate-fadeIn max-w-2xl mx-auto">
              <div className="flex items-end justify-between border-b border-[rgba(255,255,255,0.05)] pb-6">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-[0.4em] text-[var(--neon-emerald)]">Protocol: Neural_Ingest</span>
                  <h2 className="text-3xl font-black uppercase tracking-tighter text-white font-mono mt-2">Data_Source_Target</h2>
                </div>
                <button
                  onClick={() => setUseTextPaste(!useTextPaste)}
                  className="btn-secondary text-[9px] py-1.5 px-4"
                >
                  {useTextPaste ? 'System.Mode(Upload)' : 'System.Mode(Paste)'}
                </button>
              </div>

              {useTextPaste ? (
                <div className="space-y-6">
                  <textarea
                    className="w-full h-80 p-8 font-mono text-xs leading-relaxed resize-none transition-all duration-200 outline-none bg-[var(--bg-accent)] border border-[rgba(255,255,255,0.1)] text-white focus:border-[var(--neon-emerald)] focus:shadow-[var(--glow-emerald)]"
                    placeholder=">> Paste raw resume content for analysis..."
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                  />
                  <div className="flex gap-4">
                    <button onClick={handleBack} className="flex-1 font-mono text-[10px] uppercase font-bold tracking-widest text-[var(--text-muted)] hover:text-white transition-colors">Abort</button>
                    <button
                      onClick={handleResumeTextAnalysis}
                      disabled={loading}
                      className="flex-[2] btn-primary py-5 flex items-center justify-center gap-3 disabled:opacity-50"
                      style={{ background: 'var(--neon-emerald)', color: '#000' }}
                    >
                      {loading ? <i className="fa-solid fa-binary fa-spin"></i> : <i className="fa-solid fa-bolt"></i>}
                      {loading ? 'Analyzing_Payload...' : 'Analyze_Content()'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div
                    onClick={triggerFileSelect}
                    className="w-full h-80 flex flex-col items-center justify-center gap-6 cursor-pointer group transition-all duration-200 bg-[var(--bg-accent)] border border-dashed border-[rgba(255,255,255,0.1)] hover:border-[var(--neon-emerald)] hover:bg-[var(--bg-accent)]"
                  >
                    <div className="w-20 h-20 border border-[rgba(255,255,255,0.05)] flex items-center justify-center transition-all duration-200 group-hover:border-[var(--neon-emerald)] group-hover:bg-[var(--neon-emerald)]/5">
                      <i className="fa-solid fa-file-code text-3xl text-[var(--text-muted)] group-hover:text-[var(--neon-emerald)]"></i>
                    </div>
                    <div className="text-center space-y-2">
                      <p className="font-mono text-xs uppercase font-bold text-white tracking-[0.2em]">Select_Source_File</p>
                      <p className="font-mono text-[9px] uppercase text-[var(--text-muted)] tracking-tighter">PDF / IMAGE_ARRAY / TXT [MAX_ALLOC: 5MB]</p>
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".pdf,image/*" className="hidden" />
                  </div>
                  {loading && (
                    <div className="flex items-center justify-center gap-4 py-4 animate-pulse">
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--neon-emerald)]"></div>
                      <span className="font-mono uppercase tracking-[0.3em] text-[9px] text-[var(--neon-emerald)]">Executing Neural_Inference_Loop...</span>
                    </div>
                  )}
                  <button onClick={handleBack} className="w-full py-4 font-mono text-[10px] uppercase font-bold tracking-widest text-[var(--text-muted)] hover:text-white transition-colors">Cancel</button>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Matrix Review */}
          {step === 3 && (
            <div className="space-y-12 animate-fadeIn">
              <div className="text-center space-y-3">
                <span className="text-[10px] font-mono font-bold uppercase tracking-[0.4em] text-[var(--neon-cyan)]">Verification_Required</span>
                <h2 className="text-4xl font-black uppercase font-mono tracking-tighter text-white">Identity_Validation</h2>
                <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Confirm extracted data points before storage commit.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10 p-12 border border-[rgba(255,255,255,0.05)] bg-[var(--bg-surface)]">
                <div className="space-y-3">
                  <label className="label-premium">Candidate_Identifier</label>
                  <input
                    className="input-premium"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-3">
                  <label className="label-premium">Remote_Uplink (GitHub)</label>
                  <input
                    className="input-premium"
                    placeholder="github.com/host"
                    value={formData.githubUrl || ''}
                    onChange={(e) => setFormData({ ...formData, githubUrl: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2 space-y-3">
                  <label className="label-premium">Skill_Matrix (CSV)</label>
                  <input
                    className="input-premium"
                    value={formData.skills.join(', ')}
                    onChange={(e) => setFormData({ ...formData, skills: e.target.value.split(',').map(s => s.trim()) })}
                  />
                </div>
                <div className="md:col-span-2 space-y-3">
                  <label className="label-premium">Experience_Array</label>
                  <textarea
                    className="input-premium h-40 resize-none leading-relaxed"
                    value={formData.experience}
                    onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button onClick={() => setStep(1)} className="flex-1 font-mono text-[10px] uppercase font-bold tracking-[0.2em] text-[var(--text-muted)] hover:text-white transition-colors">Restart_Init</button>
                <button
                  onClick={handleSubmit}
                  className="flex-[3] btn-primary py-6"
                  style={{ background: 'var(--neon-emerald)', color: '#000' }}
                >
                  Confirm_Commit_&_Access_Dashboard
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
