import React from 'react';
import { AppRoute } from '../types';

const PrivacyPage: React.FC<{ onNavigate?: (route: AppRoute) => void }> = ({ onNavigate }) => (
  <div className="max-w-3xl mx-auto py-12 px-4 font-mono space-y-6">
    <h1 className="text-3xl font-black uppercase tracking-tighter text-white">Privacy</h1>
    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
      PrepAI is designed local-first. Profiles, interview history, quiz stats, templates, and diagnostics
      are stored in your browser (localStorage / sessionStorage). Guest API tokens are kept in sessionStorage only.
    </p>
    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
      When you practice, resume text, job descriptions, and transcripts may be sent to our backend so the
      Groq-hosted model can evaluate answers and generate coaching. We do not sell personal data. Do not upload
      secrets or highly sensitive third-party data into resumes or job descriptions.
    </p>
    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
      Diagnostics export is optional and anonymous (event names and non-PII props only). Clear browser storage
      to remove local data. Contact the project maintainer for questions about a hosted deployment you operate.
    </p>
    {onNavigate && (
      <button type="button" className="btn-secondary text-[10px] px-4 py-2" onClick={() => onNavigate(AppRoute.DASHBOARD)}>
        Back to Home
      </button>
    )}
  </div>
);

export default PrivacyPage;
