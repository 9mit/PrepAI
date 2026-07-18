
import React, { useState, useEffect } from 'react';
import { UserProfile, FeedbackSubmission } from '../types';
import { apiFetch } from '../services/apiClient';
import { ROADMAP_CHANGELOG } from '../constants';
import {
  listTemplates,
  saveTemplate,
  deleteTemplate,
  listSeats,
  upsertSeat,
  downloadSeatsCsv,
  InterviewTemplate,
  PracticeSeat,
} from '../services/templates';
import { dismissTour, isTourDone } from '../components/OnboardingTour';
import { writeInterviewPrefill } from '../services/interviewContext';
import {
  getTelemetryAggregates,
  downloadTelemetry,
  clearTelemetry,
} from '../services/telemetry';
import { track } from '../services/telemetry';

import { motion } from 'framer-motion';

interface ProfilePageProps {
    user: UserProfile;
    onUpdateUser: (user: UserProfile) => void;
}

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
        y: 0,
        opacity: 1,
        transition: {
            type: "spring",
            stiffness: 100
        }
    }
};

const ProfilePage: React.FC<ProfilePageProps> = ({ user, onUpdateUser }) => {
    const [formData, setFormData] = useState<UserProfile>(user);
    const [isEditing, setIsEditing] = useState(false);
    const [completion, setCompletion] = useState(0);
    const [fbType, setFbType] = useState<FeedbackSubmission['type']>('idea');
    const [fbMessage, setFbMessage] = useState('');
    const [fbRating, setFbRating] = useState(4);
    const [fbStatus, setFbStatus] = useState('');
    const [fbSending, setFbSending] = useState(false);
    const [templates, setTemplates] = useState<InterviewTemplate[]>(() => listTemplates());
    const [templateName, setTemplateName] = useState('');
    const [seats, setSeats] = useState<PracticeSeat[]>(() => listSeats());
    const [seatName, setSeatName] = useState('');
    const [tourDone, setTourDone] = useState(isTourDone());

    const safeGithubUrl = (url: string | undefined): string => {
        if (!url) return '#';
        const trimmed = url.trim();
        try {
            const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
            const parsed = new URL(withProto);
            if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return '#';
            if (!/(^|\.)github\.com$/i.test(parsed.hostname)) return '#';
            return parsed.toString();
        } catch {
            return '#';
        }
    };

    useEffect(() => {
        const fields: (keyof UserProfile)[] = [
            'name', 'email', 'skills', 'experience', 'education', 'projects', 'githubUrl', 'age', 'bio'
        ];
        let filled = 0;
        fields.forEach((field) => {
            const val = user[field];
            if (Array.isArray(val) ? val.length > 0 : !!val) {
                filled++;
            }
        });
        setCompletion(Math.round((filled / fields.length) * 100));
    }, [user]);

    useEffect(() => {
        setFormData(user);
    }, [user]);

    const handleSave = () => {
        onUpdateUser(formData);
        setIsEditing(false);
    };

    const handleFeedbackSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!fbMessage.trim()) {
            setFbStatus('Please enter a message.');
            return;
        }
        setFbSending(true);
        setFbStatus('');
        const entry: FeedbackSubmission = {
            id: `fb-${Date.now()}`,
            type: fbType,
            message: fbMessage.trim(),
            rating: fbType === 'rating' ? fbRating : undefined,
            createdAt: new Date().toISOString(),
        };
        try {
            const existing = JSON.parse(localStorage.getItem('prepai_feedback') || '[]') as FeedbackSubmission[];
            localStorage.setItem('prepai_feedback', JSON.stringify([entry, ...existing].slice(0, 50)));
            try {
                await apiFetch('/feedback', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: entry.type,
                        message: entry.message,
                        rating: entry.rating ?? null,
                    }),
                });
            } catch {
                // Local save is enough if API offline
            }
            setFbMessage('');
            setFbStatus('Thanks — your feedback was saved.');
        } catch {
            setFbStatus('Could not save feedback. Try again.');
        } finally {
            setFbSending(false);
        }
    };


    return (
        <motion.div
            className="max-w-5xl mx-auto space-y-8 pb-20"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >

            {/* Header & Completion Banner */}
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-bold font-display text-white mb-2">My Profile</h1>
                    <p className="text-[var(--slate-400)]">Manage your professional identity.</p>
                </div>
                {!isEditing && (
                    <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="px-6 py-3 rounded-xl bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.2)] text-[var(--gold-primary)] font-bold uppercase tracking-widest hover:bg-[rgba(212,175,55,0.2)] transition-all"
                    >
                        <i className="fa-solid fa-pen-to-square mr-2"></i> Edit Profile
                    </button>
                )}
            </motion.div>

            {completion < 100 && (
                <motion.div variants={itemVariants} className="p-6 rounded-3xl bg-gradient-to-r from-[rgba(10,22,40,0.8)] to-[rgba(15,29,50,0.8)] border border-[var(--gold-primary)] relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[radial-gradient(circle,rgba(212,175,55,0.15)_0%,transparent_70%)] blur-3xl group-hover:opacity-75 transition-opacity"></div>
                    <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <div className="relative w-16 h-16">
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                    <path className="text-[rgba(255,255,255,0.1)]" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                                    <path className="text-[var(--gold-primary)] transition-all duration-1000 ease-out" strokeDasharray={`${completion}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                                </svg>
                                <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs font-bold text-white">{completion}%</span>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white mb-1">Complete your profile</h3>
                                <p className="text-sm text-[var(--slate-400)]">Add missing details to unlock full AI potential.</p>
                            </div>
                        </div>
                        {!isEditing && (
                            <button onClick={() => setIsEditing(true)} className="text-sm font-bold text-[var(--gold-primary)] hover:underline">Complete Now</button>
                        )}
                    </div>
                </motion.div>
            )}

            {/* Main Form */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Col: Avatar & Bio */}
                <motion.div variants={itemVariants} className="lg:col-span-1 space-y-6">
                    <div className="p-8 rounded-[2.5rem] glass-card text-center relative overflow-hidden">
                        <div className="w-32 h-32 rounded-full mx-auto mb-6 bg-gradient-to-br from-[var(--gold-primary)] to-[var(--rose-rich)] p-1 shadow-2xl">
                            <div className="w-full h-full rounded-full bg-[var(--navy-surface)] flex items-center justify-center text-4xl font-bold font-display text-white">
                                {user.name.slice(0, 2).toUpperCase()}
                            </div>
                        </div>
                        <h2 className="text-xl font-bold text-white mb-1">{user.name}</h2>
                        <p className="text-xs font-bold uppercase tracking-widest text-[var(--gold-primary)] mb-6">{user.email}</p>

                        <div className="space-y-4 text-left">
                            <div>
                                <label className="text-[10px] uppercase font-bold text-[var(--slate-500)] tracking-widest mb-1 block">Bio</label>
                                {isEditing ? (
                                    <textarea
                                        className="w-full bg-[rgba(10,22,40,0.5)] border border-[rgba(255,255,255,0.1)] rounded-xl p-3 text-sm text-white focus:border-[var(--gold-primary)] outline-none min-h-[100px] resize-none"
                                        value={formData.bio || ''}
                                        onChange={e => setFormData({ ...formData, bio: e.target.value })}
                                        placeholder="Tell us about yourself..."
                                    />
                                ) : (
                                    <p className="text-sm text-[var(--slate-300)] leading-relaxed italic">{formData.bio || 'No bio added yet.'}</p>
                                )}
                            </div>

                            <div>
                                <label className="text-[10px] uppercase font-bold text-[var(--slate-500)] tracking-widest mb-1 block">Age</label>
                                {isEditing ? (
                                    <input
                                        type="number"
                                        className="w-full bg-[rgba(10,22,40,0.5)] border border-[rgba(255,255,255,0.1)] rounded-xl p-3 text-sm text-white focus:border-[var(--gold-primary)] outline-none"
                                        value={formData.age || ''}
                                        onChange={e => setFormData({ ...formData, age: parseInt(e.target.value) || 0 })}
                                        placeholder="Ex: 25"
                                    />
                                ) : (
                                    <p className="text-sm text-[var(--slate-300)]">{formData.age ? `${formData.age} years old` : 'Not specified'}</p>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Right Col: Details */}
                <div className="lg:col-span-2 space-y-6">
                    <motion.div variants={itemVariants} className="p-8 rounded-[2.5rem] glass-card space-y-8">
                        <div className="flex items-center gap-4 border-b border-[rgba(255,255,255,0.05)] pb-4 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-[rgba(212,175,55,0.1)] flex items-center justify-center text-[var(--gold-primary)]">
                                <i className="fa-solid fa-briefcase"></i>
                            </div>
                            <h3 className="text-xl font-bold font-display text-white">Experience & Skills</h3>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="label-premium">Core Skills</label>
                                {isEditing ? (
                                    <input
                                        className="input-premium"
                                        value={formData.skills.join(', ')}
                                        onChange={e => setFormData({ ...formData, skills: e.target.value.split(',').map(s => s.trim()) })}
                                    />
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {formData.skills.map((skill, i) => (
                                            <span key={i} className="px-3 py-1.5 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-xs font-bold text-[var(--pearl)]">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <label className="label-premium">Current Role / Experience</label>
                                    {isEditing ? (
                                        <textarea
                                            className="input-premium h-32 resize-none"
                                            value={formData.experience}
                                            onChange={e => setFormData({ ...formData, experience: e.target.value })}
                                        />
                                    ) : (
                                        <p className="text-sm text-[var(--slate-300)] leading-relaxed">{formData.experience}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="label-premium">Education</label>
                                    {isEditing ? (
                                        <textarea
                                            className="input-premium h-32 resize-none"
                                            value={formData.education}
                                            onChange={e => setFormData({ ...formData, education: e.target.value })}
                                        />
                                    ) : (
                                        <p className="text-sm text-[var(--slate-300)] leading-relaxed">{formData.education}</p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="label-premium">Certifications</label>
                                {isEditing ? (
                                    <input
                                        className="input-premium"
                                        value={formData.certifications ? formData.certifications.join(', ') : ''}
                                        onChange={e => setFormData({ ...formData, certifications: e.target.value.split(',').map(s => s.trim()) })}
                                        placeholder="AWS Certified, Google Cloud Pro..."
                                    />
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {formData.certifications && formData.certifications.length > 0 ? formData.certifications.map((cert, i) => (
                                            <span key={i} className="px-3 py-1.5 rounded-lg bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.2)] text-xs font-bold text-emerald-400 flex items-center gap-2">
                                                <i className="fa-solid fa-certificate"></i>
                                                {cert}
                                            </span>
                                        )) : <span className="text-sm text-[var(--slate-500)]">No certifications listed</span>}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="label-premium">GitHub URL</label>
                                {isEditing ? (
                                    <div className="relative">
                                        <i className="fa-brands fa-github absolute left-4 top-1/2 -translate-y-1/2 text-[var(--slate-400)]"></i>
                                        <input
                                            className="input-premium pl-10"
                                            value={formData.githubUrl || ''}
                                            onChange={e => setFormData({ ...formData, githubUrl: e.target.value })}
                                            placeholder="https://github.com/username"
                                        />
                                    </div>
                                ) : (
                                    <a
                                        href={safeGithubUrl(formData.githubUrl)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-[var(--gold-primary)] hover:underline flex items-center gap-2"
                                    >
                                        <i className="fa-brands fa-github"></i> {formData.githubUrl || 'Not linked'}
                                    </a>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {isEditing && (
                <div className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 z-40 animate-slideUp">
                    <div className="glass-panel p-2 rounded-2xl flex gap-3 shadow-2xl">
                        <button
                            type="button"
                            onClick={() => { setFormData(user); setIsEditing(false); }}
                            className="px-6 py-3 rounded-xl font-bold text-[var(--slate-300)] hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            className="px-8 py-3 rounded-xl bg-gradient-to-r from-[var(--gold-primary)] to-[var(--gold-dark)] text-[var(--navy-deep)] font-bold shadow-lg transform hover:-translate-y-1 transition-all"
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            )}

            <motion.section variants={itemVariants} className="glass-panel p-6 sm:p-8 border border-[rgba(255,255,255,0.05)] space-y-6 font-mono">
                <h2 className="text-sm font-bold uppercase tracking-[0.3em] text-white">Diagnostics</h2>
                <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
                    Local anonymous telemetry — no transcripts or PII
                </p>
                {(() => {
                    const agg = getTelemetryAggregates();
                    return (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[10px]">
                            <div className="p-3 border border-[rgba(255,255,255,0.05)]">
                                <p className="text-[var(--text-muted)]">Starts</p>
                                <p className="text-white text-lg">{agg.interviewStarts}</p>
                            </div>
                            <div className="p-3 border border-[rgba(255,255,255,0.05)]">
                                <p className="text-[var(--text-muted)]">Completion</p>
                                <p className="text-white text-lg">{agg.completionRate}%</p>
                            </div>
                            <div className="p-3 border border-[rgba(255,255,255,0.05)]">
                                <p className="text-[var(--text-muted)]">Leaves</p>
                                <p className="text-white text-lg">{agg.interviewLeaves}</p>
                            </div>
                            <div className="p-3 border border-[rgba(255,255,255,0.05)]">
                                <p className="text-[var(--text-muted)]">Avg API ms</p>
                                <p className="text-white text-lg">{agg.avgLatencyMs ?? '—'}</p>
                            </div>
                        </div>
                    );
                })()}
                <div className="flex flex-wrap gap-3">
                    <button
                        type="button"
                        className="btn-secondary text-[9px] px-3 py-2"
                        onClick={() => {
                            track('feature_use', { feature: 'diagnostics_export' });
                            downloadTelemetry();
                        }}
                    >
                        Export diagnostics JSON
                    </button>
                    <button
                        type="button"
                        className="btn-secondary text-[9px] px-3 py-2"
                        onClick={() => clearTelemetry()}
                    >
                        Clear diagnostics
                    </button>
                </div>
            </motion.section>

            <motion.section variants={itemVariants} className="glass-panel p-6 sm:p-8 border border-[rgba(255,255,255,0.05)] space-y-6 font-mono">
                <h2 className="text-sm font-bold uppercase tracking-[0.3em] text-white">Interview templates</h2>
                <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
                    Save setup presets for quick reuse
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                    <input
                        className="input-premium flex-1"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        placeholder="Template name"
                        aria-label="Template name"
                    />
                    <button
                        type="button"
                        className="btn-secondary text-[10px] px-4 py-3"
                        onClick={() => {
                            saveTemplate(templateName || 'My setup', {
                                role: localStorage.getItem('last_target_role') || '',
                                company: localStorage.getItem('last_target_company') || '',
                                interviewField: localStorage.getItem('last_interview_field') || '',
                                interviewMode: localStorage.getItem('last_interview_mode') || '',
                                companyStyle: localStorage.getItem('last_company_style') || '',
                                domainPack: localStorage.getItem('last_domain_pack') || '',
                            });
                            setTemplates(listTemplates());
                            setTemplateName('');
                        }}
                    >
                        Save current prefs
                    </button>
                </div>
                <div className="space-y-2">
                    {templates.length === 0 && (
                        <p className="text-[10px] text-[var(--text-muted)]">No templates yet.</p>
                    )}
                    {templates.map((t) => (
                        <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 p-3 border border-[rgba(255,255,255,0.05)]">
                            <div>
                                <p className="text-xs text-white">{t.name}</p>
                                <p className="text-[9px] text-[var(--text-muted)]">
                                    {t.context.interviewMode || 'mode'} · {t.context.domainPack || 'pack'}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    className="btn-secondary text-[9px] px-3 py-2"
                                    onClick={() => {
                                        writeInterviewPrefill({
                                            mode: t.context.interviewMode,
                                            field: t.context.interviewField,
                                            domainPack: t.context.domainPack,
                                        });
                                        window.location.hash = '#/interview';
                                    }}
                                >
                                    Use
                                </button>
                                <button
                                    type="button"
                                    className="btn-secondary text-[9px] px-3 py-2 text-red-400"
                                    onClick={() => {
                                        deleteTemplate(t.id);
                                        setTemplates(listTemplates());
                                    }}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </motion.section>

            <motion.section variants={itemVariants} className="glass-panel p-6 sm:p-8 border border-[rgba(255,255,255,0.05)] space-y-6 font-mono">
                <h2 className="text-sm font-bold uppercase tracking-[0.3em] text-white">Practice seats</h2>
                <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
                    Local multi-profile scores · CSV export for faculty view
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                    <input
                        className="input-premium flex-1"
                        value={seatName}
                        onChange={(e) => setSeatName(e.target.value)}
                        placeholder="Seat name"
                        aria-label="Practice seat name"
                    />
                    <button
                        type="button"
                        className="btn-secondary text-[10px] px-4 py-3"
                        onClick={() => {
                            if (!seatName.trim()) return;
                            upsertSeat(seatName.trim());
                            setSeats(listSeats());
                            localStorage.setItem('prepai_active_seat', seatName.trim());
                            setSeatName('');
                        }}
                    >
                        Add / select
                    </button>
                    <button type="button" className="btn-secondary text-[10px] px-4 py-3" onClick={() => downloadSeatsCsv()}>
                        Export CSV
                    </button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {seats.map((s) => {
                        const avg = s.scores.length
                            ? Math.round(s.scores.reduce((a, b) => a + b, 0) / s.scores.length)
                            : 0;
                        return (
                            <button
                                key={s.id}
                                type="button"
                                className="px-3 py-2 border border-[rgba(255,255,255,0.05)] text-[9px] uppercase text-[var(--text-secondary)]"
                                onClick={() => localStorage.setItem('prepai_active_seat', s.name)}
                            >
                                {s.name} · {s.scores.length} sess · avg {avg}
                            </button>
                        );
                    })}
                </div>
                <div className="pt-4 border-t border-[rgba(255,255,255,0.05)] flex items-center justify-between gap-4 flex-wrap">
                    <p className="text-[10px] text-[var(--text-muted)]">
                        Onboarding tour: {tourDone ? 'dismissed' : 'pending'}
                    </p>
                    <button
                        type="button"
                        className="btn-secondary text-[9px] px-3 py-2"
                        onClick={() => {
                            localStorage.removeItem('prepai_tour_done');
                            setTourDone(false);
                        }}
                    >
                        Reset tour
                    </button>
                    {!tourDone && (
                        <button
                            type="button"
                            className="btn-secondary text-[9px] px-3 py-2"
                            onClick={() => {
                                dismissTour();
                                setTourDone(true);
                            }}
                        >
                            Mark tour done
                        </button>
                    )}
                </div>
            </motion.section>

            <motion.section variants={itemVariants} className="glass-panel p-6 sm:p-8 border border-[rgba(255,255,255,0.05)] space-y-6 font-mono">
                <h2 className="text-sm font-bold uppercase tracking-[0.3em] text-white">Send feedback</h2>
                <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
                    Report bugs, rate interview quality, or suggest features
                </p>
                <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                    <div className="flex flex-wrap gap-2" role="group" aria-label="Feedback type">
                        {(['bug', 'feature', 'rating', 'idea'] as const).map((t) => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => setFbType(t)}
                                className={`px-3 py-2 border text-[9px] uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-[var(--neon-cyan)] ${
                                    fbType === t
                                        ? 'border-[var(--neon-cyan)] text-[var(--neon-cyan)]'
                                        : 'border-[rgba(255,255,255,0.05)] text-[var(--text-muted)]'
                                }`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                    {fbType === 'rating' && (
                        <label className="flex items-center gap-3 text-[10px] uppercase tracking-widest text-[var(--text-secondary)]">
                            Interview quality
                            <input
                                type="range"
                                min={1}
                                max={5}
                                value={fbRating}
                                onChange={(e) => setFbRating(Number(e.target.value))}
                                className="flex-1 accent-[var(--neon-emerald)]"
                                aria-label="Interview quality rating"
                            />
                            <span className="text-white">{fbRating}/5</span>
                        </label>
                    )}
                    <textarea
                        className="input-premium h-28 resize-none"
                        value={fbMessage}
                        onChange={(e) => setFbMessage(e.target.value)}
                        placeholder="Describe the bug, idea, or experience…"
                        aria-label="Feedback message"
                    />
                    {fbStatus && (
                        <p role="status" className="text-[10px] uppercase tracking-widest text-[var(--neon-emerald)]">{fbStatus}</p>
                    )}
                    <button
                        type="submit"
                        disabled={fbSending}
                        className="btn-primary py-4 px-8 text-[10px] tracking-widest disabled:opacity-50"
                        style={{ background: 'var(--neon-emerald)', color: '#000' }}
                    >
                        {fbSending ? 'Sending…' : 'Submit feedback'}
                    </button>
                </form>
                <div className="pt-6 border-t border-[rgba(255,255,255,0.05)]">
                    <p className="text-[9px] uppercase tracking-widest text-[var(--text-muted)] mb-3">Shipped roadmap</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {ROADMAP_CHANGELOG.map((p) => (
                            <div key={p.phase} className="p-3 border border-[rgba(255,255,255,0.05)]">
                                <p className="text-[9px] text-[var(--neon-emerald)] uppercase tracking-widest">Phase {p.phase}</p>
                                <p className="text-xs text-white font-bold">{p.title}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </motion.section>
        </motion.div>
    );
};

export default ProfilePage;
