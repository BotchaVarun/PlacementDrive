import { storage } from "../storage.js";
import { Job, PersonalInfo, Education, Experience, Skill, Project } from "@shared/schema.js";

export interface JobMatchResult {
    job: Job;
    matchScore: number;
    matchedSkills: string[];
    category: "Strong Match" | "Good Match" | "Moderate Match";
    reasoning: string;
}

export interface JobFilters {
    q?: string;
    experience?: string;
    location?: string;
    type?: string;
    time?: string;
    personalizedRanking?: boolean;
    startupOnly?: boolean;
    roleCategory?: string;
}

export class JobService {
    /**
     * Calculates a simplified match score between a user profile and a job.
     * Score = (Profile Match * 60%) + (Keyword Relevance * 30%) + (Recency * 10%)
     */
    static calculateMatchScore(profile: any, job: Job, query?: string): number {
        let skillScore = 0;
        let experienceScore = 0;
        let educationScore = 0;
        let projectScore = 0;
        let certificationScore = 0;
        let keywordScore = 0;
        let recencyScore = this.calculateRecencyScore(job.postedDate || "Recently");

        // 1. Skill Similarity (35%)
        const userSkills = (profile.skills || []).map((s: any) => s.name.toLowerCase());
        const jobSkills = (job.skills || "").split(",").map((s: string) => s.trim().toLowerCase()).filter(Boolean);

        if (jobSkills.length > 0) {
            const matchCount = jobSkills.filter((js: string) =>
                userSkills.some((us: string) => us.includes(js) || js.includes(us))
            ).length;
            skillScore = (matchCount / jobSkills.length) * 100;
        }

        // 2. Experience Alignment (25%)
        const userTitles = (profile.experience || []).map((e: Experience) => e.title.toLowerCase());
        const jobTitle = job.title.toLowerCase();
        if (userTitles.some((t: string) => jobTitle.includes(t) || t.includes(jobTitle))) {
            experienceScore = 100;
        } else if (profile.experience?.length > 0) {
            experienceScore = 60;
        }

        // 3. Education Match (10%)
        if (profile.education?.length > 0) {
            educationScore = 100;
        }

        // 4. Projects & Certifications (15% combined)
        if (profile.projects?.length > 0) {
            const projectText = profile.projects.map((p: Project) => `${p.title} ${p.description}`).join(" ").toLowerCase();
            const skillMatches = jobSkills.filter((js: string) => projectText.includes(js)).length;
            projectScore = jobSkills.length > 0 ? (skillMatches / jobSkills.length) * 100 : 100;
        }

        if (profile.certifications?.length > 0) {
            certificationScore = 100;
        }

        // 5. Keyword Relevance (15%)
        const searchTerms = query ? query.toLowerCase().split(/\s+/) : [];
        const jobText = `${job.title} ${job.company} ${job.description} ${job.skills}`.toLowerCase();

        if (searchTerms.length > 0) {
            let foundSearchTerms = 0;
            searchTerms.forEach(term => {
                if (jobText.includes(term)) foundSearchTerms++;
            });
            keywordScore = (foundSearchTerms / searchTerms.length) * 100;
        }

        // Base Weighted Score
        const weights = {
            skills: 0.35,
            experience: 0.25,
            education: 0.10,
            projects: 0.10,
            certifications: 0.05,
            keywords: 0.15
        };

        let baseScore = (skillScore * weights.skills) +
            (experienceScore * weights.experience) +
            (educationScore * weights.education) +
            (projectScore * weights.projects) +
            (certificationScore * weights.certifications) +
            (keywordScore * weights.keywords);

        // 6. IT & Fresher Boosts (Additive)
        const itKeywords = [
            "software", "developer", "engineer", "frontend", "backend", "fullstack",
            "data", "ai", "ml", "cloud", "devops", "security", "analyst", "tech",
            "coding", "programming", "javascript", "python", "java", "react",
            "node", "aws", "sql", "web", "mobile", "app"
        ];
        const fresherKeywords = ["fresher", "junior", "intern", "graduate", "entry", "0-1", "0-2", "trainee", "associate", "university"];

        const titleLower = job.title.toLowerCase();
        const descLower = job.description.toLowerCase();

        if (itKeywords.some(kw => titleLower.includes(kw) || descLower.includes(kw))) {
            baseScore += 10; // IT Boost
        }

        const isFresherRole = fresherKeywords.some(kw =>
            titleLower.includes(kw) ||
            descLower.includes(kw) ||
            (job.experienceRequired?.toLowerCase() && (job.experienceRequired.includes("0-") || job.experienceRequired.includes("1-") || job.experienceRequired.includes("N/A")))
        );

        if (isFresherRole) {
            baseScore += 15; // Fresher Boost
        }

        // 7. Location Boost (India specific)
        const indiaKeywords = ["india", "bangalore", "bengaluru", "hyderabad", "pune", "mumbai", "delhi", "gurgaon", "noida", "chennai", "gurugram", "remote"];
        const locationLower = (job.location || "").toLowerCase();

        if (indiaKeywords.some(kw => locationLower.includes(kw))) {
            baseScore += 10;
        }

        return Math.min(100, Math.round(baseScore + (recencyScore * 0.05)));
    }

    private static calculateRecencyScore(postedDate: string): number {
        const text = postedDate.toLowerCase();
        if (text.includes("hour") || text.includes("minute")) return 100;
        if (text.includes("1 day") || text.includes("yesterday")) return 90;
        if (text.includes("2 day") || text.includes("3 day")) return 80;
        if (text.includes("week")) return 60;
        if (text.includes("month")) return 30;
        return 50; // Default
    }

    static getCategory(score: number): "Strong Match" | "Good Match" | "Moderate Match" {
        if (score >= 80) return "Strong Match";
        if (score >= 60) return "Good Match";
        return "Moderate Match";
    }

    /**
     * Gets recommended jobs for a user based on their profile.
     */
    static async getRecommendations(userId: string): Promise<JobMatchResult[]> {
        const profile = await storage.getFullProfile(userId);
        const allJobs = await this.getMockDiscoveryJobs(); // Use discovery pool for recommendations

        const recommendations: JobMatchResult[] = allJobs.map((job: any) => {
            const score = this.calculateMatchScore(profile, job);
            const userSkills = (profile.skills || []).map((s: any) => s.name.toLowerCase());
            const jobSkills = (job.skills || "").split(",").map((s: string) => s.trim().toLowerCase());
            const matchedSkills = jobSkills.filter((js: string) => userSkills.includes(js));

            return {
                job,
                matchScore: score,
                matchedSkills,
                category: this.getCategory(score),
                reasoning: `Matched ${matchedSkills.length} skills. Alignment with ${profile.experience?.length || 0} past roles.`
            };
        });

        return recommendations.sort((a, b) => b.matchScore - a.matchScore).slice(0, 6);
    }

    /**
     * Enhanced discovery with filtering and search.
     */
    static async searchJobs(userId: string, filters: JobFilters): Promise<JobMatchResult[]> {
        const profile = await storage.getFullProfile(userId);
        let allJobs = await this.getMockDiscoveryJobs();

        // 1. Keyword/Role Search (Independent of Profile)
        if (filters.q) {
            const query = filters.q.toLowerCase();
            allJobs = allJobs.filter(job =>
                job.title.toLowerCase().includes(query) ||
                job.company.toLowerCase().includes(query) ||
                job.skills?.toLowerCase().includes(query) ||
                job.description.toLowerCase().includes(query)
            );
        }

        // 1.5 Role Category Filtering (User Requirement: Default IT)
        if (filters.roleCategory === "IT") {
            const itRoles = [
                "software developer", "backend developer", "frontend developer",
                "full stack developer", "data analyst", "data scientist",
                "devops engineer", "cloud engineer", "ai/ml engineer", "ai engineer", "ml engineer",
                "cyber security", "qa automation", "mobile developer", "system engineer",
                "software engineer", "web developer", "app developer"
            ];

            allJobs = allJobs.filter(job => {
                const titleLower = job.title.toLowerCase();
                const descLower = job.description.toLowerCase();
                return itRoles.some(role => titleLower.includes(role) || descLower.includes(role));
            });
        }

        // 2. Apply Filters
        if (filters.experience && filters.experience !== "All") {
            const exp = filters.experience.toLowerCase();
            if (exp === "fresher") {
                const fresherKeywords = ["fresher", "0-1", "0-2", "junior", "intern", "graduate", "trainee", "entry"];
                allJobs = allJobs.filter(job =>
                    fresherKeywords.some(kw =>
                        job.title.toLowerCase().includes(kw) ||
                        job.description.toLowerCase().includes(kw) ||
                        (job.experienceRequired?.toLowerCase() && (job.experienceRequired.includes("0-") || job.experienceRequired.includes("1-") || job.experienceRequired.includes("N/A")))
                    )
                );
            } else {
                allJobs = allJobs.filter(job => job.experienceRequired?.includes(filters.experience!));
            }
        }

        if (filters.location && filters.location !== "All") {
            if (filters.location === "Remote") {
                allJobs = allJobs.filter(job => job.location?.toLowerCase().includes("remote"));
            } else {
                allJobs = allJobs.filter(job => job.location?.toLowerCase().includes(filters.location!.toLowerCase()));
            }
        }

        if (filters.type && filters.type !== "All") {
            allJobs = allJobs.filter(job => job.employmentType === filters.type);
        }

        if (filters.time && filters.time !== "Latest First") {
            // "Last 24 hours", "Last 3 days", "Last 7 days", "Last 30 days"
            const daysLimit = filters.time.match(/\d+/) ? parseInt(filters.time.match(/\d+/)![0]) : 365;
            allJobs = allJobs.filter(job => {
                const dateText = job.postedDate?.toLowerCase() || "";
                if (dateText.includes("hour") || dateText.includes("minute")) return true;
                const match = dateText.match(/(\d+)\s+day/);
                if (match) {
                    return parseInt(match[1]) <= daysLimit;
                }
                if (dateText.includes("yesterday")) return daysLimit >= 1;
                return false;
            });
        }

        // 3. Startup Prioritization
        const startupFocus = filters.startupOnly || filters.q?.toLowerCase().includes("startup") || filters.q?.toLowerCase().includes("unicorn");
        if (startupFocus) {
            const startupBoards = ["replit", "notion", "figma", "posthog", "ramp", "ashby", "lever", "vercel", "railway", "linear"];
            allJobs.sort((a, b) => {
                const aIsStartup = startupBoards.some(sb => a.source?.toLowerCase().includes(sb));
                const bIsStartup = startupBoards.some(sb => b.source?.toLowerCase().includes(sb));
                if (aIsStartup && !bIsStartup) return -1;
                if (!aIsStartup && bIsStartup) return 1;
                return 0;
            });
        }

        // 3. Rank Results
        const results: JobMatchResult[] = allJobs.map((job: any) => {
            const score = this.calculateMatchScore(profile, job, filters.q);
            const userSkills = (profile.skills || []).map((s: any) => s.name.toLowerCase());
            const jobSkills = (job.skills || "").split(",").map((s: string) => s.trim().toLowerCase());
            const matchedSkills = jobSkills.filter((js: string) => userSkills.includes(js));

            return {
                job,
                matchScore: score,
                matchedSkills,
                category: this.getCategory(score),
                reasoning: filters.q ? "Matched based on your search keywords and profile similarity." : "Top recommendation for your profile."
            };
        });

        // 4. Diversity Filter: Limit to 3 jobs per company
        const companyCounts = new Map<string, number>();
        const diverseResults: JobMatchResult[] = [];

        results.sort((a, b) => b.matchScore - a.matchScore).forEach(res => {
            const company = res.job.company.toLowerCase();
            const count = companyCounts.get(company) || 0;
            if (count < 5) {
                diverseResults.push(res);
                companyCounts.set(company, count + 1);
            }
        });

        return diverseResults;
    }

    /**
     * Integrates real jobs from multiple portals.
     */
    static async getMockDiscoveryJobs(): Promise<any[]> {
        try {
            const { MultiPortalJobService } = await import("./multiPortalJobs.js");
            return await MultiPortalJobService.getJobs();
        } catch (error) {
            console.error("Error fetching multi-portal jobs:", error);
            // Fallback to minimal mock if external fetch fails completely
            return [
                {
                    id: "fallback-1",
                    title: "Software Engineer",
                    company: "Tech Corp",
                    location: "Remote",
                    description: "Building great things.",
                    skills: "React, Node.js",
                    source: "System Fallback",
                    url: "#",
                    experienceRequired: "1-3 years",
                    employmentType: "Full-time",
                    postedDate: "Today"
                }
            ];
        }
    }
}
