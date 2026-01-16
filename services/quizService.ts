import Groq from 'groq-sdk';
import { getGroqClient } from './groq';
import { Quiz } from '../types';

// Configuration
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
    // ... repeat for 5 questions total
  ]
}

IMPORTANT: 
- correctAnswer is the index (0-3) of the correct option
- Make questions progressively harder (Q1: easy, Q5: advanced)
- Avoid ambiguous questions`;
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

    const data = await response.json();
    const content = data.response;

    if (!content) {
        throw new Error('No content received from Ollama');
    }

    return parseQuizResponse(content);
}

async function generateWithGroq(topic: string): Promise<Quiz> {
    const groq = getGroqClient();
    const systemPrompt = generatePrompt(topic);

    const completion = await groq.chat.completions.create({
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Generate a complete quiz with 5 MCQ questions for: ${topic}` }
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.7,
        response_format: { type: 'json_object' }
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
        throw new Error('No content received from Groq');
    }

    return parseQuizResponse(content);
}

function parseQuizResponse(content: string): Quiz {
    // Clean potential markdown artifacts
    const cleanedContent = content.replace(/```json\n?|```/g, '').trim();

    // Extract JSON if wrapped in text
    const jsonStart = cleanedContent.indexOf('{');
    const jsonEnd = cleanedContent.lastIndexOf('}');

    let finalJsonString = cleanedContent;
    if (jsonStart !== -1 && jsonEnd !== -1) {
        finalJsonString = cleanedContent.substring(jsonStart, jsonEnd + 1);
    }

    const quiz = JSON.parse(finalJsonString) as Quiz;

    // Validate essential fields
    if (!quiz.topic || !quiz.conceptExplanation || !quiz.quizQuestions || quiz.quizQuestions.length !== 5) {
        throw new Error('Invalid quiz structure from AI - must have exactly 5 questions');
    }

    // Validate each question
    quiz.quizQuestions.forEach((q, idx) => {
        if (!q.question || !q.options || q.options.length !== 4 || typeof q.correctAnswer !== 'number') {
            throw new Error(`Question ${idx + 1} is invalid - must have 4 options and a correctAnswer index`);
        }
    });

    return quiz;
}

// Completion tracking
export function getCompletedQuizzes(): string[] {
    const completed = localStorage.getItem('completed_quizzes');
    return completed ? JSON.parse(completed) : [];
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
    // Check if already completed
    if (isQuizCompleted(topic)) {
        throw new Error('Quiz_Already_Completed: You have already completed a quiz on this topic. Try a different subject.');
    }

    try {
        if (USE_OLLAMA) {
            console.log(`Generating quiz with Ollama (${OLLAMA_MODEL}) at ${OLLAMA_URL}...`);
            return await generateWithOllama(topic);
        } else {
            console.log('Generating quiz with Groq...');
            return await generateWithGroq(topic);
        }
    } catch (error) {
        console.error('Quiz generation failed:', error);
        throw new Error(
            error instanceof Error
                ? `Quiz_Generation_Error: ${error.message}`
                : 'Failed to generate quiz. Please try again.'
        );
    }
}
