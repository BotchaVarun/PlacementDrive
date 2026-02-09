import { db } from "./db";
import { users, resumes, jobs, type User, type InsertUser, type Resume, type InsertResume, type Job, type InsertJob } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByFirebaseUid(uid: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Resumes
  createResume(resume: InsertResume): Promise<Resume>;
  getResume(id: number): Promise<Resume | undefined>;
  getUserResumes(userId: number): Promise<Resume[]>;
  updateResumeAnalysis(id: number, atsScore: number, analysisJson: any, latexContent: string): Promise<Resume>;

  // Jobs
  createJob(job: InsertJob): Promise<Job>;
  getJob(id: number): Promise<Job | undefined>;
  getUserJobs(userId: number): Promise<Job[]>;
  getJobs(): Promise<Job[]>; // For general list
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByFirebaseUid(uid: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.firebaseUid, uid));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Resumes
  async createResume(resume: InsertResume): Promise<Resume> {
    const [newResume] = await db.insert(resumes).values(resume).returning();
    return newResume;
  }

  async getResume(id: number): Promise<Resume | undefined> {
    const [resume] = await db.select().from(resumes).where(eq(resumes.id, id));
    return resume;
  }

  async getUserResumes(userId: number): Promise<Resume[]> {
    return db.select().from(resumes).where(eq(resumes.userId, userId)).orderBy(desc(resumes.createdAt));
  }

  async updateResumeAnalysis(id: number, atsScore: number, analysisJson: any, latexContent: string): Promise<Resume> {
    const [updated] = await db.update(resumes)
      .set({ atsScore, analysisJson, latexContent })
      .where(eq(resumes.id, id))
      .returning();
    return updated;
  }

  // Jobs
  async createJob(job: InsertJob): Promise<Job> {
    const [newJob] = await db.insert(jobs).values(job).returning();
    return newJob;
  }

  async getJob(id: number): Promise<Job | undefined> {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    return job;
  }

  async getUserJobs(userId: number): Promise<Job[]> {
    return db.select().from(jobs).where(eq(jobs.userId, userId)).orderBy(desc(jobs.createdAt));
  }

  async getJobs(): Promise<Job[]> {
    return db.select().from(jobs).orderBy(desc(jobs.createdAt)).limit(50);
  }
}

export const storage = new DatabaseStorage();
