import Groq from "groq-sdk";
import fs from "fs";

// Initialize Groq client
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "dummy_key" });

export interface GeneratedQuestion {
    question: string;
    type: string;
    expectedAnswer: string;
}

export interface AnswerEvaluation {
    score: number;
    feedback: string;
    betterAnswer: string;
    keyConceptsMissing: string[];
    clarity: number;
    technicalAccuracy: number;
    confidence: number;
}

/**
 * Generates interview questions based on domain and difficulty.
 */
export async function generateInterviewQuestions(
    domain: string,
    difficulty: string,
    count: number = 5
): Promise<GeneratedQuestion[]> {
    const prompt = `
    Generate ${count} ${difficulty} level interview questions for the domain "${domain}".
    Focus on conceptual understanding and practical application.
    Return the output strictly as a JSON array of objects with this format:
    [
      {
        "question": "Question text",
        "type": "technical", // or "behavioral", "conceptual"
        "expectedAnswer": "Brief summary of key points expected in the answer"
      }
    ]
    Do not include any markdown formatting or explanations. 
    Just the raw JSON array.
  `;

    try {
        const completion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "llama-3.3-70b-versatile",
            temperature: 0.7,
            response_format: { type: "json_object" },
        });

        const content = completion.choices[0]?.message?.content || "[]";
        // Depending on model behavior, it might wrap in a root object if json_object is forced, 
        // or just array. safely parse.
        let parsed;
        try {
            parsed = JSON.parse(content);
            // Handle case where model wraps it in a key like "questions"
            if (!Array.isArray(parsed) && parsed.questions) {
                return parsed.questions;
            }
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            // heavy handed cleanup if json mode fails
            const cleaned = content.replace(/```json/g, "").replace(/```/g, "").trim();
            parsed = JSON.parse(cleaned);
            return Array.isArray(parsed) ? parsed : [];
        }
    } catch (error) {
        console.error("Error generating questions:", error);
        // Fallback questions to prevent crash
        return [
            {
                question: `Tell me about your experience with ${domain}.`,
                type: "behavioral",
                expectedAnswer: "General overview of experience."
            }
        ];
    }
}

/**
 * Evaluates a user's answer (text) against the question.
 */
export async function evaluateAnswer(
    question: string,
    userAnswer: string
): Promise<AnswerEvaluation> {
    const prompt = `
    You are an expert interviewer. Evaluate the candidate's answer.
    
    Question: "${question}"
    Candidate Answer: "${userAnswer}"

    Provide a JSON object with:
    {
        "score": number (1-10, based on overall quality),
        "feedback": "Constructive feedback (max 2 sentences)",
        "betterAnswer": "A concise, professional version of the answer (max 3 sentences)",
        "keyConceptsMissing": ["concept1", "concept2"],
        "clarity": number (1-10, fluency and structure),
        "technicalAccuracy": number (1-10, correctness),
        "confidence": number (1-10, inferred from tone/phrasing)
    }
    Return ONLY valid JSON.
  `;

    try {
        const completion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "llama-3.3-70b-versatile",
            temperature: 0.5,
            response_format: { type: "json_object" },
        });

        const content = completion.choices[0]?.message?.content || "{}";
        return JSON.parse(content);
    } catch (error) {
        console.error("Error evaluating answer:", error);
        return {
            score: 5,
            feedback: "Could not evaluate answer at this time.",
            betterAnswer: "N/A",
            keyConceptsMissing: [],
            clarity: 5,
            technicalAccuracy: 5,
            confidence: 5
        };
    }
}

/**
 * Transcribes audio using Whisper.
 * @param filePath Path to the audio file
 */
export async function transcribeAudio(filePath: string): Promise<string> {
    try {
        const transcription = await groq.audio.transcriptions.create({
            file: fs.createReadStream(filePath),
            model: "whisper-large-v3",
            response_format: "json", // "json" | "text" | "verbose_json"
            temperature: 0.0,
        });
        return transcription.text;
    } catch (error) {
        console.error("Transcription error:", error);
        return "";
    }
}
