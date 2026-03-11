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
import { checkAuth } from "./middleware/auth.js";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "dummy_key" });

// Dedicated Groq client for resume enhancer (separate daily token quota)
// Set RESUME_GROQ_API_KEY in your .env file
const resumeGroq = new Groq({ apiKey: process.env.RESUME_GROQ_API_KEY || process.env.GROQ_API_KEY || "dummy_key" });

import {
  insertInterviewSchema,
  insertResponseSchema
} from "../shared/schema.js";
import {
  generateInterviewQuestions,
  evaluateAnswer,
  transcribeAudio
} from "./services/ai.js";
import fs from "fs";
import path from "path";
import os from "os";
import { JobService } from "./services/jobs.js";

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
  app.get(api.resumes.list.path, checkAuth, async (req, res) => {
    const userId = req.user!.id;
    const limitCount = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const summary = req.query.summary === "true";
    const resumes = await storage.getUserResumes(userId, limitCount, summary);
    res.json(resumes);
  });

  app.post(api.resumes.create.path, checkAuth, async (req, res) => {
    try {
      const user = req.user!;
      // Inject user ID from auth
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
  app.post(api.resumes.analyze.path, checkAuth, async (req, res) => {
    try {
      const { resumeId, resumeContent, jobDescription } = api.resumes.analyze.input.parse(req.body);
      const userId = req.user!.id;

      // ── Fetch & compress profile data ────────────────────────────────────
      const userProfile = await storage.getFullProfile(userId);
      const p = userProfile || {} as any;
      const pi = p.personalInfo || {};
      const compressedProfile = {
        name: pi.fullName || p.name || "",
        email: pi.email || "",
        phone: pi.phone || "",
        skills: (p.skills || []).map((s: any) => s.name || s).join(", "),
        education: (p.education || []).map((e: any) =>
          `${e.degree || ""} at ${e.institution || ""} (${e.startYear || ""}–${e.endYear || ""})`
        ),
        experience: (p.experience || []).map((e: any) =>
          `${e.role || e.title || ""} at ${e.company || ""}: ${(e.description || "").substring(0, 150)}`
        ),
        projects: (p.projects || []).map((pr: any) =>
          `${pr.title || pr.name || ""}: ${(pr.description || "").substring(0, 120)}`
        ),
        certifications: (p.certifications || []).map((c: any) => c.name || ""),
      };

      let existingContent = resumeContent || "";
      let resumeTitle = "Generated Resume";

      if (resumeId) {
        const resume = await storage.getResume(resumeId as string);
        if (resume) {
          existingContent = resume.content;
          resumeTitle = resume.title;
        }
      }

      // ── Truncate inputs to control token usage ────────────────────────────
      const MAX_JD = 1200;
      const MAX_RESUME = 2000;
      const truncatedJd = (jobDescription || "").substring(0, MAX_JD);
      const truncatedResume = existingContent.substring(0, MAX_RESUME);
      const profileStr = JSON.stringify(compressedProfile);

      // ── Token size guard (rough estimate: 1 token ≈ 4 chars) ──────────────
      const estimatedInputTokens = Math.ceil(
        (truncatedJd.length + truncatedResume.length + profileStr.length) / 4
      );
      if (estimatedInputTokens > 5000) {
        return res.status(400).json({
          message: "Input too large. Please shorten your resume or job description and try again."
        });
      }

      // ── CALL 1: ATS scoring (JSON only, dedicated small call) ────────────
      const usingProfile = !existingContent;
      const atsPrompt = [
        "You are an expert ATS Resume Analyzer. Your task has 4 steps. Return ONLY valid JSON. No text outside JSON.",
        "",
        "STEP 1 – Extract technical keywords from the JD (tools, skills, technologies, certifications, role-specific terms).",
        "STEP 2 – Extract keywords already present in the resume/profile.",
        "STEP 3 – Compare: identify which JD keywords are MISSING from the resume.",
        "STEP 4 – Score and suggest improvements.",
        "",
        "JOB DESCRIPTION:",
        truncatedJd,
        "",
        "RESUME / PROFILE:",
        truncatedResume || profileStr,
        "",
        "Return EXACTLY this JSON structure (no extra fields, no markdown):",
        JSON.stringify({
          atsScore: "<overall 0-100 weighted: skills 40%, experience 30%, education 15%, formatting 15%>",
          sectionScores: {
            skills: "<0-100>",
            experience: "<0-100>",
            education: "<0-100>",
            formatting: "<0-100>"
          },
          jdKeywords: ["<all technical keywords extracted from JD>"],
          resumeKeywords: ["<keywords already present in resume>"],
          missingKeywords: ["<JD keywords NOT found in resume — most important first>"],
          improvementSuggestions: [
            "<specific actionable suggestion 1>",
            "<specific actionable suggestion 2>",
            "<specific actionable suggestion 3>"
          ],
          feedback: "<2-3 sentences summarizing overall fit and top priority improvements>",
          usingProfileData: usingProfile
        })
      ].join("\n");

      // ── CALL 2: LaTeX optimization ───────────────
      const latexPrompt = [
        "You are an ATS-optimized resume editor.",
        "",
        "INPUT:",
        "1. LaTeX resume code",
        "2. Job Description (JD)",
        "",
        "TASK:",
        "Modify the resume STRICTLY based on the JD.",
        "",
        "CRITICAL RULES:",
        "",
        "1. DO NOT change LaTeX structure.",
        "2. DO NOT remove \\pagenumbering{gobble}",
        "3. DO NOT add page numbers.",
        "4. DO NOT add extra packages.",
        "5. DO NOT change margins or formatting.",
        "6. Output COMPLETE LaTeX code.",
        "7. Do NOT output explanations.",
        "8. Do NOT truncate the resume.",
        "9. Do NOT repeat any skill.",
        "10. Remove ALL duplicate skills.",
        "11. Remove irrelevant skills not matching JD.",
        "12. Keep skills realistic for an early-career candidate.",
        "13. Limit Technical Skills section to MAX 15–20 relevant skills only.",
        "14. Group skills properly (Programming, Backend, Database, Tools, etc.).",
        "15. Do NOT add “development” and “deployment” suffix repeatedly.",
        "16. If a skill appears multiple times, keep it ONLY ONCE.",
        "17. If JD focuses on Java Backend:",
        "   - Prioritize Java, OOP, Spring, REST, SQL, Git, SDLC, Testing",
        "   - Remove AI/ML, Robotics, IoT unless mentioned in JD.",
        "18. Modify Professional Summary to reflect JD keywords.",
        "19. Improve Projects section to align with JD:",
        "   - Add metrics (%, ms, users, etc.)",
        "   - Use action verbs",
        "   - Add relevant technologies from JD",
        "20. Ensure final resume is 1 page maximum.",
        "",
        "SKILLS CLEANING LOGIC:",
        "",
        "- Remove repeated entries.",
        "- Remove vague skills like:",
        '  "AI development, AI deployment"',
        '  "Web development development"',
        '  "Cloud security deployment"',
        '- Keep only base skill (Example: "Java", not "Java development deployment").',
        "- Merge similar skills:",
        '  - "Machine Learning development" → "Machine Learning"',
        '  - "DevOps deployment" → "CI/CD, Docker"',
        "",
        "FINAL OUTPUT FORMAT:",
        "Return only the complete corrected LaTeX code.",
        "No markdown.",
        "No commentary.",
        "No explanation.",
        "No truncation.",
        "Before generating output:",
        "",
        "Step 1: Extract JD keywords.",
        "Step 2: Match them against resume.",
        "Step 3: Identify missing but realistic keywords.",
        "Step 4: Remove irrelevant content.",
        "Step 5: Deduplicate skills.",
        "Step 6: Optimize bullet points with measurable impact.",
        "Step 7: Ensure resume remains concise and professional.",
        "Step 8: Validate no skill is repeated.",
        "",
        "JOB DESCRIPTION (JD):",
        truncatedJd,
        "",
        "CANDIDATE PROFILE:",
        profileStr,
        "",
        existingContent
          ? "INPUT LATEX RESUME:\n" + truncatedResume
          : "No existing resume. Generate a complete LaTeX resume from profile using pdflatex-safe packages (inputenc, T1 fontenc, geometry 0.75in, titlesec, enumitem, hyperref, charter). Include all standard sections with a strong Projects section.",
        "",
        "OUTPUT: Start immediately with \\documentclass — no preamble text."
      ].filter(Boolean).join("\n");

      // ── Execute both calls (parallel for speed) ───────────────────────────
      const PRIMARY_MODEL = "llama-3.1-8b-instant";
      const FALLBACK_MODEL = "llama-3.3-70b-versatile";

      const callGroq = async (prompt: string, jsonMode: boolean, model: string, maxTokens?: number): Promise<string> => {
        const c = await resumeGroq.chat.completions.create({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: jsonMode ? 0.1 : 0.3,
          max_completion_tokens: maxTokens || (jsonMode ? 512 : 6000),
          top_p: 0.9,
          stop: null,
          stream: false,
          ...(jsonMode ? { response_format: { type: "json_object" } } : {})
        });
        return c.choices[0]?.message?.content || "";
      };

      const withFallback = async (prompt: string, jsonMode: boolean): Promise<string> => {
        try {
          return await callGroq(prompt, jsonMode, PRIMARY_MODEL);
        } catch (e: any) {
          if (e?.status === 429) {
            try {
              return await callGroq(prompt, jsonMode, FALLBACK_MODEL);
            } catch (fe: any) {
              if (fe?.status === 429 || fe?.error?.error?.code === "rate_limit_exceeded") {
                const retryAfter = fe?.headers?.["retry-after"];
                const minutes = retryAfter ? Math.ceil(Number(retryAfter) / 60) : 15;
                throw Object.assign(new Error("RATE_LIMIT"), { isRateLimit: true, minutes });
              }
              throw fe;
            }
          }
          throw e;
        }
      };

      // LaTeX generation always uses the larger, more capable model — small models truncate or
      // produce empty LaTeX. ATS JSON uses the fast model first.
      const withLatexFallback = async (prompt: string): Promise<string> => {
        try {
          // Always start with the best model for LaTeX
          return await callGroq(prompt, false, FALLBACK_MODEL, 6000);
        } catch (e: any) {
          if (e?.status === 429 || e?.error?.error?.code === "rate_limit_exceeded") {
            const retryAfter = e?.headers?.["retry-after"];
            const minutes = retryAfter ? Math.ceil(Number(retryAfter) / 60) : 15;
            throw Object.assign(new Error("RATE_LIMIT"), { isRateLimit: true, minutes });
          }
          throw e;
        }
      };

      let atsRaw = "";
      let latexRaw = "";

      try {
        [atsRaw, latexRaw] = await Promise.all([
          withFallback(atsPrompt, true),
          withLatexFallback(latexPrompt)
        ]);
      } catch (e: any) {
        console.error("[ResumeGen] AI Provider error during generation:", e?.message || e);
        if (e?.isRateLimit || e?.status === 429 || e?.error?.error?.code === "rate_limit_exceeded") {
          return res.status(429).json({
            message: `AI processing limit reached. Please try again in ${e.minutes || 15} minutes.`
          });
        }
        // DO NOT THROW. Fallback gracefully without crashing
        atsRaw = "{}";
        latexRaw = existingContent || "\\documentclass{article}\\begin{document}\\section*{Resume (AI Unavailable)}\\end{document}";
      }

      // ── Parse ATS JSON (with full fallback) ───────────────────────────────
      let result: any = null;
      try { result = JSON.parse(atsRaw); } catch { /* try extracting */ }
      if (!result) {
        const fb = atsRaw.indexOf("{"), fe = atsRaw.lastIndexOf("}");
        if (fb !== -1 && fe !== -1) try { result = JSON.parse(atsRaw.substring(fb, fe + 1)); } catch { /* ignore */ }
      }
      if (!result || Object.keys(result).length === 0) {
        console.warn("[ResumeGen] ATS JSON parse failed or empty, using fallback scores");
        result = {
          atsScore: 72,
          sectionScores: { skills: 72, experience: 72, education: 72, formatting: 72 },
          missingKeywords: ["Consider adding more metrics"],
          feedback: "Resume optimized successfully via fallback (AI service unavailable).",
          usingProfileData: !existingContent
        };
      }
      result.atsScore = typeof result.atsScore === "number" ? result.atsScore : 72;
      result.sectionScores = result.sectionScores || { skills: 72, experience: 72, education: 72, formatting: 72 };
      result.missingKeywords = Array.isArray(result.missingKeywords) ? result.missingKeywords : [];
      result.jdKeywords = Array.isArray(result.jdKeywords) ? result.jdKeywords : [];
      result.resumeKeywords = Array.isArray(result.resumeKeywords) ? result.resumeKeywords : [];
      result.improvementSuggestions = Array.isArray(result.improvementSuggestions) ? result.improvementSuggestions : [];
      result.feedback = result.feedback || "Resume analyzed and optimized.";

      // ── Extract LaTeX (strip ALL accidental markdown fences) ────────────────
      let optimizedLatex = "";
      if (latexRaw) {
        // Globally remove ALL ``` fences (model sometimes adds multiple)
        const stripped = latexRaw
          .replace(/```latex/gi, "")
          .replace(/```tex/gi, "")
          .replace(/```[a-z]*/gi, "")
          .replace(/```/g, "")
          .trim();
        const latexStart = stripped.indexOf("\\documentclass");
        if (latexStart !== -1) {
          optimizedLatex = stripped.substring(latexStart).trim();
        } else if (stripped.length > 20) {
          // model returned something but without \documentclass — use it as-is
          optimizedLatex = stripped;
        } else {
          // Truly empty — fall back to original content
          console.warn("[ResumeGen] LaTeX output was empty, using original content as fallback");
          optimizedLatex = existingContent || "% Resume content unavailable. Please try again.";
        }
      } else {
        optimizedLatex = existingContent || "% Resume content unavailable. Please try again.";
      }

      // ── Save or update ────────────────────────────────────────────────────
      let targetResumeId = resumeId;
      if (!targetResumeId) {
        const newResume = await storage.createResume({
          userId,
          title: `Optimized: ${resumeTitle}`,
          content: existingContent || "Generated from profile",
          originalFilename: "profile_generated.pdf"
        });
        targetResumeId = newResume.id;
      }

      await storage.updateResumeAnalysis(targetResumeId, result.atsScore, result, optimizedLatex);

      res.json({ ...result, optimizedLatex, resumeId: targetResumeId });

    } catch (err: any) {
      console.error("[ResumeGen] Analysis Endpoint outer error:", err);

      // Handle Validation Errors Gracefully
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: `Validation error: ${err.errors[0]?.message}`
        });
      }

      if (err?.status === 429 || err?.error?.error?.code === "rate_limit_exceeded") {
        const retryAfter = err?.headers?.["retry-after"];
        const minutes = retryAfter ? Math.ceil(Number(retryAfter) / 60) : 15;
        return res.status(429).json({ message: `AI processing limit reached. Please try again in ${minutes} minutes.` });
      }

      // If we STILL hit an error (e.g., db failure), ensure we return a clean 500 error object
      res.status(500).json({ message: "Resume analysis encountered an unexpected server error." });
    }
  });

  // Jobs
  app.get(api.jobs.list.path, checkAuth, async (req, res) => {
    const userId = req.user!.id;
    const limitCount = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const summary = req.query.summary === "true";
    const jobs = await storage.getUserJobs(userId, limitCount, summary);
    res.json(jobs);
  });

  app.post(api.jobs.create.path, checkAuth, async (req, res) => {
    // Authenticated user
    const user = req.user!;
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

  app.delete(api.jobs.delete.path, checkAuth, async (req, res) => {
    const id = req.params.id as string;
    const userId = req.user!.id;

    try {
      const job = await storage.getJob(id);
      if (!job) return res.status(404).json({ message: "Job not found" });

      // Verify ownership
      if (job.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized to delete this job" });
      }

      await storage.deleteJob(id);
      res.json({ message: "Job deleted successfully" });
    } catch (error) {
      console.error("Delete job error:", error);
      res.status(500).json({ message: "Failed to delete job" });
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

  // Job Seekers Section
  app.get("/api/jobs/discovery", checkAuth, async (req, res) => {
    try {
      const filters = {
        q: req.query.q as string,
        experience: req.query.experience as string,
        location: req.query.location as string,
        type: req.query.type as string,
        time: req.query.time as string,
        startupOnly: req.query.startupOnly === "true",
        roleCategory: req.query.roleCategory as string
      };

      const jobs = await JobService.searchJobs(req.user!.id, filters);
      res.json(jobs);
    } catch (error) {
      console.error("Discovery jobs error:", error);
      res.status(500).json({ message: "Failed to fetch discovery jobs" });
    }
  });

  app.get("/api/jobs/recommendations", checkAuth, async (req, res) => {
    try {
      const recommendations = await JobService.getRecommendations(req.user!.id);
      res.json(recommendations);
    } catch (error) {
      console.error("Recommendations error:", error);
      res.status(500).json({ message: "Failed to fetch recommendations" });
    }
  });

  app.get("/api/jobs/saved", checkAuth, async (req, res) => {
    try {
      const saved = await storage.getSavedJobs(req.user!.id);
      res.json(saved);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch saved jobs" });
    }
  });

  // ─── Helper: resolve job details from cache OR client-provided fallback ──────
  async function resolveJob(jobId: string, clientJobData: any) {
    const allDiscoveryJobs = await JobService.getMockDiscoveryJobs();
    const fromCache = allDiscoveryJobs.find((j: any) => j.id === jobId);
    return fromCache ?? clientJobData ?? null;
  }

  // ─── SAVE / BOOKMARK ── status always = "new" ────────────────────────────────
  app.post("/api/jobs/save", checkAuth, async (req, res) => {
    try {
      const { jobId, jobData: clientJobData } = req.body;
      const userId = req.user!.id;
      const discoveryJob = await resolveJob(jobId, clientJobData);
      if (!discoveryJob) return res.status(404).json({ message: "Job not found." });

      const existingJobs = await storage.getUserJobs(userId);
      const alreadyTracked = existingJobs.find(j =>
        (discoveryJob.url && j.url === discoveryJob.url) ||
        (j.title?.toLowerCase() === discoveryJob.title?.toLowerCase() &&
          j.company?.toLowerCase() === discoveryJob.company?.toLowerCase())
      );

      if (alreadyTracked) {
        if (alreadyTracked.status === "new") {
          return res.status(200).json({ message: "Already in Wishlist", id: alreadyTracked.id, alreadyExisted: true });
        }
        // Downgrade "applied" → "new" when user bookmarks again
        await storage.updateJob(alreadyTracked.id, { status: "new" });
        return res.status(200).json({ message: "Moved to Wishlist", id: alreadyTracked.id, alreadyExisted: true, statusChanged: true });
      }

      const jobRecord = insertJobSchema.parse({
        userId,
        title: discoveryJob.title,
        company: discoveryJob.company,
        location: discoveryJob.location || "Remote",
        description: discoveryJob.description || "",
        skills: discoveryJob.skills || "",
        experienceRequired: discoveryJob.experienceRequired || "N/A",
        source: discoveryJob.source || "Job Seekers",
        url: discoveryJob.url || "",
        status: "new",            // ← ALWAYS "new" for Bookmark/Save
        postedDate: discoveryJob.postedDate || new Date().toLocaleDateString(),
        employmentType: discoveryJob.employmentType || "Full-time"
      });

      const newJob = await storage.createJob(jobRecord);
      res.status(201).json({ ...newJob, alreadyExisted: false });
    } catch (error) {
      console.error("[Save] error:", error);
      res.status(500).json({ message: "Failed to save job" });
    }
  });

  // ─── APPLY NOW ── status always = "applied" ──────────────────────────────────
  app.post("/api/jobs/apply", checkAuth, async (req, res) => {
    try {
      const { jobId, jobData: clientJobData } = req.body;
      const userId = req.user!.id;
      const discoveryJob = await resolveJob(jobId, clientJobData);
      if (!discoveryJob) return res.status(404).json({ message: "Job not found." });

      const appliedDate = new Date().toISOString();
      const existingJobs = await storage.getUserJobs(userId);
      const alreadyTracked = existingJobs.find(j =>
        (discoveryJob.url && j.url === discoveryJob.url) ||
        (j.title?.toLowerCase() === discoveryJob.title?.toLowerCase() &&
          j.company?.toLowerCase() === discoveryJob.company?.toLowerCase())
      );

      if (alreadyTracked) {
        if (alreadyTracked.status !== "applied") {
          // Upgrade saved/wishlist → applied
          await storage.updateJob(alreadyTracked.id, { status: "applied", appliedDate });
          return res.status(200).json({ message: "Moved to Applied", id: alreadyTracked.id, alreadyExisted: true, statusChanged: true });
        }
        return res.status(200).json({ message: "Already Applied", id: alreadyTracked.id, alreadyExisted: true, statusChanged: false });
      }

      const jobRecord = insertJobSchema.parse({
        userId,
        title: discoveryJob.title,
        company: discoveryJob.company,
        location: discoveryJob.location || "Remote",
        description: discoveryJob.description || "",
        skills: discoveryJob.skills || "",
        experienceRequired: discoveryJob.experienceRequired || "N/A",
        source: discoveryJob.source || "Job Seekers",
        url: discoveryJob.url || "",
        status: "applied",        // ← ALWAYS "applied" for Apply Now
        appliedDate,
        postedDate: discoveryJob.postedDate || new Date().toLocaleDateString(),
        employmentType: discoveryJob.employmentType || "Full-time"
      });

      const newJob = await storage.createJob(jobRecord);
      res.status(201).json({ ...newJob, appliedDate, alreadyExisted: false });
    } catch (error) {
      console.error("[Apply] error:", error);
      res.status(500).json({ message: "Failed to apply for job" });
    }
  });


  app.delete("/api/jobs/saved/:id", checkAuth, async (req, res) => {
    try {
      await storage.unsaveJob(req.user!.id, req.params.id as string);
      res.json({ message: "Unsaved successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to unsave job" });
    }
  });

  // Interview Routes
  app.post("/api/interviews", checkAuth, async (req, res) => {
    try {
      const user = req.user!;
      const { domain, difficulty, questionCount, type } = req.body;

      // Create interview record
      const interviewData = insertInterviewSchema.parse({
        userId: user.id,
        domain,
        difficulty,
        type: type || "technical",
        questionCount: Number(questionCount) || 5,
        status: "in-progress"
      });

      const interview = await storage.createInterview(interviewData);

      // Generate questions via AI
      const questionsData = await generateInterviewQuestions(domain, difficulty, interview.questionCount);

      // Save questions to DB
      const savedQuestions = [];
      for (let i = 0; i < questionsData.length; i++) {
        const q = questionsData[i];
        const savedQ = await storage.addQuestion({
          interviewId: interview.id,
          question: q.question,
          type: q.type || "technical",
          expectedAnswer: q.expectedAnswer,
          order: i + 1
        });
        savedQuestions.push(savedQ);
      }

      res.status(201).json({ interview, questions: savedQuestions });
    } catch (error) {
      console.error("Create interview error:", error);
      res.status(500).json({ message: "Failed to create interview" });
    }
  });

  app.get("/api/interviews/:id", checkAuth, async (req, res) => {
    try {
      const interviewId = req.params.id as string;
      const interview = await storage.getInterview(interviewId);
      if (!interview) return res.status(404).json({ message: "Interview not found" });

      const questions = await storage.getInterviewQuestions(interview.id);
      res.json({ interview, questions });
    } catch (error) {
      console.error("Get interview error:", error);
      res.status(500).json({ message: "Failed to fetch interview" });
    }
  });

  app.post("/api/interviews/:id/responses", checkAuth, upload.single("audio"), async (req, res) => {
    try {
      const interviewId = req.params.id as string;
      const { userTranscript } = req.body;
      const questionId = req.body.questionId as string;
      let finalTranscript = userTranscript || "";

      // Handle Audio Upload if present
      let audioUrl = ""; // In a real app, upload to cloud storage
      if (req.file) {
        const tempPath = path.join(os.tmpdir(), `audio-${Date.now()}.webm`);
        fs.writeFileSync(tempPath, req.file.buffer);
        try {
          // Transcribe
          const transcribedText = await transcribeAudio(tempPath);
          if (transcribedText) {
            finalTranscript = transcribedText;
          }
        } finally {
          fs.unlinkSync(tempPath);
        }
      }

      const questionData = await storage.getInterviewQuestions(interviewId);
      const question = questionData.find(q => q.id === questionId);
      if (!question) return res.status(404).json({ message: "Question not found" });

      // Evaluate
      const evaluation = await evaluateAnswer(question.question, finalTranscript);

      // Save Response
      const responseData = {
        interviewId,
        questionId,
        userAudioUrl: audioUrl, // Placeholder
        userTranscript: finalTranscript,
        aiFeedbackJson: evaluation,
        metricsJson: {} // Placeholder for frontend metrics if sent
      };

      const response = await storage.addResponse(responseData);

      res.status(201).json(response);
    } catch (error) {
      console.error("Submit response error:", error);
      res.status(500).json({ message: "Failed to submit response" });
    }
  });

  app.get("/api/interviews/:id/results", checkAuth, async (req, res) => {
    try {
      const interviewId = req.params.id as string;
      const interview = await storage.getInterview(interviewId);
      if (!interview) return res.status(404).json({ message: "Interview not found" });

      const responses = await storage.getInterviewResponses(interviewId);

      // Calculate aggregates
      let totalScore = 0;
      let totalCommunication = 0;
      let totalTechnical = 0;
      const count = responses.length;

      if (count > 0) {
        responses.forEach(r => {
          const fb = r.aiFeedbackJson as any;
          totalScore += fb?.score || 0;
          totalCommunication += fb?.clarity || 0;
          totalTechnical += fb?.technicalAccuracy || 0;
        });
      }

      const aggregates = {
        overallScore: count ? Math.round(totalScore / count) : 0,
        communicationScore: count ? Math.round(totalCommunication / count) : 0,
        technicalScore: count ? Math.round(totalTechnical / count) : 0,
        questionsAnswered: count
      };

      res.json({ interview, responses, aggregates });
    } catch (error) {
      console.error("Get results error:", error);
      res.status(500).json({ message: "Failed to fetch results" });
    }
  });

  app.get("/api/dashboard/stats", checkAuth, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats(req.user!.id);
      res.json(stats);
    } catch (error) {
      console.error("Dashboard stats error:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Profile / Account Routes
  app.get(api.profile.getFull.path, checkAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const profile = await storage.getFullProfile(userId);
      res.json(profile);
    } catch (error) {
      console.error("Get profile error:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  app.patch(api.profile.personalInfo.update.path, checkAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const data = req.body;
      const updated = await storage.updatePersonalInfo(userId, { ...data, userId });
      res.json(updated);
    } catch (error) {
      console.error("Update personal info error:", error);
      res.status(500).json({ message: "Failed to update personal info" });
    }
  });

  // Education
  app.get(api.profile.education.list.path, checkAuth, async (req, res) => {
    const list = await storage.getEducation(req.user!.id);
    res.json(list);
  });
  app.post(api.profile.education.add.path, checkAuth, async (req, res) => {
    const data = await storage.addEducation({ ...req.body, userId: req.user!.id });
    res.status(201).json(data);
  });
  app.patch(api.profile.education.update.path, checkAuth, async (req, res) => {
    const data = await storage.updateEducation(req.params.id as string, req.body);
    res.json(data);
  });
  app.delete(api.profile.education.delete.path, checkAuth, async (req, res) => {
    await storage.deleteEducation(req.params.id as string);
    res.json({ message: "Deleted" });
  });

  // Experience
  app.get(api.profile.experience.list.path, checkAuth, async (req, res) => {
    const list = await storage.getExperience(req.user!.id);
    res.json(list);
  });
  app.post(api.profile.experience.add.path, checkAuth, async (req, res) => {
    const data = await storage.addExperience({ ...req.body, userId: req.user!.id });
    res.status(201).json(data);
  });
  app.patch(api.profile.experience.update.path, checkAuth, async (req, res) => {
    const data = await storage.updateExperience(req.params.id as string, req.body);
    res.json(data);
  });
  app.delete(api.profile.experience.delete.path, checkAuth, async (req, res) => {
    await storage.deleteExperience(req.params.id as string);
    res.json({ message: "Deleted" });
  });

  // Projects
  app.get(api.profile.projects.list.path, checkAuth, async (req, res) => {
    const list = await storage.getProjects(req.user!.id);
    res.json(list);
  });
  app.post(api.profile.projects.add.path, checkAuth, async (req, res) => {
    const data = await storage.addProject({ ...req.body, userId: req.user!.id });
    res.status(201).json(data);
  });
  app.patch(api.profile.projects.update.path, checkAuth, async (req, res) => {
    const data = await storage.updateProject(req.params.id as string, req.body);
    res.json(data);
  });
  app.delete(api.profile.projects.delete.path, checkAuth, async (req, res) => {
    await storage.deleteProject(req.params.id as string);
    res.json({ message: "Deleted" });
  });

  // Skills
  app.get(api.profile.skills.list.path, checkAuth, async (req, res) => {
    const list = await storage.getSkills(req.user!.id);
    res.json(list);
  });
  app.post(api.profile.skills.add.path, checkAuth, async (req, res) => {
    const data = await storage.addSkill({ ...req.body, userId: req.user!.id });
    res.status(201).json(data);
  });
  app.delete(api.profile.skills.delete.path, checkAuth, async (req, res) => {
    await storage.deleteSkill(req.params.id as string);
    res.json({ message: "Deleted" });
  });

  // Certifications
  app.get(api.profile.certifications.list.path, checkAuth, async (req, res) => {
    const list = await storage.getCertifications(req.user!.id);
    res.json(list);
  });
  app.post(api.profile.certifications.add.path, checkAuth, async (req, res) => {
    const data = await storage.addCertification({ ...req.body, userId: req.user!.id });
    res.status(201).json(data);
  });
  app.patch(api.profile.certifications.update.path, checkAuth, async (req, res) => {
    const data = await storage.updateCertification(req.params.id as string, req.body);
    res.json(data);
  });
  app.delete(api.profile.certifications.delete.path, checkAuth, async (req, res) => {
    await storage.deleteCertification(req.params.id as string);
    res.json({ message: "Deleted" });
  });

  // Achievements
  app.get(api.profile.achievements.list.path, checkAuth, async (req, res) => {
    const list = await storage.getAchievements(req.user!.id);
    res.json(list);
  });
  app.post(api.profile.achievements.add.path, checkAuth, async (req, res) => {
    const data = await storage.addAchievement({ ...req.body, userId: req.user!.id });
    res.status(201).json(data);
  });
  app.patch(api.profile.achievements.update.path, checkAuth, async (req, res) => {
    const data = await storage.updateAchievement(req.params.id as string, req.body);
    res.json(data);
  });
  app.delete(api.profile.achievements.delete.path, checkAuth, async (req, res) => {
    await storage.deleteAchievement(req.params.id as string);
    res.json({ message: "Deleted" });
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

  // await seedDatabase();

  return httpServer;
}
