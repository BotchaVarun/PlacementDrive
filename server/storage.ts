import { db } from "./lib/firebase.js"; // Use our new Firebase setup
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
  Timestamp,
  deleteDoc,
  getCountFromServer,
  Bytes
} from "firebase/firestore";
import {
  User, InsertUser,
  Resume, InsertResume,
  Job, InsertJob,
  Conversation, InsertConversation,
  Message, InsertMessage,
  Interview, InsertInterview,
  Question, InsertQuestion,
  Response, InsertResponse,
  PersonalInfo, InsertPersonalInfo,
  Education, InsertEducation,
  Experience, InsertExperience,
  Project, InsertProject,
  Skill, InsertSkill,
  Certification, InsertCertification,
  Achievement, InsertAchievement,
  JobSource, InsertJobSource,
  JobRecommendation, InsertJobRecommendation,
  SavedJob, InsertSavedJob
} from "../shared/schema.js";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByFirebaseUid(uid: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Resumes
  createResume(resume: InsertResume): Promise<Resume>;
  getResume(id: string): Promise<Resume | undefined>;
  getUserResumes(userId: string, limitCount?: number, summary?: boolean): Promise<Resume[]>;
  updateResumeAnalysis(id: string, atsScore: number, analysisJson: any, latexContent: string): Promise<Resume>;

  // Jobs
  createJob(job: InsertJob): Promise<Job>;
  getJob(id: string): Promise<Job | undefined>;
  getUserJobs(userId: string, limitCount?: number, summary?: boolean): Promise<Job[]>;
  getJobs(): Promise<Job[]>; // For general list
  updateJob(id: string, job: Partial<InsertJob>): Promise<Job>;
  deleteJob(id: string): Promise<void>;

  // Interviews
  createInterview(interview: InsertInterview): Promise<Interview>;
  getInterview(id: string): Promise<Interview | undefined>;
  addQuestion(question: InsertQuestion): Promise<Question>;
  addResponse(response: InsertResponse): Promise<Response>;
  getInterviewQuestions(interviewId: string): Promise<Question[]>;
  getInterviewResponses(interviewId: string): Promise<Response[]>;

  // Profile / Account
  getPersonalInfo(userId: string): Promise<PersonalInfo | undefined>;
  updatePersonalInfo(userId: string, data: InsertPersonalInfo): Promise<PersonalInfo>;
  getEducation(userId: string): Promise<Education[]>;
  addEducation(data: InsertEducation): Promise<Education>;
  updateEducation(id: string, data: Partial<InsertEducation>): Promise<Education>;
  deleteEducation(id: string): Promise<void>;
  getExperience(userId: string): Promise<Experience[]>;
  addExperience(data: InsertExperience): Promise<Experience>;
  updateExperience(id: string, data: Partial<InsertExperience>): Promise<Experience>;
  deleteExperience(id: string): Promise<void>;
  getProjects(userId: string): Promise<Project[]>;
  addProject(data: InsertProject): Promise<Project>;
  updateProject(id: string, data: Partial<InsertProject>): Promise<Project>;
  deleteProject(id: string): Promise<void>;
  getSkills(userId: string): Promise<Skill[]>;
  addSkill(data: InsertSkill): Promise<Skill>;
  deleteSkill(id: string): Promise<void>;
  getCertifications(userId: string): Promise<Certification[]>;
  addCertification(data: InsertCertification): Promise<Certification>;
  updateCertification(id: string, data: Partial<InsertCertification>): Promise<Certification>;
  deleteCertification(id: string): Promise<void>;
  getAchievements(userId: string): Promise<Achievement[]>;
  addAchievement(data: InsertAchievement): Promise<Achievement>;
  updateAchievement(id: string, data: Partial<InsertAchievement>): Promise<Achievement>;
  deleteAchievement(id: string): Promise<void>;
  getFullProfile(userId: string): Promise<any>;

  // Job Seekers Section
  getJobSources(): Promise<JobSource[]>;
  addJobSource(source: InsertJobSource): Promise<JobSource>;
  getJobRecommendations(userId: string): Promise<JobRecommendation[]>;
  addJobRecommendation(recommendation: InsertJobRecommendation): Promise<JobRecommendation>;
  saveJob(userId: string, jobId: string): Promise<SavedJob>;
  getSavedJobs(userId: string): Promise<SavedJob[]>;
  unsaveJob(userId: string, jobId: string): Promise<void>;
  getDashboardStats(userId: string): Promise<any>;
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
  private userCache = new Map<string, User>();

  // Helpers
  private convertDate(data: any): any {
    if (!data) return data;
    const newData = { ...data };
    if (newData.createdAt && newData.createdAt instanceof Timestamp) {
      newData.createdAt = newData.createdAt.toDate();
    }
    return newData;
  }

  private async safeGetDocs(q: any, fallbackCollection: any) {
    try {
      return await getDocs(q);
    } catch (error: any) {
      if (error.code === 'failed-precondition' || error.message?.includes('index')) {
        console.warn(`[Firestore] Index missing for ${fallbackCollection.path}. Attempting in-memory recovery.`);

        // Secondary Fallback: Try a limited query on the collection
        // In the future, we could parse 'q' to extract and use the 'where' clauses if they are 1D
        try {
          return await getDocs(query(fallbackCollection, limit(5000)));
        } catch (fallbackError) {
          console.error(`[Firestore] Critical failure in fallback for ${fallbackCollection.path}:`, fallbackError);
          throw fallbackError;
        }
      }
      console.error(`[Firestore] unexpected error fetching ${fallbackCollection.path}:`, error);
      throw error;
    }
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    const docRef = doc(db, "users", id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return undefined;
    return { id: docSnap.id, ...this.convertDate(docSnap.data()) } as User;
  }

  async getUserByFirebaseUid(uid: string): Promise<User | undefined> {
    if (this.userCache.has(uid)) return this.userCache.get(uid);

    const usersRef = collection(db, "users");
    const q = query(usersRef, where("firebaseUid", "==", uid));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return undefined;
    const docSnap = querySnapshot.docs[0];
    const user = { id: docSnap.id, ...this.convertDate(docSnap.data()) } as User;

    this.userCache.set(uid, user);
    return user;
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

  async getUserResumes(userId: string, limitCount?: number, summary?: boolean): Promise<Resume[]> {
    const resumesRef = collection(db, "resumes");
    // let q = query(resumesRef, where("userId", "==", userId), orderBy("createdAt", "desc"));
    let q = query(resumesRef, where("userId", "==", userId));
    // Remove limit from query to sort all in memory

    const querySnapshot = await this.safeGetDocs(q, resumesRef);
    const resumes = querySnapshot.docs
      .map(doc => {
        const data = doc.data() as any;
        if (summary) {
          delete data.content;
          delete data.latexContent;
          delete data.analysisJson;
        }
        return { id: doc.id, ...this.convertDate(data) } as Resume;
      })
      .filter(r => r.userId === userId); // Manual filter for fallback

    // Temporary: Sort in-memory until indexes are ready
    resumes.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));

    if (limitCount) return resumes.slice(0, limitCount);
    return resumes;
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

  async getUserJobs(userId: string, limitCount?: number, summary?: boolean): Promise<Job[]> {
    const jobsRef = collection(db, "jobs");
    // let q = query(jobsRef, where("userId", "==", userId), orderBy("createdAt", "desc"));
    let q = query(jobsRef, where("userId", "==", userId));
    // Remove limit from query to sort all in memory

    const querySnapshot = await this.safeGetDocs(q, jobsRef);
    const jobs = querySnapshot.docs
      .map(doc => {
        const data = doc.data() as any;
        if (summary) {
          delete data.description;
          delete data.qualifications;
        }
        return { id: doc.id, ...this.convertDate(data) } as Job;
      })
      .filter(j => j.userId === userId); // Manual filter for fallback

    // Temporary: Sort in-memory until indexes are ready
    jobs.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));

    if (limitCount) return jobs.slice(0, limitCount);
    return jobs;
  }

  async getJobs(): Promise<Job[]> {
    const jobsRef = collection(db, "jobs");
    // const q = query(jobsRef, orderBy("createdAt", "desc"), limit(50));
    const q = query(jobsRef, limit(100)); // Performance: increased limit but kept it constrained
    const querySnapshot = await this.safeGetDocs(q, jobsRef);
    const jobs = querySnapshot.docs.map(doc => ({ id: doc.id, ...this.convertDate(doc.data()) } as Job));
    jobs.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
    return jobs;
  }

  async updateJob(id: string, job: Partial<InsertJob>): Promise<Job> {
    const docRef = doc(db, "jobs", id);
    await updateDoc(docRef, job);
    return this.getJob(id) as Promise<Job>;
  }

  async deleteJob(id: string): Promise<void> {
    const docRef = doc(db, "jobs", id);
    await deleteDoc(docRef);
  }

  // Interviews
  async createInterview(interview: InsertInterview): Promise<Interview> {
    const ref = collection(db, "interviews");
    const now = new Date();
    const docRef = await addDoc(ref, { ...interview, createdAt: now });
    return { id: docRef.id, ...interview, createdAt: now } as Interview;
  }

  async getInterview(id: string): Promise<Interview | undefined> {
    const docRef = doc(db, "interviews", id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return undefined;
    return { id: docSnap.id, ...this.convertDate(docSnap.data()) } as Interview;
  }

  async addQuestion(question: InsertQuestion): Promise<Question> {
    const ref = collection(db, "interview_questions");
    const now = new Date();
    const docRef = await addDoc(ref, { ...question, createdAt: now });
    return { id: docRef.id, ...question, createdAt: now } as Question;
  }

  async addResponse(response: InsertResponse): Promise<Response> {
    const ref = collection(db, "interview_responses");
    const now = new Date();
    const docRef = await addDoc(ref, { ...response, createdAt: now });
    return { id: docRef.id, ...response, createdAt: now } as Response;
  }

  async getInterviewQuestions(interviewId: string): Promise<Question[]> {
    const ref = collection(db, "interview_questions");
    const q = query(ref, where("interviewId", "==", interviewId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs
      .map(doc => ({ id: doc.id, ...this.convertDate(doc.data()) } as Question))
      .sort((a, b) => a.order - b.order);
  }

  async getInterviewResponses(interviewId: string): Promise<Response[]> {
    const ref = collection(db, "interview_responses");
    const q = query(ref, where("interviewId", "==", interviewId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...this.convertDate(doc.data()) } as Response));
  }

  // Profile / Account Implementation
  async getPersonalInfo(userId: string): Promise<PersonalInfo | undefined> {
    const ref = collection(db, "user_personal_info");
    const q = query(ref, where("userId", "==", userId));
    const snap = await getDocs(q);
    if (snap.empty) return undefined;

    const data = snap.docs[0].data();
    const result = { id: snap.docs[0].id, ...this.convertDate(data) } as PersonalInfo & { photoBase64?: string };

    // Server conversion: binary BLOB to Base64 string for the frontend
    if (data.photoBlob && data.photoBlob instanceof Bytes) {
      // Re-attach data URI scheme so browser can render directly
      result.photoBase64 = `data:image/webp;base64,${data.photoBlob.toBase64()}`;
    }

    return result;
  }

  async updatePersonalInfo(userId: string, data: InsertPersonalInfo & { photoBase64?: string }): Promise<PersonalInfo> {
    const ref = collection(db, "user_personal_info");
    const q = query(ref, where("userId", "==", userId));
    const snap = await getDocs(q);
    const now = new Date();

    // Server conversion: Base64 to binary BLOB for database
    let photoBlob = undefined;
    if (data.photoBase64) {
      try {
        const base64Str = data.photoBase64.split(",")[1] || data.photoBase64;
        photoBlob = Bytes.fromBase64String(base64Str);
      } catch (e) {
        console.error("Failed to parse base64 image", e);
      }
    }

    const dbData = { ...data };
    delete dbData.photoBase64; // Don't store the long string
    if (photoBlob) {
      (dbData as any).photoBlob = photoBlob;
    }

    if (snap.empty) {
      const docRef = await addDoc(ref, { ...dbData, createdAt: now });
      return { id: docRef.id, ...data, photoBase64: data.photoBase64, createdAt: now } as PersonalInfo;
    } else {
      const docId = snap.docs[0].id;
      const docRef = doc(db, "user_personal_info", docId);
      await updateDoc(docRef, dbData);
      return { id: docId, ...data, photoBase64: data.photoBase64, createdAt: snap.docs[0].data().createdAt?.toDate() || now } as PersonalInfo;
    }
  }

  async getEducation(userId: string): Promise<Education[]> {
    const ref = collection(db, "user_education");
    const q = query(ref, where("userId", "==", userId));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...this.convertDate(doc.data()) } as Education));
  }

  async addEducation(data: InsertEducation): Promise<Education> {
    const ref = collection(db, "user_education");
    const now = new Date();
    const docRef = await addDoc(ref, { ...data, createdAt: now });
    return { id: docRef.id, ...data, createdAt: now } as Education;
  }

  async updateEducation(id: string, data: Partial<InsertEducation>): Promise<Education> {
    const docRef = doc(db, "user_education", id);
    await updateDoc(docRef, data);
    const updated = await getDoc(docRef);
    return { id: docRef.id, ...this.convertDate(updated.data()) } as Education;
  }

  async deleteEducation(id: string): Promise<void> {
    await deleteDoc(doc(db, "user_education", id));
  }

  async getExperience(userId: string): Promise<Experience[]> {
    const ref = collection(db, "user_experience");
    const q = query(ref, where("userId", "==", userId));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...this.convertDate(doc.data()) } as Experience));
  }

  async addExperience(data: InsertExperience): Promise<Experience> {
    const ref = collection(db, "user_experience");
    const now = new Date();
    const docRef = await addDoc(ref, { ...data, createdAt: now });
    return { id: docRef.id, ...data, createdAt: now } as Experience;
  }

  async updateExperience(id: string, data: Partial<InsertExperience>): Promise<Experience> {
    const docRef = doc(db, "user_experience", id);
    await updateDoc(docRef, data);
    const updated = await getDoc(docRef);
    return { id: docRef.id, ...this.convertDate(updated.data()) } as Experience;
  }

  async deleteExperience(id: string): Promise<void> {
    await deleteDoc(doc(db, "user_experience", id));
  }

  async getProjects(userId: string): Promise<Project[]> {
    const ref = collection(db, "user_projects");
    const q = query(ref, where("userId", "==", userId));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...this.convertDate(doc.data()) } as Project));
  }

  async addProject(data: InsertProject): Promise<Project> {
    const ref = collection(db, "user_projects");
    const now = new Date();
    const docRef = await addDoc(ref, { ...data, createdAt: now });
    return { id: docRef.id, ...data, createdAt: now } as Project;
  }

  async updateProject(id: string, data: Partial<InsertProject>): Promise<Project> {
    const docRef = doc(db, "user_projects", id);
    await updateDoc(docRef, data);
    const updated = await getDoc(docRef);
    return { id: docRef.id, ...this.convertDate(updated.data()) } as Project;
  }

  async deleteProject(id: string): Promise<void> {
    await deleteDoc(doc(db, "user_projects", id));
  }

  async getSkills(userId: string): Promise<Skill[]> {
    const ref = collection(db, "user_skills");
    const q = query(ref, where("userId", "==", userId));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...this.convertDate(doc.data()) } as Skill));
  }

  async addSkill(data: InsertSkill): Promise<Skill> {
    const ref = collection(db, "user_skills");
    const now = new Date();
    const docRef = await addDoc(ref, { ...data, createdAt: now });
    return { id: docRef.id, ...data, createdAt: now } as Skill;
  }

  async deleteSkill(id: string): Promise<void> {
    await deleteDoc(doc(db, "user_skills", id));
  }

  async getCertifications(userId: string): Promise<Certification[]> {
    const ref = collection(db, "user_certifications");
    const q = query(ref, where("userId", "==", userId));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...this.convertDate(doc.data()) } as Certification));
  }

  async addCertification(data: InsertCertification): Promise<Certification> {
    const ref = collection(db, "user_certifications");
    const now = new Date();
    const docRef = await addDoc(ref, { ...data, createdAt: now });
    return { id: docRef.id, ...data, createdAt: now } as Certification;
  }

  async updateCertification(id: string, data: Partial<InsertCertification>): Promise<Certification> {
    const docRef = doc(db, "user_certifications", id);
    await updateDoc(docRef, data);
    const updated = await getDoc(docRef);
    return { id: docRef.id, ...this.convertDate(updated.data()) } as Certification;
  }

  async deleteCertification(id: string): Promise<void> {
    await deleteDoc(doc(db, "user_certifications", id));
  }

  async getAchievements(userId: string): Promise<Achievement[]> {
    const ref = collection(db, "user_achievements");
    const q = query(ref, where("userId", "==", userId));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...this.convertDate(doc.data()) } as Achievement));
  }

  async addAchievement(data: InsertAchievement): Promise<Achievement> {
    const ref = collection(db, "user_achievements");
    const now = new Date();
    const docRef = await addDoc(ref, { ...data, createdAt: now });
    return { id: docRef.id, ...data, createdAt: now } as Achievement;
  }

  async updateAchievement(id: string, data: Partial<InsertAchievement>): Promise<Achievement> {
    const docRef = doc(db, "user_achievements", id);
    await updateDoc(docRef, data);
    const updated = await getDoc(docRef);
    return { id: docRef.id, ...this.convertDate(updated.data()) } as Achievement;
  }

  async deleteAchievement(id: string): Promise<void> {
    await deleteDoc(doc(db, "user_achievements", id));
  }

  async getFullProfile(userId: string): Promise<any> {
    const [
      personal,
      education,
      experience,
      projects,
      skills,
      certifications,
      achievements
    ] = await Promise.all([
      this.getPersonalInfo(userId),
      this.getEducation(userId),
      this.getExperience(userId),
      this.getProjects(userId),
      this.getSkills(userId),
      this.getCertifications(userId),
      this.getAchievements(userId)
    ]);

    return {
      personalInfo: personal,
      education,
      experience,
      projects,
      skills,
      certifications,
      achievements
    };
  }

  // Job Seekers Section
  async getJobSources(): Promise<JobSource[]> {
    const ref = collection(db, "job_sources");
    const q = query(ref, where("active", "==", true));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as JobSource));
  }

  async addJobSource(source: InsertJobSource): Promise<JobSource> {
    const ref = collection(db, "job_sources");
    const docRef = await addDoc(ref, source);
    return { id: docRef.id, ...source } as JobSource;
  }

  async getJobRecommendations(userId: string): Promise<JobRecommendation[]> {
    const ref = collection(db, "job_recommendations");
    // const q = query(ref, where("userId", "==", userId), orderBy("matchScore", "desc"), limit(50));
    const q = query(ref, where("userId", "==", userId));
    const querySnapshot = await this.safeGetDocs(q, ref);
    const recs = querySnapshot.docs
      .map(doc => ({ id: doc.id, ...this.convertDate(doc.data()) } as JobRecommendation))
      .filter(r => r.userId === userId); // Manual filter for fallback
    recs.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
    return recs.slice(0, 50);
  }

  async addJobRecommendation(recommendation: InsertJobRecommendation): Promise<JobRecommendation> {
    const ref = collection(db, "job_recommendations");
    const now = new Date();
    const docRef = await addDoc(ref, { ...recommendation, createdAt: now });
    return { id: docRef.id, ...recommendation, createdAt: now } as JobRecommendation;
  }

  async saveJob(userId: string, jobId: string): Promise<SavedJob> {
    const ref = collection(db, "saved_jobs");
    const now = new Date();
    const data = { userId, jobId };
    const docRef = await addDoc(ref, { ...data, createdAt: now });
    return { id: docRef.id, ...data, createdAt: now } as SavedJob;
  }

  async getSavedJobs(userId: string): Promise<SavedJob[]> {
    const ref = collection(db, "saved_jobs");
    const q = query(ref, where("userId", "==", userId));
    const querySnapshot = await this.safeGetDocs(q, ref);
    return querySnapshot.docs
      .map(doc => ({ id: doc.id, ...this.convertDate(doc.data()) } as SavedJob))
      .filter(s => s.userId === userId); // Manual filter for fallback
  }

  async unsaveJob(userId: string, jobId: string): Promise<void> {
    const ref = collection(db, "saved_jobs");
    const q = query(ref, where("userId", "==", userId), where("jobId", "==", jobId));
    const snap = await getDocs(q);
    if (!snap.empty) {
      await deleteDoc(doc(db, "saved_jobs", snap.docs[0].id));
    }
  }
  async getDashboardStats(userId: string): Promise<any> {
    const [resumes, jobs] = await Promise.all([
      this.getUserResumes(userId, 3, true),
      this.getUserJobs(userId)
    ]);

    const resumesRef = collection(db, "resumes");
    let resumesCount = 0;
    try {
      const resumesCountSnap = await getCountFromServer(query(resumesRef, where("userId", "==", userId)));
      resumesCount = resumesCountSnap.data().count;
    } catch (e) {
      // Fallback for count if it fails
      const allResumes = await this.getUserResumes(userId);
      resumesCount = allResumes.length;
    }

    const stats = {
      totalJobs: jobs.length,
      activeApplications: jobs.filter(j => j.status !== 'rejected').length,
      interviewCount: jobs.filter(j => j.status === 'interview').length,
      resumesCount: resumesCount,
      recentResumes: resumes,
      jobPipeline: {
        new: jobs.filter(j => j.status === 'new').length,
        applied: jobs.filter(j => j.status === 'applied').length,
        interview: jobs.filter(j => j.status === 'interview').length,
        offer: jobs.filter(j => j.status === 'offer').length,
        rejected: jobs.filter(j => j.status === 'rejected').length,
      },
      avgAtsScore: resumes.length > 0 ? resumes.reduce((acc, r) => acc + (r.atsScore || 0), 0) / resumes.length : 0
    };

    return stats;
  }
}

export const storage = new FirestoreStorage();
