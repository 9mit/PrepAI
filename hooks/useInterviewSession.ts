import { useState, useRef, useCallback } from 'react';
import { streamChatWithInterviewer, analyzeInterview, ChatMessage } from '../services/groq';
import { fetchUserRepos, GithubRepo } from '../services/github';

export interface InterviewSessionAnalysis {
    overallScore: number;
    categories: { category: string; score: number; fullMark: number }[];
    feedback: string[];
}

export const useInterviewSession = () => {
    // GitHub context state
    const [githubData, setGithubData] = useState<GithubRepo[]>([]);
    const [isGithubLoading, setIsGithubLoading] = useState<boolean>(false);

    // Analysis state
    const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
    const [analysisResult, setAnalysisResult] = useState<InterviewSessionAnalysis | null>(null);

    // Streaming state
    const [isStreaming, setIsStreaming] = useState<boolean>(false);

    /**
     * Fetches GitHub repos for context enrichment.
     */
    const loadGithubContext = useCallback(async (githubUrl: string) => {
        if (!githubUrl) return;
        setIsGithubLoading(true);
        try {
            const username = githubUrl.split('/').pop();
            if (username) {
                const repos = await fetchUserRepos(username);
                setGithubData(repos.slice(0, 5));
            }
        } catch (e) {
            console.error('Github context fetch failed', e);
        } finally {
            setIsGithubLoading(false);
        }
    }, []);

    /**
     * Streams an interviewer response from the backend.
     * Yields tokens via the provided callback.
     */
    const streamInterviewerResponse = useCallback(async (
        messages: ChatMessage[],
        systemPrompt: string,
        onToken: (token: string) => void,
        onComplete: (fullResponse: string) => void,
    ) => {
        setIsStreaming(true);
        let fullResponse = '';
        try {
            const stream = streamChatWithInterviewer(messages, systemPrompt);
            for await (const chunk of stream) {
                fullResponse += chunk;
                onToken(chunk);
            }
            onComplete(fullResponse);
        } catch (error) {
            console.error('Error in streaming:', error);
            throw error;
        } finally {
            setIsStreaming(false);
        }
    }, []);

    /**
     * Analyzes a completed interview and returns the result.
     */
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
        } catch (error) {
            console.error('Analysis error:', error);
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
        // GitHub
        githubData,
        isGithubLoading,
        loadGithubContext,
        // Streaming
        isStreaming,
        streamInterviewerResponse,
        // Analysis
        isAnalyzing,
        analysisResult,
        runAnalysis,
    };
};
