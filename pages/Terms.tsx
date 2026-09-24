import React from 'react';
import { AppRoute } from '../types';

const TermsPage: React.FC<{ onNavigate?: (route: AppRoute) => void }> = ({ onNavigate }) => (
  <div className="max-w-3xl mx-auto py-12 px-4 font-mono space-y-6">
    <h1 className="text-3xl font-black uppercase tracking-tighter text-white">Terms of use</h1>
    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
      PrepAI is a practice tool. AI feedback is educational and may be incorrect. It is not employment advice,
      legal advice, or a guarantee of interview outcomes.
    </p>
    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
      You are responsible for content you paste (resumes, job descriptions). Do not attempt to abuse the API,
      reverse-engineer secrets, or use the service to harm others. The service may rate-limit or refuse requests.
    </p>
    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
      The software is provided as-is without warranty. Operators of a public deployment may update these terms.
    </p>
    {onNavigate && (
      <button type="button" className="btn-secondary text-[10px] px-4 py-2" onClick={() => onNavigate(AppRoute.DASHBOARD)}>
        Back to Home
      </button>
    )}
  </div>
);

export default TermsPage;
