import { useState, useRef, useCallback } from 'react';
import { streamChatWithInterviewer, analyzeInterview, ChatMessage } from '../services/groq';
import { fetchUserRepos, GithubRepo } from '../services/github';

export interface InterviewSessionAnalysis {
    overallScore: number;
    categories: { category: string; score: number; fullMark: number }[];
    feedback: string[];
}

export const useInterviewSession = () => {
    const [githubData, setGithubData] = useState<GithubRepo[]>([]);
    const [isGithubLoading, setIsGithubLoading] = useState<boolean>(false);
    const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
    const [analysisResult, setAnalysisResult] = useState<InterviewSessionAnalysis | null>(null);
    const [isStreaming, setIsStreaming] = useState<boolean>(false);

    const loadGithubContext = useCallback(async (githubUrl: string) => {
        if (!githubUrl) return;
        setIsGithubLoading(true);
        try {
            const username = githubUrl.split('/').pop();
            if (username) {
                const repos = await fetchUserRepos(username);
                setGithubData(repos.slice(0, 5));
            }
        } catch {
            // Non-fatal: interview continues without GitHub context
        } finally {
            setIsGithubLoading(false);
        }
    }, []);

    const streamInterviewerResponse = useCallback(async (
        messages: ChatMessage[],
        systemPrompt: string,
        onToken: (token: string) => void,
        onComplete: (fullResponse: string) => void | Promise<void>,
    ) => {
        setIsStreaming(true);
        let fullResponse = '';
        try {
            const stream = streamChatWithInterviewer(messages, systemPrompt);
            for await (const chunk of stream) {
                fullResponse += chunk;
                onToken(chunk);
            }
            await onComplete(fullResponse);
        } finally {
            setIsStreaming(false);
        }
    }, []);

    const runAnalysis = useCallback(async (
        transcription: string[],
        role: string,
        company: string
    ): Promise<InterviewSessionAnalysis> => {
        setIsAnalyzing(true);
        try {
            const analysis = await analyzeInterview(transcription, role, company);
            setAnalysisResult(analysis);
            return analysis;
        } catch {
            const fallback: InterviewSessionAnalysis = {
                overallScore: 70,
                categories: [
                    { category: 'Communication', score: 70, fullMark: 100 },
                    { category: 'Technical Knowledge', score: 70, fullMark: 100 },
                    { category: 'Problem Solving', score: 70, fullMark: 100 },
                    { category: 'Cultural Fit', score: 70, fullMark: 100 },
                    { category: 'Confidence', score: 70, fullMark: 100 },
                ],
                feedback: ['Interview completed. Analysis could not be generated.'],
            };
            setAnalysisResult(fallback);
            return fallback;
        } finally {
            setIsAnalyzing(false);
        }
    }, []);

    return {
        githubData,
        isGithubLoading,
        loadGithubContext,
        isStreaming,
        streamInterviewerResponse,
        isAnalyzing,
        analysisResult,
        runAnalysis,
    };
};
