import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  firebaseUid: text("firebase_uid").unique().notNull(),
  email: text("email").notNull(),
  name: text("name"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const resumes = pgTable("resumes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  title: text("title").notNull(),
  content: text("content").notNull(), // Extracted text or LaTeX
  originalFilename: text("original_filename"),
  atsScore: integer("ats_score"),
  analysisJson: jsonb("analysis_json"), // Store full analysis structure
  latexContent: text("latex_content"), // The optimized LaTeX code
  createdAt: timestamp("created_at").defaultNow(),
});

export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id), // User who saved/viewed this job
  title: text("title").notNull(),
  company: text("company").notNull(),
  description: text("description").notNull(),
  source: text("source"), // LinkedIn, Indeed, Mock, etc.
  url: text("url"),
  matchScore: integer("match_score"), // Score relative to the user's active resume
  status: text("status").default("new"), // new, applied, rejected, interview
  createdAt: timestamp("created_at").defaultNow(),
});

// Schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertResumeSchema = createInsertSchema(resumes).omit({ id: true, createdAt: true, atsScore: true, analysisJson: true, latexContent: true });
export const insertJobSchema = createInsertSchema(jobs).omit({ id: true, createdAt: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Resume = typeof resumes.$inferSelect;
export type InsertResume = z.infer<typeof insertResumeSchema>;
export type Job = typeof jobs.$inferSelect;
export type InsertJob = z.infer<typeof insertJobSchema>;

// API Types
export type AnalyzeResumeRequest = {
  resumeContent: string;
  jobDescription: string;
};

export type AnalyzeResumeResponse = {
  atsScore: number;
  missingKeywords: string[];
  feedback: string;
  optimizedLatex: string;
};
