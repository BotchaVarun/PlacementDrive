import { z } from "zod";

export const insertUserSchema = z.object({
  firebaseUid: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
});

export const userSchema = insertUserSchema.extend({
  id: z.string(),
  createdAt: z.date(),
});

export const insertResumeSchema = z.object({
  userId: z.string(),
  title: z.string(),
  content: z.string(),
  originalFilename: z.string().optional(),
});

export const resumeSchema = insertResumeSchema.extend({
  id: z.string(),
  atsScore: z.number().optional(),
  analysisJson: z.any().optional(),
  latexContent: z.string().optional(),
  createdAt: z.date(),
});

export const insertJobSchema = z.object({
  userId: z.string(),
  title: z.string(),
  company: z.string(),
  description: z.string(),
  source: z.string().optional(),
  url: z.string().optional(),
  matchScore: z.number().optional(),
  status: z.string().default("new"),
});

export const jobSchema = insertJobSchema.extend({
  id: z.string(),
  createdAt: z.date(),
});

// Chat schemas
export const insertConversationSchema = z.object({
  title: z.string(),
});

export const conversationSchema = insertConversationSchema.extend({
  id: z.string(),
  createdAt: z.date(),
});

export const insertMessageSchema = z.object({
  conversationId: z.string(),
  role: z.string(), // 'user' or 'system' or 'assistant'
  content: z.string(),
});

export const messageSchema = insertMessageSchema.extend({
  id: z.string(),
  createdAt: z.date(),
});

// Types
export type User = z.infer<typeof userSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Resume = z.infer<typeof resumeSchema>;
export type InsertResume = z.infer<typeof insertResumeSchema>;

export type Job = z.infer<typeof jobSchema>;
export type InsertJob = z.infer<typeof insertJobSchema>;

export type Conversation = z.infer<typeof conversationSchema>;
export type InsertConversation = z.infer<typeof insertConversationSchema>;

export type Message = z.infer<typeof messageSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

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

// Start Exposing schemas for use in routes
export const users = { $inferSelect: {} as User };
export const resumes = { $inferSelect: {} as Resume };
export const jobs = { $inferSelect: {} as Job };
export const conversations = { $inferSelect: {} as Conversation };
export const messages = { $inferSelect: {} as Message };
