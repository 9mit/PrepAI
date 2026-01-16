
import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { fetchUserRepos, fetchRepoContents, fetchFileContent, GithubRepo, GithubFile } from '../services/github';

interface GithubSidebarProps {
    user: UserProfile;
}

const GithubSidebar: React.FC<GithubSidebarProps> = ({ user }) => {
    const [repos, setRepos] = useState<GithubRepo[]>([]);
    const [loading, setLoading] = useState(false);
    const [username, setUsername] = useState<string | null>(null);
    const [selectedRepo, setSelectedRepo] = useState<GithubRepo | null>(null);
    const [files, setFiles] = useState<GithubFile[]>([]);
    const [currentPath, setCurrentPath] = useState('');
    const [viewingFile, setViewingFile] = useState<{ name: string; content: string } | null>(null);

    useEffect(() => {
        if (user.githubUrl) {
            // Extract username from "github.com/username" or "https://github.com/username"
            const match = user.githubUrl.match(/github\.com\/([^\/]+)/);
            if (match && match[1]) {
                setUsername(match[1]);
                loadRepos(match[1]);
            }
        }
    }, [user.githubUrl]);

    const loadRepos = async (userStr: string) => {
        setLoading(true);
        try {
            const data = await fetchUserRepos(userStr);
            setRepos(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleRepoClick = async (repo: GithubRepo) => {
        setSelectedRepo(repo);
        setCurrentPath('');
        setViewingFile(null);
        try {
            const data = await fetchRepoContents(repo.owner.login, repo.name, '');
            setFiles(data);
        } catch (e) {
            console.error(e);
        }
    };

    const handleFileClick = async (file: GithubFile) => {
        if (file.type === 'dir') {
            try {
                const data = await fetchRepoContents(selectedRepo!.owner.login, selectedRepo!.name, file.path);
                setFiles(data);
                setCurrentPath(file.path);
            } catch (e) {
                console.error(e);
            }
        } else {
            try {
                const content = await fetchFileContent(file.url);
                setViewingFile({ name: file.name, content });
            } catch (e) {
                console.error(e);
            }
        }
    };

    const handleBack = async () => {
        if (!selectedRepo) return;

        if (currentPath === '') {
            setSelectedRepo(null);
            return;
        }

        // Go up one level
        const parts = currentPath.split('/');
        parts.pop();
        const newPath = parts.join('/');

        try {
            const data = await fetchRepoContents(selectedRepo.owner.login, selectedRepo.name, newPath);
            setFiles(data);
            setCurrentPath(newPath);
        } catch (e) {
            console.error(e);
        }
    };

    if (!username) return null;

    return (
        <>
            <div className="mt-6 px-4">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--slate-500)]">GitHub Repos</h3>
                    <span className="text-[10px] bg-[rgba(255,255,255,0.05)] px-2 py-0.5 rounded text-[var(--slate-400)]">{username}</span>
                </div>

                <div className="space-y-1 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {loading ? (
                        <div className="text-center py-4 text-[var(--slate-500)] text-xs">Loading...</div>
                    ) : repos.length === 0 ? (
                        <div className="text-center py-4 text-[var(--slate-500)] text-xs">No public repos found</div>
                    ) : (
                        repos.map(repo => (
                            <button
                                key={repo.id}
                                onClick={() => handleRepoClick(repo)}
                                className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-[var(--slate-400)] hover:text-white hover:bg-[rgba(255,255,255,0.05)] transition-colors truncate flex items-center gap-2"
                            >
                                <i className="fa-regular fa-folder text-[var(--gold-primary)]"></i>
                                {repo.name}
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Code Viewer Modal */}
            {selectedRepo && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(5,10,20,0.8)] backdrop-blur-sm p-8 animate-fadeIn">
                    <div className="w-full max-w-5xl h-[85vh] flex flex-col glass-card overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-[rgba(255,255,255,0.05)] bg-[rgba(10,22,40,0.5)]">
                            <div className="flex items-center gap-4">
                                <button onClick={() => setSelectedRepo(null)} className="w-8 h-8 rounded-full flex items-center justify-center bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] transition-colors">
                                    <i className="fa-solid fa-xmark text-white"></i>
                                </button>
                                <div>
                                    <h3 className="text-lg font-bold font-display text-white">{selectedRepo.name}</h3>
                                    <span className="text-xs text-[var(--slate-400)] flex items-center gap-2">
                                        <i className="fa-solid fa-code-branch"></i> {selectedRepo.language || 'Unknown'}
                                    </span>
                                </div>
                            </div>
                            <a href={selectedRepo.html_url} target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-lg bg-[rgba(212,175,55,0.1)] text-[var(--gold-primary)] text-xs font-bold uppercase tracking-wider hover:bg-[rgba(212,175,55,0.2)] transition-colors">
                                Open on GitHub <i className="fa-solid fa-arrow-up-right-from-square ml-1"></i>
                            </a>
                        </div>

                        <div className="flex-1 flex overflow-hidden">
                            {/* File Explorer (Left) */}
                            <div className="w-72 border-r border-[rgba(255,255,255,0.05)] bg-[rgba(10,22,40,0.3)] flex flex-col">
                                <div className="p-3 border-b border-[rgba(255,255,255,0.05)] flex items-center gap-2">
                                    <button onClick={handleBack} disabled={!currentPath && !viewingFile} className="text-xs text-[var(--slate-400)] hover:text-white disabled:opacity-30">
                                        <i className="fa-solid fa-arrow-left"></i>
                                    </button>
                                    <span className="text-xs font-mono text-[var(--slate-400)] truncate">/{currentPath}</span>
                                </div>
                                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                    {files
                                        .sort((a, b) => (a.type === b.type ? 0 : a.type === 'dir' ? -1 : 1)) // Dirs first
                                        .map(file => (
                                            <button
                                                key={file.sha}
                                                onClick={() => handleFileClick(file)}
                                                className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-[var(--slate-300)] hover:text-white hover:bg-[rgba(255,255,255,0.05)] transition-colors flex items-center gap-2 truncate"
                                            >
                                                <i className={`fa-${file.type === 'dir' ? 'regular fa-folder' : 'solid fa-file-code'} ${file.type === 'dir' ? 'text-[var(--gold-primary)]' : 'text-[var(--slate-500)]'}`}></i>
                                                {file.name}
                                            </button>
                                        ))}
                                </div>
                            </div>

                            {/* Code View (Right) */}
                            <div className="flex-1 bg-[#0d1117] overflow-auto relative">
                                {viewingFile ? (
                                    <div className="p-0 min-h-full">
                                        <div className="sticky top-0 left-0 right-0 bg-[#161b22] px-4 py-2 border-b border-[#30363d] text-xs text-[var(--slate-400)] font-mono flex items-center justify-between">
                                            <span>{viewingFile.name}</span>
                                            <span className="text-[10px] uppercase opacity-50">Read Only</span>
                                        </div>
                                        <pre className="p-4 text-sm font-mono text-[#c9d1d9] leading-relaxed">
                                            <code>{viewingFile.content}</code>
                                        </pre>
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-[var(--slate-500)] opacity-40">
                                        <i className="fa-brands fa-github text-6xl mb-4"></i>
                                        <p className="font-medium">Select a file to view code structure</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default GithubSidebar;
