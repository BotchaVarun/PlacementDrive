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
    Generate exactly ${count} ${difficulty} level interview questions for the domain "${domain}".
    Focus on conceptual understanding and practical application.
    Return ONLY a raw JSON array (no markdown, no explanation) of exactly ${count} objects:
    [
      {
        "question": "Question text here",
        "type": "technical",
        "expectedAnswer": "Brief summary of expected key points"
      }
    ]
    The type field must be one of: "technical", "behavioral", or "conceptual".
    Return ONLY the JSON array. No other text.
  `;

    try {
        const completion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "llama-3.3-70b-versatile",
            temperature: 0.7,
            max_tokens: 4000,
            // NOTE: Do NOT use response_format: json_object — it forces a JSON *object* wrapper
            // which breaks the array format. We parse the raw text directly instead.
        });

        const content = completion.choices[0]?.message?.content || "[]";

        // Strip any accidental markdown fences the model may add
        const cleaned = content.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

        let parsed: any;
        try {
            parsed = JSON.parse(cleaned);
        } catch {
            // Try to extract first [...] block from the response
            const match = cleaned.match(/\[[\s\S]*\]/);
            if (match) parsed = JSON.parse(match[0]);
            else throw new Error("No JSON array found in AI response");
        }

        // Normalize: model might return array directly or wrap in {questions: [...]}
        if (Array.isArray(parsed)) return parsed.slice(0, count);
        if (parsed && Array.isArray(parsed.questions)) return parsed.questions.slice(0, count);

        // Search for any array value in the response object
        for (const key of Object.keys(parsed || {})) {
            if (Array.isArray(parsed[key])) return (parsed[key] as any[]).slice(0, count);
        }

        return [];
    } catch (error) {
        console.error("Error generating questions:", error);
        // Fallback: generate the correct COUNT of generic questions (not just 1!)
        return Array.from({ length: count }, (_, i) => ({
            question: `${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} question ${i + 1}: Explain a core concept in ${domain}.`,
            type: "technical",
            expectedAnswer: `A thorough, structured explanation demonstrating knowledge of ${domain}.`
        }));
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
