
import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import Tesseract from 'tesseract.js';

// Initialize PDF.js worker locally
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export interface ParsedResume {
    name: string;
    email: string;
    skills: string[];
    experience: string;
    education: string;
    githubUrl?: string;
    linkedinUrl?: string;
    projects: string;
}

// Common tech skills to look for
const SKILL_KEYWORDS = [
    'React', 'Vue', 'Angular', 'Node.js', 'Python', 'Java', 'C++', 'TypeScript', 'JavaScript',
    'HTML', 'CSS', 'SQL', 'NoSQL', 'MongoDB', 'PostgreSQL', 'AWS', 'Azure', 'GCP', 'Docker',
    'Kubernetes', 'Git', 'CI/CD', 'Agile', 'Scrum', 'REST', 'GraphQL', 'Next.js', 'Redux',
    'Machine Learning', 'AI', 'Data Science', 'TensorFlow', 'PyTorch'
];

export async function extractTextFromPdf(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    let isScanned = true;

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');

        if (pageText.trim().length > 50) {
            isScanned = false;
        }
        fullText += pageText + '\n';
    }

    // If text is minimal, assume it's a scanned document and use OCR
    if (isScanned || fullText.trim().length < 100) {
        console.log("Detected scanned PDF. Switching to OCR...");
        fullText = ''; // Reset to strict OCR output

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better OCR
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            if (context) {
                // @ts-ignore
                await page.render({ canvasContext: context, viewport: viewport }).promise;
                const { data: { text } } = await Tesseract.recognize(
                    canvas.toDataURL('image/png'),
                    'eng',
                    { logger: m => console.log(m) }
                );
                fullText += text + '\n';
            }
        }
    }

    return fullText;
}

export function parseResumeData(text: string): ParsedResume {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    // 1. Extract Email
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
    const emailMatch = text.match(emailRegex);
    const email = emailMatch ? emailMatch[0] : '';

    // 2. Extract Links (GitHub/LinkedIn)
    const githubRegex = /(github\.com\/[a-zA-Z0-9-]+)/gi;
    const linkedinRegex = /(linkedin\.com\/in\/[a-zA-Z0-9-]+)/gi;

    const githubMatch = text.match(githubRegex);
    const linkedinMatch = text.match(linkedinRegex);

    const githubUrl = githubMatch ? `https://${githubMatch[0]}` : undefined;
    const linkedinUrl = linkedinMatch ? `https://${linkedinMatch[0]}` : undefined;

    // 3. Extract Name (Heuristic: First non-empty line usually, or looks like a name)
    // We'll just take the first line that isn't special char only
    let name = '';
    for (const line of lines) {
        if (line.length > 3 && !line.includes('@') && !line.includes('http')) {
            name = line;
            break;
        }
    }

    // 4. Extract Skills (Keyword matching)
    const foundSkills = new Set<string>();
    const lowerText = text.toLowerCase();
    SKILL_KEYWORDS.forEach(skill => {
        if (lowerText.includes(skill.toLowerCase())) {
            foundSkills.add(skill);
        }
    });

    // 5. Rough Section Extraction (Experience, Education, Projects)
    // We look for keywords and take text until the next keyword
    const sections = {
        experience: '',
        education: '',
        projects: ''
    };

    const lowerLines = text.toLowerCase().split('\n');
    let currentSection: 'experience' | 'education' | 'projects' | null = null;

    for (const line of lines) {
        const lower = line.toLowerCase();

        if (lower.includes('experience') || lower.includes('employment') || lower.includes('work history')) {
            currentSection = 'experience';
            continue;
        } else if (lower.includes('education') || lower.includes('academic')) {
            currentSection = 'education';
            continue;
        } else if (lower.includes('project')) {
            currentSection = 'projects';
            continue;
        } else if (lower.includes('skills') || lower.includes('technical')) {
            currentSection = null; // We handled skills separately
            continue;
        }

        if (currentSection) {
            sections[currentSection] += line + '\n';
        }
    }

    // Limit section length to avoid overflowing UI
    const limit = (str: string) => str.slice(0, 500) + (str.length > 500 ? '...' : '');

    return {
        name,
        email,
        skills: Array.from(foundSkills),
        experience: limit(sections.experience),
        education: limit(sections.education),
        projects: limit(sections.projects),
        githubUrl,
        linkedinUrl
    };
}
