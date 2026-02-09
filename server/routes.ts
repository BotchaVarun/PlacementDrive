import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { openai } from "./replit_integrations/image/client"; // Re-using the OpenAI client from the integration

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

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
    const resumes = await storage.getUserResumes(1); // Mock user ID 1
    res.json(resumes);
  });

  app.post(api.resumes.create.path, async (req, res) => {
    try {
      const input = api.resumes.create.input.parse(req.body);
      const resume = await storage.createResume(input);
      res.status(201).json(resume);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.get(api.resumes.get.path, async (req, res) => {
    const resume = await storage.getResume(Number(req.params.id));
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

      const completion = await openai.chat.completions.create({
        model: "gpt-5.1",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(completion.choices[0].message.content || "{}");

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
        optimizedLatex: result.optimizedLatex,
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
    const input = api.jobs.create.input.parse(req.body);
    const job = await storage.createJob(input);
    res.status(201).json(job);
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
    let user = await storage.getUser(1);
    if (!user) {
      // Create a mock user for seeding
      user = await storage.createUser({
        firebaseUid: "mock-user-uid",
        email: "demo@placementprime.com",
        name: "Demo User"
      });
    }

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
  }

  seedDatabase().catch(console.error);

  return httpServer;
}
