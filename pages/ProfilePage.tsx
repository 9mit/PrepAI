
import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';

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

    useEffect(() => {
        // Calculate profile completion
        let filled = 0;
        const fields = ['name', 'email', 'skills', 'experience', 'education', 'projects', 'githubUrl', 'age', 'bio'];
        const total = fields.length;

        fields.forEach(field => {
            // @ts-ignore
            const val = user[field];
            if (Array.isArray(val) ? val.length > 0 : !!val) {
                filled++;
            }
        });

        setCompletion(Math.round((filled / total) * 100));
    }, [user]);

    const handleSave = () => {
        onUpdateUser(formData);
        setIsEditing(false);
    };

    const handleCreateAccount = () => {
        console.log('Account created logic here')
    }


    return (
        <motion.div
            className="max-w-5xl mx-auto space-y-8 pb-20"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >

            {/* Header & Completion Banner */}
            <motion.div variants={itemVariants} className="flex items-end justify-between">
                <div>
                    <h1 className="text-4xl font-bold font-display text-white mb-2">My Profile</h1>
                    <p className="text-[var(--slate-400)]">Manage your professional identity.</p>
                </div>
                {!isEditing && (
                    <button
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
                                    <a href={formData.githubUrl} target="_blank" rel="noreferrer" className="text-sm text-[var(--gold-primary)] hover:underline flex items-center gap-2">
                                        <i className="fa-brands fa-github"></i> {formData.githubUrl || 'Not linked'}
                                    </a>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {isEditing && (
                <div className="fixed bottom-8 right-8 z-40 animate-slideUp">
                    <div className="glass-panel p-2 rounded-2xl flex gap-3 shadow-2xl">
                        <button
                            onClick={() => { setFormData(user); setIsEditing(false); }}
                            className="px-6 py-3 rounded-xl font-bold text-[var(--slate-300)] hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-8 py-3 rounded-xl bg-gradient-to-r from-[var(--gold-primary)] to-[var(--gold-dark)] text-[var(--navy-deep)] font-bold shadow-lg transform hover:-translate-y-1 transition-all"
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            )}
        </motion.div>
    );
};

export default ProfilePage;
