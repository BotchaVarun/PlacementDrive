import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage.js";
import { api } from "../shared/routes.js";
import { insertUserSchema, insertResumeSchema, insertJobSchema } from "../shared/schema.js";
import { z } from "zod";
import { openai } from "./replit_integrations/image/client.js";
import multer from "multer";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // PDF Upload Route
  app.post("/api/resumes/upload-pdf", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      if (req.file.mimetype !== "application/pdf") {
        return res.status(400).json({ message: "Only PDF files are allowed" });
      }

      const data = await pdfParse(req.file.buffer);
      res.json({ text: data.text });
    } catch (error) {
      console.error("PDF Parse error:", error);
      res.status(500).json({ message: "Failed to parse PDF" });
    }
  });

  // Users Sync
  app.post(api.users.sync.path, async (req, res) => {
    try {
      const input = api.users.sync.input.parse(req.body);
      let user = await storage.getUserByFirebaseUid(input.firebaseUid);
      if (!user) {
        user = await storage.createUser(input);
        res.status(201).json(user);
      } else {
        res.status(200).json(user);
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  // Resumes
  app.get(api.resumes.list.path, async (req, res) => {
    // In a real app, we'd get userId from auth middleware
    // For now, we'll return all or filter by query if provided
    const resumes = await storage.getUserResumes("1"); // Mock user ID 1
    res.json(resumes);
  });

  app.post(api.resumes.create.path, async (req, res) => {
    try {
      // Inject mock user ID
      const user = await storage.getUserByFirebaseUid("mock-user-uid");
      if (!user) {
        return res.status(500).json({ message: "Mock user not found" });
      }
      const input = api.resumes.create.input.parse({ ...req.body, userId: user.id });
      const resume = await storage.createResume(input);
      res.status(201).json(resume);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: `${err.errors[0].path.join('.')}: ${err.errors[0].message}` });
      }
      throw err;
    }
  });

  app.get(api.resumes.get.path, async (req, res) => {
    const resume = await storage.getResume(req.params.id);
    if (!resume) return res.status(404).json({ message: "Resume not found" });
    res.json(resume);
  });

  // AI Analysis Endpoint
  app.post(api.resumes.analyze.path, async (req, res) => {
    try {
      const { resumeId, jobDescription } = api.resumes.analyze.input.parse(req.body);
      const resume = await storage.getResume(resumeId);
      if (!resume) return res.status(404).json({ message: "Resume not found" });

      // Call OpenAI
      const prompt = `
        You are an expert ATS (Applicant Tracking System) and Resume Coach.
        Analyze the following resume against the provided job description.

        RESUME CONTENT:
        ${resume.content}

        JOB DESCRIPTION:
        ${jobDescription}

        CRITICAL ASSESSMENT INSTRUCTIONS:
        1. **Skill Matching**: Meticulously compare the skills required in the Job Description with those present in the Resume. Identify exactly which required skills are matching and which are missing.
        2. **Alignment Analysis**: Evaluate how well the candidate's experience and project descriptions align with the core responsibilities and requirements of the job.
        3. **Contextual Relevance**: Ensure that the "missingKeywords" you identify are substantive technical or domain-specific skills found in the JD but absent from the Resume, not just generic terms.

        Provide the output in valid JSON format with the following structure:
        {
          "atsScore": number (0-100),
          "sectionScores": {
            "skills": number (0-100),
            "experience": number (0-100),
            "education": number (0-100),
            "formatting": number (0-100)
          },
          "missingKeywords": string[],
          "feedback": "Detailed feedback string",
          "optimizedLatex": "The optimized resume in LaTeX format. Ensure it is valid LaTeX code that compiles."
        }
      `;

      // GROQ API IMPLEMENTATION
      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 1,
        max_completion_tokens: 8192,
        top_p: 1,
        stop: null,
        stream: false
      });

      const content = completion.choices[0]?.message?.content || "{}";
      let result;

      // Attempt to find JSON in the response if it includes markdown
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : content;

      try {
        result = JSON.parse(jsonString);
      } catch (e) {
        console.error("Failed to parse JSON from Groq:", content);
        // Fallback or throw
        throw new Error("Invalid JSON response from AI");
      }

      // Save result
      const updatedResume = await storage.updateResumeAnalysis(
        resumeId,
        result.atsScore || 0,
        result,
        result.optimizedLatex || ""
      );

      res.json({
        atsScore: result.atsScore,
        sectionScores: result.sectionScores,
        missingKeywords: result.missingKeywords,
        feedback: result.feedback,
        optimizedLatex: result.optimizedLatex || "",
      });

    } catch (err) {
      console.error("Analysis error:", err);
      res.status(500).json({ message: "Failed to analyze resume" });
    }
  });

  // Jobs
  app.get(api.jobs.list.path, async (req, res) => {
    const jobs = await storage.getJobs();
    res.json(jobs);
  });

  app.post(api.jobs.create.path, async (req, res) => {
    const user = await storage.getUserByFirebaseUid("mock-user-uid");
    if (!user) return res.status(500).json({ message: "Mock user not found" });
    const input = api.jobs.create.input.parse({ ...req.body, userId: user.id });
    const job = await storage.createJob(input);
    res.status(201).json(job);
  });

  app.patch(api.jobs.update.path, async (req, res) => {
    const id = req.params.id;
    const input = api.jobs.update.input.parse(req.body);
    try {
      const job = await storage.updateJob(id, input);
      res.json(job);
    } catch (error) {
      console.error("Update job error:", error);
      res.status(404).json({ message: "Job not found" });
    }
  });

  app.post(api.jobs.recommend.path, async (req, res) => {
    // Mock recommendations for now
    const mockJobs = [
      {
        title: "Senior Full Stack Engineer",
        company: "Tech Corp",
        description: "Looking for React/Node experts...",
        source: "LinkedIn",
        matchScore: 95,
        userId: 1, // Assign to mock user
      },
      {
        title: "Backend Developer",
        company: "Startup Inc",
        description: "Python/Django role...",
        source: "Indeed",
        matchScore: 88,
        userId: 1,
      }
    ];

    // In a real app, we'd fetch from APIs or use LLM to find matches
    // For this MVP, we'll just return these mocks and save them if they don't exist
    // Simulating "fetching"
    res.json(mockJobs);
  });

  // Seed Data
  async function seedDatabase() {
    // Check if user exists by some criteria or just try to get a known mock ID if we want
    // But with Firestore auto-ids, we might need to search by email/uid.
    let user = await storage.getUserByFirebaseUid("mock-user-uid");

    if (!user) {
      // Create a mock user for seeding
      user = await storage.createUser({
        firebaseUid: "mock-user-uid",
        email: "demo@placementprime.com",
        name: "Demo User"
      });
    }

    /* Default jobs removed as per user request
    const jobs = await storage.getJobs();
    if (jobs.length === 0) {
      await storage.createJob({
        title: "Frontend Developer",
        company: "Google",
        description: "React and TypeScript expertise required.",
        source: "LinkedIn",
        status: "new",
        matchScore: 92,
        userId: user.id
      });
      await storage.createJob({
        title: "Backend Engineer",
        company: "Amazon",
        description: "Java and AWS experience needed.",
        source: "Indeed",
        status: "applied",
        matchScore: 85,
        userId: user.id
      });
      await storage.createJob({
        title: "Full Stack Engineer",
        company: "Startup",
        description: "Node.js and Vue.js.",
        source: "Direct",
        status: "interview",
        matchScore: 89,
        userId: user.id
      });
    }
    */
  }

  await seedDatabase();

  return httpServer;
}
