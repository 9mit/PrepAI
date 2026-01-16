
import Groq from "groq-sdk";

const getApiKey = () => {
    if (typeof window !== 'undefined' && (window as any)._env_?.VITE_GROQ_API_KEY) {
        return (window as any)._env_.VITE_GROQ_API_KEY;
    }
    return import.meta.env.VITE_GROQ_API_KEY || '';
};

export const getGroqClient = () => {
    const API_KEY = getApiKey();
    if (!API_KEY) {
        console.warn("Groq API Key missing. Please set VITE_GROQ_API_KEY.");
    }
    return new Groq({ apiKey: API_KEY, dangerouslyAllowBrowser: true });
};

export async function parseResumeText(text: string) {
    const groq = getGroqClient();

    const completion = await groq.chat.completions.create({
        messages: [
            {
                role: "system",
                content: "You are an expert resume parser. You MUST output a valid JSON object. Do not include any explanation or markdown formatting."
            },
            {
                role: "user",
                content: `You will be given resume text. Extract details into this exact JSON structure:
        {
          "name": "Full Name",
          "email": "email@example.com",
          "skills": ["Skill1", "Skill2"],
          "experience": "Summary of work history...",
          "education": "Summary of education...",
          "projects": "Summary of projects...",
          "githubUrl": "github.com/profile",
          "bio": "Professional summary",
          "age": 0
        }

        Rules:
        - If a field is not found, use a reasonable empty value (e.g. "" or []).
        - "skills" MUST be an array of strings.
        - "experience" should be a substantial paragraph if data exists.
        
        Resume Text:
        ${text}`
            }
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0,
        response_format: { type: "json_object" }
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("No content received from Groq");

    // Clean up markdown code blocks if present
    const cleanedContent = content.replace(/```json\n?|```/g, '').trim();

    // Attempt to extract purely the JSON part if there's conversational text
    const jsonStart = cleanedContent.indexOf('{');
    const jsonEnd = cleanedContent.lastIndexOf('}');

    let finalJsonString = cleanedContent;
    if (jsonStart !== -1 && jsonEnd !== -1) {
        finalJsonString = cleanedContent.substring(jsonStart, jsonEnd + 1);
    }

    try {
        return JSON.parse(finalJsonString);
    } catch (e) {
        console.error("Failed to parse Groq JSON:", finalJsonString);
        throw new Error("Invalid JSON format from AI");
    }
}

// Interview conversation with Groq
export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export async function chatWithInterviewer(
    messages: ChatMessage[],
    systemPrompt: string
): Promise<string> {
    const groq = getGroqClient();

    const fullMessages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        ...messages
    ];

    const completion = await groq.chat.completions.create({
        messages: fullMessages,
        model: "llama-3.3-70b-versatile",
        temperature: 0.7,
        max_tokens: 500,
    });

    return completion.choices[0]?.message?.content || "I apologize, I didn't catch that. Could you please repeat?";
}

export async function* streamChatWithInterviewer(
    messages: ChatMessage[],
    systemPrompt: string
): AsyncGenerator<string, void, unknown> {
    const groq = getGroqClient();

    const fullMessages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        ...messages
    ];

    const stream = await groq.chat.completions.create({
        messages: fullMessages,
        model: "llama-3.3-70b-versatile",
        temperature: 0.7,
        max_tokens: 500,
        stream: true,
    });

    for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
            yield content;
        }
    }
}

// Interview analysis with Groq
export async function analyzeInterview(
    transcription: string[],
    role: string,
    company: string
) {
    const groq = getGroqClient();
    const transcriptText = transcription.join('\n');

    const completion = await groq.chat.completions.create({
        messages: [
            {
                role: "system",
                content: "You are an expert interview coach. Analyze interviews and provide structured feedback in JSON format only."
            },
            {
                role: "user",
                content: `Analyze the following interview transcript between an AI Interviewer and a Candidate for a ${role} position at ${company}. 
    
Transcript:
${transcriptText}

Provide evaluation in this exact JSON format:
{
  "overallScore": <number 1-100>,
  "categories": [
    {"category": "Communication", "score": <number>, "fullMark": 100},
    {"category": "Technical Knowledge", "score": <number>, "fullMark": 100},
    {"category": "Problem Solving", "score": <number>, "fullMark": 100},
    {"category": "Cultural Fit", "score": <number>, "fullMark": 100},
    {"category": "Confidence", "score": <number>, "fullMark": 100}
  ],
  "feedback": ["<specific feedback point 1>", "<specific feedback point 2>", "<specific feedback point 3>"]
}`
            }
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0,
        response_format: { type: "json_object" }
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("No analysis received from Groq");

    try {
        return JSON.parse(content);
    } catch (e) {
        console.error("Failed to parse analysis JSON:", content);
        // Return default structure on parse failure
        return {
            overallScore: 70,
            categories: [
                { category: "Communication", score: 70, fullMark: 100 },
                { category: "Technical Knowledge", score: 70, fullMark: 100 },
                { category: "Problem Solving", score: 70, fullMark: 100 },
                { category: "Cultural Fit", score: 70, fullMark: 100 },
                { category: "Confidence", score: 70, fullMark: 100 }
            ],
            feedback: ["Interview completed. Analysis could not be generated."]
        };
    }
}
