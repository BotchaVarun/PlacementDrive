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
  userId: z.string().optional(),
  title: z.string().optional().default("Untitled Position"),
  company: z.string().optional().default("Unknown Company"),
  location: z.string().optional(),
  description: z.string().optional().default(""),
  qualifications: z.string().optional(),
  skills: z.string().optional(),
  experienceRequired: z.string().optional(),
  source: z.string().optional(),
  url: z.string().optional(),
  matchScore: z.number().optional(),
  status: z.string().optional().default("new"),
  postedDate: z.string().optional(),
  appliedDate: z.string().nullable().optional(),
  employmentType: z.string().optional(),
  companyLogo: z.string().optional(),
  notes: z.string().optional(),
});

export const jobSchema = insertJobSchema.extend({
  id: z.string(),
  createdAt: z.date(),
});

export const insertJobSourceSchema = z.object({
  name: z.string(),
  baseUrl: z.string(),
  active: z.boolean().default(true),
});

export const jobSourceSchema = insertJobSourceSchema.extend({
  id: z.string(),
});

export const insertJobRecommendationSchema = z.object({
  userId: z.string(),
  jobId: z.string(),
  matchScore: z.number(),
  matchedSkills: z.array(z.string()),
  category: z.string(), // 'Strong Match', etc.
  reasoning: z.string().optional(),
});

export const jobRecommendationSchema = insertJobRecommendationSchema.extend({
  id: z.string(),
  createdAt: z.date(),
});

export const insertSavedJobSchema = z.object({
  userId: z.string(),
  jobId: z.string(),
});

export const savedJobSchema = insertSavedJobSchema.extend({
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

// Career Data Schemas
export const insertPersonalInfoSchema = z.object({
  userId: z.string(),
  fullName: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
  linkedinUrl: z.string().optional(),
  githubUrl: z.string().optional(),
  portfolioUrl: z.string().optional(),
  location: z.string().optional(),
  summary: z.string().optional(),
  photoBase64: z.string().optional(),
});

export const personalInfoSchema = insertPersonalInfoSchema.extend({
  id: z.string(),
  createdAt: z.date(),
});

export const insertEducationSchema = z.object({
  userId: z.string(),
  degree: z.string(),
  fieldOfStudy: z.string(),
  institution: z.string(),
  university: z.string().optional(),
  startYear: z.string(),
  endYear: z.string(),
  cgpa: z.string().optional(),
  coursework: z.string().optional(),
});

export const educationSchema = insertEducationSchema.extend({
  id: z.string(),
  createdAt: z.date(),
});

export const insertExperienceSchema = z.object({
  userId: z.string(),
  title: z.string(),
  company: z.string(),
  location: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
  type: z.enum(["Internship", "Full-time", "Freelance"]),
  description: z.string(), // Supporting multi-line bullet points
});

export const experienceSchema = insertExperienceSchema.extend({
  id: z.string(),
  createdAt: z.date(),
});

export const insertProjectSchema = z.object({
  userId: z.string(),
  title: z.string(),
  technologies: z.string(), // comma separated
  url: z.string().optional(),
  description: z.string(),
  keyAchievements: z.string().optional(),
});

export const projectSchema = insertProjectSchema.extend({
  id: z.string(),
  createdAt: z.date(),
});

export const insertSkillSchema = z.object({
  userId: z.string(),
  category: z.enum(["Programming Languages", "Frameworks", "Tools", "Databases", "Soft Skills"]),
  name: z.string(),
});

export const skillSchema = insertSkillSchema.extend({
  id: z.string(),
  createdAt: z.date(),
});

export const insertCertificationSchema = z.object({
  userId: z.string(),
  name: z.string(),
  issuer: z.string(),
  date: z.string(),
  credentialId: z.string().optional(),
  link: z.string().optional(),
});

export const certificationSchema = insertCertificationSchema.extend({
  id: z.string(),
  createdAt: z.date(),
});

export const insertAchievementSchema = z.object({
  userId: z.string(),
  title: z.string(),
  description: z.string(),
  date: z.string(),
  link: z.string().optional(),
});

export const achievementSchema = insertAchievementSchema.extend({
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

export type JobSource = z.infer<typeof jobSourceSchema>;
export type InsertJobSource = z.infer<typeof insertJobSourceSchema>;

export type JobRecommendation = z.infer<typeof jobRecommendationSchema>;
export type InsertJobRecommendation = z.infer<typeof insertJobRecommendationSchema>;

export type SavedJob = z.infer<typeof savedJobSchema>;
export type InsertSavedJob = z.infer<typeof insertSavedJobSchema>;

export type Conversation = z.infer<typeof conversationSchema>;
export type InsertConversation = z.infer<typeof insertConversationSchema>;

export type Message = z.infer<typeof messageSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type PersonalInfo = z.infer<typeof personalInfoSchema>;
export type InsertPersonalInfo = z.infer<typeof insertPersonalInfoSchema>;

export type Education = z.infer<typeof educationSchema>;
export type InsertEducation = z.infer<typeof insertEducationSchema>;

export type Experience = z.infer<typeof experienceSchema>;
export type InsertExperience = z.infer<typeof insertExperienceSchema>;

export type Project = z.infer<typeof projectSchema>;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export type Skill = z.infer<typeof skillSchema>;
export type InsertSkill = z.infer<typeof insertSkillSchema>;

export type Certification = z.infer<typeof certificationSchema>;
export type InsertCertification = z.infer<typeof insertCertificationSchema>;

export type Achievement = z.infer<typeof achievementSchema>;
export type InsertAchievement = z.infer<typeof insertAchievementSchema>;

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
export const jobSources = { $inferSelect: {} as JobSource };
export const jobRecommendations = { $inferSelect: {} as JobRecommendation };
export const savedJobs = { $inferSelect: {} as SavedJob };
export const conversations = { $inferSelect: {} as Conversation };
export const messages = { $inferSelect: {} as Message };

// Interview Schemas
export const insertInterviewSchema = z.object({
  userId: z.string(),
  domain: z.string(),
  difficulty: z.string(),
  type: z.string(), // Technical, HR, Mixed
  questionCount: z.number(),
  status: z.string().default("in-progress"), // in-progress, completed
  overallScore: z.number().optional(),
  feedback: z.string().optional(),
});

export const interviewSchema = insertInterviewSchema.extend({
  id: z.string(),
  createdAt: z.date(),
});

export const insertQuestionSchema = z.object({
  interviewId: z.string(),
  question: z.string(),
  type: z.string(), // technical, hr
  expectedAnswer: z.string().optional(),
  order: z.number(),
});

export const questionSchema = insertQuestionSchema.extend({
  id: z.string(),
  createdAt: z.date(),
});

export const insertResponseSchema = z.object({
  interviewId: z.string(),
  questionId: z.string(),
  userAudioUrl: z.string().optional(),
  userTranscript: z.string().optional(),
  aiFeedbackJson: z.any().optional(), // Stores technical, communication, etc. scores
  metricsJson: z.any().optional(), // Stores raw metrics like filler words count
});

export const responseSchema = insertResponseSchema.extend({
  id: z.string(),
  createdAt: z.date(),
});

// Interview Types
export type Interview = z.infer<typeof interviewSchema>;
export type InsertInterview = z.infer<typeof insertInterviewSchema>;

export type Question = z.infer<typeof questionSchema>;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;

export type Response = z.infer<typeof responseSchema>;
export type InsertResponse = z.infer<typeof insertResponseSchema>;

export const interviews = { $inferSelect: {} as Interview };
export const interviewQuestions = { $inferSelect: {} as Question };
export const interviewResponses = { $inferSelect: {} as Response };

// Profile Section Schemas (for API use)
export const userPersonalInfo = personalInfoSchema;
export const userEducation = educationSchema;
export const userExperience = experienceSchema;
export const userProjects = projectSchema;
export const userSkills = skillSchema;
export const userCertifications = certificationSchema;
export const userAchievements = achievementSchema;
