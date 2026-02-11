import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function main() {
    if (!process.env.GROQ_API_KEY) {
        console.error("Error: GROQ_API_KEY is not set.");
        return;
    }

    try {
        console.log("Testing Groq API with model: openai/gpt-oss-120b");
        const completion = await groq.chat.completions.create({
            model: "openai/gpt-oss-120b",
            messages: [{ role: "user", content: "Say hello" }],
        });
        console.log("Success!", completion.choices[0].message.content);
    } catch (err) {
        console.error("Error with openai/gpt-oss-120b:", err.message);

        console.log("\nTrying fallback model: llama3-8b-8192");
        try {
            const completion = await groq.chat.completions.create({
                model: "llama3-8b-8192",
                messages: [{ role: "user", content: "Say hello" }],
            });
            console.log("Success with llama3!", completion.choices[0].message.content);
        } catch (fallbackErr) {
            console.error("Error with fallback model:", fallbackErr.message);
        }
    }
}

main();
