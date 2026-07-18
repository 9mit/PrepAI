/**
 * groq.ts — Backend API proxy layer.
 *
 * All LLM calls route through the FastAPI backend with a guest JWT.
 * The Groq SDK and API key never touch the frontend bundle.
 */

import { apiFetch } from './apiClient';

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export async function parseResumeText(text: string) {
    const response = await apiFetch('/parse-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(
            typeof errorData.detail === 'string' ? errorData.detail : 'Failed to parse resume'
        );
    }

    return response.json();
}

export async function chatWithInterviewer(
    messages: ChatMessage[],
    systemPrompt: string
): Promise<string> {
    const response = await apiFetch('/interview/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            messages: messages.filter(m => m.role !== 'system'),
            system_prompt: systemPrompt,
        }),
    });

    if (!response.ok) {
        throw new Error('Failed to get interviewer response');
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    if (reader) {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            for (const line of lines) {
                if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                    try {
                        const parsed = JSON.parse(line.slice(6)) as { token?: string };
                        if (parsed.token) fullText += parsed.token;
                    } catch { /* skip malformed lines */ }
                }
            }
        }
    }

    return fullText || "I apologize, I didn't catch that. Could you please repeat?";
}

export async function* streamChatWithInterviewer(
    messages: ChatMessage[],
    systemPrompt: string
): AsyncGenerator<string, void, unknown> {
    const response = await apiFetch('/interview/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            messages: messages.filter(m => m.role !== 'system'),
            system_prompt: systemPrompt,
        }),
    });

    if (!response.ok) {
        throw new Error('Failed to stream interviewer response');
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) return;

    let buffer = '';
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
            if (line.startsWith('data: [DONE]')) return;
            if (line.startsWith('data: ')) {
                try {
                    const parsed = JSON.parse(line.slice(6)) as { token?: string; error?: string };
                    if (parsed.token) yield parsed.token;
                    if (parsed.error) throw new Error(parsed.error);
                } catch (e) {
                    if (e instanceof Error && e.message === 'Stream failed') throw e;
                    if (e instanceof Error && e.message && !e.message.includes('JSON') && e.message !== 'Unexpected end of JSON input') {
                        throw e;
                    }
                }
            }
        }
    }
}

export async function analyzeInterview(
    transcription: string[],
    role: string,
    company: string
) {
    const response = await apiFetch('/interview/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcription, role, company }),
    });

    if (!response.ok) {
        throw new Error('Failed to analyze interview');
    }

    return response.json();
}
