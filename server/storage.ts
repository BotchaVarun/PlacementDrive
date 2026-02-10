import { db } from "./lib/firebase"; // Use our new Firebase setup
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp
} from "firebase/firestore";
import {
  User, InsertUser,
  Resume, InsertResume,
  Job, InsertJob,
  Conversation, InsertConversation,
  Message, InsertMessage
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByFirebaseUid(uid: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Resumes
  createResume(resume: InsertResume): Promise<Resume>;
  getResume(id: string): Promise<Resume | undefined>;
  getUserResumes(userId: string): Promise<Resume[]>;
  updateResumeAnalysis(id: string, atsScore: number, analysisJson: any, latexContent: string): Promise<Resume>;

  // Jobs
  createJob(job: InsertJob): Promise<Job>;
  getJob(id: string): Promise<Job | undefined>;
  getUserJobs(userId: string): Promise<Job[]>;
  getJobs(): Promise<Job[]>; // For general list
  updateJob(id: string, job: Partial<InsertJob>): Promise<Job>;
}

export interface IChatStorage {
  getConversation(id: string): Promise<Conversation | undefined>;
  getAllConversations(): Promise<Conversation[]>;
  createConversation(title: string): Promise<Conversation>;
  deleteConversation(id: string): Promise<void>;
  getMessagesByConversation(conversationId: string): Promise<Message[]>;
  createMessage(conversationId: string, role: string, content: string): Promise<Message>;
}

export class FirestoreStorage implements IStorage {
  // Helpers
  private convertDate(data: any): any {
    if (!data) return data;
    const newData = { ...data };
    if (newData.createdAt && newData.createdAt instanceof Timestamp) {
      newData.createdAt = newData.createdAt.toDate();
    }
    return newData;
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    const docRef = doc(db, "users", id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return undefined;
    return { id: docSnap.id, ...this.convertDate(docSnap.data()) } as User;
  }

  async getUserByFirebaseUid(uid: string): Promise<User | undefined> {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("firebaseUid", "==", uid));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return undefined;
    const docSnap = querySnapshot.docs[0];
    return { id: docSnap.id, ...this.convertDate(docSnap.data()) } as User;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const usersRef = collection(db, "users");
    const now = new Date();
    const docRef = await addDoc(usersRef, { ...insertUser, createdAt: now });
    return { id: docRef.id, ...insertUser, createdAt: now } as User;
  }

  // Resumes
  async createResume(resume: InsertResume): Promise<Resume> {
    const resumesRef = collection(db, "resumes");
    const now = new Date();
    const docRef = await addDoc(resumesRef, {
      ...resume,
      atsScore: null,
      analysisJson: null,
      latexContent: null,
      createdAt: now
    });
    return {
      id: docRef.id,
      ...resume,
      atsScore: undefined,
      analysisJson: undefined,
      latexContent: undefined,
      createdAt: now
    } as Resume;
  }

  async getResume(id: string): Promise<Resume | undefined> {
    const docRef = doc(db, "resumes", id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return undefined;
    return { id: docSnap.id, ...this.convertDate(docSnap.data()) } as Resume;
  }

  async getUserResumes(userId: string): Promise<Resume[]> {
    const resumesRef = collection(db, "resumes");
    const q = query(resumesRef, where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs
      .map(doc => ({ id: doc.id, ...this.convertDate(doc.data()) } as Resume))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updateResumeAnalysis(id: string, atsScore: number, analysisJson: any, latexContent: string): Promise<Resume> {
    const docRef = doc(db, "resumes", id);
    await updateDoc(docRef, { atsScore, analysisJson, latexContent });
    const updated = await this.getResume(id);
    if (!updated) throw new Error("Resume not found after update");
    return updated;
  }

  // Jobs
  async createJob(job: InsertJob): Promise<Job> {
    const jobsRef = collection(db, "jobs");
    const now = new Date();
    const docRef = await addDoc(jobsRef, { ...job, createdAt: now });
    return { id: docRef.id, ...job, createdAt: now } as Job;
  }

  async getJob(id: string): Promise<Job | undefined> {
    const docRef = doc(db, "jobs", id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return undefined;
    return { id: docSnap.id, ...this.convertDate(docSnap.data()) } as Job;
  }

  async getUserJobs(userId: string): Promise<Job[]> {
    const jobsRef = collection(db, "jobs");
    const q = query(jobsRef, where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs
      .map(doc => ({ id: doc.id, ...this.convertDate(doc.data()) } as Job))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getJobs(): Promise<Job[]> {
    const jobsRef = collection(db, "jobs");
    const q = query(jobsRef, orderBy("createdAt", "desc"), limit(50));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...this.convertDate(doc.data()) } as Job));
  }

  async updateJob(id: string, job: Partial<InsertJob>): Promise<Job> {
    const docRef = doc(db, "jobs", id);
    await updateDoc(docRef, job);
    return this.getJob(id) as Promise<Job>;
  }
}

export const storage = new FirestoreStorage();
