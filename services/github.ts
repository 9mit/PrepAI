
const GITHUB_API_BASE = 'https://api.github.com';

export interface GithubRepo {
    id: number;
    name: string;
    full_name: string;
    description: string;
    html_url: string;
    language: string;
    stargazers_count: number;
    updated_at: string;
    owner: {
        login: string;
    };
}

export interface GithubFile {
    name: string;
    path: string;
    sha: string;
    size: number;
    url: string;
    html_url: string;
    git_url: string;
    download_url: string;
    type: 'file' | 'dir';
}

export interface FileContent {
    name: string;
    content: string; // Base64 encoded or raw depending on API
    encoding: string;
}

// Simple in-memory cache to avoid rate limits on repeated clicks
const repoCache = new Map<string, GithubRepo[]>();
const contentCache = new Map<string, any>();

export async function fetchUserRepos(username: string): Promise<GithubRepo[]> {
    if (repoCache.has(username)) return repoCache.get(username)!;

    try {
        const response = await fetch(`${GITHUB_API_BASE}/users/${username}/repos?sort=updated&per_page=10`);
        if (!response.ok) {
            if (response.status === 404) throw new Error('User not found');
            if (response.status === 403) throw new Error('Rate limit exceeded');
            throw new Error('Failed to fetch repos');
        }
        const data = await response.json();
        repoCache.set(username, data);
        return data;
    } catch (error) {
        console.error('GitHub API Error:', error);
        return []; // Return empty to avoid breaking UI, potentially show toast in UI
    }
}

export async function fetchRepoContents(username: string, repo: string, path: string = ''): Promise<GithubFile[]> {
    const cacheKey = `${username}/${repo}/${path}`;
    if (contentCache.has(cacheKey)) return contentCache.get(cacheKey);

    try {
        const response = await fetch(`${GITHUB_API_BASE}/repos/${username}/${repo}/contents/${path}`);
        if (!response.ok) throw new Error('Failed to fetch contents');
        const data = await response.json();

        // Ensure it's an array (directory listing), not a single file object
        const files = Array.isArray(data) ? data : [data];
        contentCache.set(cacheKey, files);
        return files;
    } catch (error) {
        console.error('GitHub API Error:', error);
        throw error;
    }
}

export async function fetchFileContent(url: string): Promise<string> {
    if (contentCache.has(url)) return contentCache.get(url);

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch file content');
        const data = await response.json();

        // GitHub API returns content in Base64
        let content = '';
        if (data.encoding === 'base64') {
            content = atob(data.content.replace(/\n/g, ''));
        } else {
            content = data.content || '';
        }

        contentCache.set(url, content);
        return content;
    } catch (error) {
        console.error('GitHub API Error:', error);
        throw error;
    }
}
