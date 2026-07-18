import { apiFetch } from './apiClient';
import { Quiz, QuizQuestion } from '../types';

const USE_OLLAMA = import.meta.env.VITE_USE_OLLAMA === 'true';
const OLLAMA_URL = import.meta.env.VITE_OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = import.meta.env.VITE_OLLAMA_MODEL || 'llama3.2';

const generatePrompt = (topic: string) => {
    return `You are an elite technical quiz generator and expert educator.
Generate a comprehensive quiz for the topic: "${topic}".

REQUIREMENTS:
- Provide a deep ELI5 explanation of the concept
- Include exact SYNTAX guides with code examples (if applicable)
- Create exactly 5 multiple-choice questions (MCQ)
- Each question must have 4 options
- Questions should range from beginner to advanced
- Provide clear explanations for correct answers

OUTPUT FORMAT: Valid JSON only. No markdown, no explanations outside JSON.

JSON Schema:
{
  "topic": "${topic}",
  "conceptExplanation": "Deep ELI5 explanation of the core concept (2-3 paragraphs)",
  "syntaxGuide": "Exact syntax and code structure with examples (if applicable)",
  "quizQuestions": [
    {
      "question": "The quiz question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Why this answer is correct and brief explanation"
    }
  ]
}

IMPORTANT: 
- correctAnswer is the index (0-3) of the correct option
- Make questions progressively harder (Q1: easy, Q5: advanced)
- Avoid ambiguous questions
- Return ONLY the JSON object`;
};

async function generateWithOllama(topic: string): Promise<Quiz> {
    const prompt = generatePrompt(topic);

    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: OLLAMA_MODEL,
            prompt: prompt,
            stream: false,
            format: 'json',
            options: {
                temperature: 0.7,
            }
        })
    });

    if (!response.ok) {
        throw new Error(`Ollama_Error: ${response.statusText}. Is Ollama running on ${OLLAMA_URL}?`);
    }

    const data = await response.json() as { response?: string };
    const content = data.response;

    if (!content) {
        throw new Error('No content received from Ollama');
    }

    return parseQuizResponse(content);
}

async function fetchQuizContentFromBackend(topic: string, reinforceJson: boolean): Promise<string> {
    const systemPrompt = generatePrompt(topic);
    const userContent = reinforceJson
        ? `Generate a complete quiz with exactly 5 MCQ questions for: ${topic}. Respond with ONLY valid JSON matching the schema.`
        : `Generate a complete quiz with 5 MCQ questions for: ${topic}`;

    const response = await apiFetch('/interview/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            messages: [{ role: 'user', content: userContent }],
            system_prompt: systemPrompt,
        }),
    });

    if (!response.ok) {
        throw new Error('Failed to generate quiz via backend');
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let content = '';

    if (reader) {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            for (const line of lines) {
                if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                    try {
                        const parsed = JSON.parse(line.slice(6)) as { token?: string; error?: string };
                        if (parsed.error) {
                            throw new Error(parsed.error);
                        }
                        if (parsed.token) content += parsed.token;
                    } catch (err) {
                        if (err instanceof Error && err.message && !err.message.includes('JSON')) {
                            throw err;
                        }
                    }
                }
            }
        }
    }

    if (!content) {
        throw new Error('No content received from backend');
    }

    return content;
}

async function generateWithGroq(topic: string): Promise<Quiz> {
    let content = await fetchQuizContentFromBackend(topic, false);
    try {
        return parseQuizResponse(content);
    } catch {
        content = await fetchQuizContentFromBackend(topic, true);
        return parseQuizResponse(content);
    }
}

function normalizeQuestion(raw: Record<string, unknown>, idx: number): QuizQuestion {
    const options = Array.isArray(raw.options)
        ? raw.options.map((o) => String(o)).slice(0, 4)
        : [];
    while (options.length < 4) {
        options.push(`Option ${options.length + 1}`);
    }

    let correctAnswer = typeof raw.correctAnswer === 'number'
        ? raw.correctAnswer
        : typeof raw.correct_answer === 'number'
            ? raw.correct_answer
            : 0;
    if (correctAnswer < 0 || correctAnswer > 3) correctAnswer = 0;

    return {
        question: String(raw.question || `Question ${idx + 1}`),
        options,
        correctAnswer,
        explanation: String(raw.explanation || 'Review the concept and try again.'),
    };
}

/** Exported for unit tests — robust JSON extraction from LLM prose. */
export function parseQuizResponse(content: string): Quiz {
    const cleanedContent = content.replace(/```json\n?|```/gi, '').trim();
    const jsonStart = cleanedContent.indexOf('{');
    const jsonEnd = cleanedContent.lastIndexOf('}');

    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
        throw new Error('No JSON object found in quiz response');
    }

    const finalJsonString = cleanedContent.substring(jsonStart, jsonEnd + 1);
    let parsed: Record<string, unknown>;
    try {
        parsed = JSON.parse(finalJsonString) as Record<string, unknown>;
    } catch {
        throw new Error('Invalid JSON in quiz response');
    }

    const rawQuestions = Array.isArray(parsed.quizQuestions)
        ? parsed.quizQuestions
        : Array.isArray(parsed.questions)
            ? parsed.questions
            : [];

    if (rawQuestions.length < 5) {
        throw new Error('Invalid quiz structure from AI - must have exactly 5 questions');
    }

    const quizQuestions = rawQuestions.slice(0, 5).map((q, idx) =>
        normalizeQuestion(q as Record<string, unknown>, idx)
    );

    const quiz: Quiz = {
        topic: String(parsed.topic || 'Untitled'),
        conceptExplanation: String(parsed.conceptExplanation || parsed.concept_explanation || ''),
        syntaxGuide: String(parsed.syntaxGuide || parsed.syntax_guide || ''),
        quizQuestions,
    };

    if (!quiz.conceptExplanation) {
        throw new Error('Invalid quiz structure - missing concept explanation');
    }

    quiz.quizQuestions.forEach((q, idx) => {
        if (!q.question || q.options.length !== 4 || typeof q.correctAnswer !== 'number') {
            throw new Error(`Question ${idx + 1} is invalid - must have 4 options and a correctAnswer index`);
        }
    });

    return quiz;
}

export function getCompletedQuizzes(): string[] {
    const completed = localStorage.getItem('completed_quizzes');
    return completed ? JSON.parse(completed) as string[] : [];
}

export function markQuizComplete(topic: string) {
    const completed = getCompletedQuizzes();
    if (!completed.includes(topic.toLowerCase())) {
        completed.push(topic.toLowerCase());
        localStorage.setItem('completed_quizzes', JSON.stringify(completed));
    }
}

export function isQuizCompleted(topic: string): boolean {
    const completed = getCompletedQuizzes();
    return completed.includes(topic.toLowerCase());
}

export async function generateQuiz(topic: string): Promise<Quiz> {
    if (isQuizCompleted(topic)) {
        throw new Error('Quiz_Already_Completed: You have already completed a quiz on this topic. Try a different subject.');
    }

    try {
        if (USE_OLLAMA) {
            return await generateWithOllama(topic);
        }
        return await generateWithGroq(topic);
    } catch (error) {
        throw new Error(
            error instanceof Error
                ? `Quiz_Generation_Error: ${error.message}`
                : 'Failed to generate quiz. Please try again.'
        );
    }
}
