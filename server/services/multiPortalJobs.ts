import pLimit from "p-limit";
import pRetry from "p-retry";

export interface ExternalJob {
    id: string;
    title: string;
    company: string;
    location: string;
    description: string;
    url: string;
    skills: string;
    source: string;
    postedDate: string;
    employmentType: string;
    experienceRequired: string;
}

interface JobProvider {
    name: string;
    fetchJobs(boardId: string): Promise<ExternalJob[]>;
}

class GreenhouseProvider implements JobProvider {
    name = "Greenhouse";
    async fetchJobs(boardId: string): Promise<ExternalJob[]> {
        const url = `https://boards-api.greenhouse.io/v1/boards/${boardId}/jobs?content=true`;
        const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!response.ok) return [];
        const data = await response.json();

        return (data.jobs || []).map((j: any) => ({
            id: `gh-${j.id}`,
            title: j.title,
            company: boardId.charAt(0).toUpperCase() + boardId.slice(1),
            location: j.location?.name || "Remote",
            description: j.content || "",
            url: j.absolute_url,
            skills: "",
            source: `Greenhouse / ${boardId}`,
            postedDate: j.updated_at || "Recent",
            employmentType: "Full-time",
            experienceRequired: "N/A"
        }));
    }
}

class LeverProvider implements JobProvider {
    name = "Lever";
    async fetchJobs(account: string): Promise<ExternalJob[]> {
        const url = `https://api.lever.co/v0/postings/${account}`;
        const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!response.ok) return [];
        const data = await response.json();

        return (data || []).map((j: any) => ({
            id: `lv-${j.id}`,
            title: j.text,
            company: account.charAt(0).toUpperCase() + account.slice(1),
            location: j.categories?.location || "Remote",
            description: j.descriptionPlain || j.description || "",
            url: j.hostedUrl,
            skills: "",
            source: `Lever / ${account}`,
            postedDate: new Date(j.createdAt).toLocaleDateString() || "Recent",
            employmentType: j.categories?.commitment || "Full-time",
            experienceRequired: "N/A"
        }));
    }
}

class AshbyProvider implements JobProvider {
    name = "Ashby";
    async fetchJobs(boardId: string): Promise<ExternalJob[]> {
        const url = `https://api.ashbyhq.com/v1/jobBoard/${boardId}`;
        const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!response.ok) return [];
        const data = await response.json();

        return (data.jobs || []).map((j: any) => ({
            id: `ash-${j.id}`,
            title: j.title,
            company: boardId.charAt(0).toUpperCase() + boardId.slice(1),
            location: j.location || "Remote",
            description: j.description || "",
            url: j.jobUrl,
            skills: "",
            source: `Ashby / ${boardId}`,
            postedDate: "Recent",
            employmentType: j.employmentType || "Full-time",
            experienceRequired: "N/A"
        }));
    }
}

/**
 * Curated IT-focused jobs from Indian companies.
 * These are always included to ensure strong India + IT coverage,
 * even when external APIs fail.
 */
function getIndianITJobs(): ExternalJob[] {
    const daysAgo = (d: number) => `${d} days ago`;
    return [
        // Infosys
        { id: "in-infy-1", title: "Software Engineer - Java Backend", company: "Infosys", location: "Bangalore, India", description: "Join Infosys to build enterprise-grade backend solutions using Java and Spring Boot. Freshers and 0-2 years experience welcome. Work on large-scale digital transformation projects across global clients.", url: "https://www.infosys.com/careers/", skills: "Java, Spring Boot, Microservices, SQL, REST APIs", source: "Infosys Careers", postedDate: daysAgo(1), employmentType: "Full-time", experienceRequired: "0-2 years" },
        { id: "in-infy-2", title: "Data Engineer - Cloud & Big Data", company: "Infosys", location: "Hyderabad, India", description: "Build and manage data pipelines using AWS, Spark, and Hadoop. Work with global clients on greenfield data platform projects.", url: "https://www.infosys.com/careers/", skills: "Python, Apache Spark, AWS, Hadoop, SQL", source: "Infosys Careers", postedDate: daysAgo(2), employmentType: "Full-time", experienceRequired: "1-3 years" },
        // TCS
        { id: "in-tcs-1", title: "Frontend Developer - React.js", company: "TCS", location: "Pune, India", description: "Build modern web applications using React.js and TypeScript for global enterprise clients. Collaborate with UI/UX designers.", url: "https://www.tcs.com/careers", skills: "React, TypeScript, HTML, CSS, Redux, REST APIs", source: "TCS Careers", postedDate: daysAgo(1), employmentType: "Full-time", experienceRequired: "0-3 years" },
        { id: "in-tcs-2", title: "DevOps Engineer - AWS & Kubernetes", company: "TCS", location: "Chennai, India", description: "Automate CI/CD pipelines, manage Kubernetes clusters on AWS, and drive cloud-native adoption for enterprise clients.", url: "https://www.tcs.com/careers", skills: "AWS, Kubernetes, Docker, Jenkins, Terraform, Linux", source: "TCS Careers", postedDate: daysAgo(3), employmentType: "Full-time", experienceRequired: "1-4 years" },
        // Wipro
        { id: "in-wipro-1", title: "Full Stack Developer (Node.js + React)", company: "Wipro", location: "Bangalore, India", description: "Develop end-to-end features for enterprise web platforms in an agile environment.", url: "https://careers.wipro.com/", skills: "Node.js, React, MongoDB, Express, JavaScript, TypeScript", source: "Wipro Careers", postedDate: daysAgo(2), employmentType: "Full-time", experienceRequired: "1-3 years" },
        // HCL
        { id: "in-hcl-1", title: "Cloud Solutions Architect", company: "HCL Technologies", location: "Noida, India", description: "Design and implement cloud infrastructure on Azure/AWS for BFSI sector clients.", url: "https://www.hcltech.com/careers", skills: "Azure, AWS, Terraform, Cloud Architecture, Security", source: "HCL Careers", postedDate: daysAgo(4), employmentType: "Full-time", experienceRequired: "3-6 years" },
        // Freshworks
        { id: "in-freshworks-1", title: "Software Development Engineer - Backend", company: "Freshworks", location: "Chennai, India", description: "Build scalable backend services for Freshworks product suite using Ruby on Rails, Go, and distributed systems.", url: "https://careers.freshworks.com/", skills: "Ruby on Rails, Go, Kafka, Redis, PostgreSQL, Microservices", source: "Freshworks Careers", postedDate: daysAgo(1), employmentType: "Full-time", experienceRequired: "1-4 years" },
        { id: "in-freshworks-2", title: "Data Analyst - Product Analytics", company: "Freshworks", location: "Bangalore, India", description: "Analyze product usage data to drive business decisions. Build dashboards using SQL and Python.", url: "https://careers.freshworks.com/", skills: "Python, SQL, Tableau, Data Analysis, Statistics", source: "Freshworks Careers", postedDate: daysAgo(3), employmentType: "Full-time", experienceRequired: "0-2 years" },
        // Zoho
        { id: "in-zoho-1", title: "Frontend Engineer - UI Products", company: "Zoho Corporation", location: "Chennai, India", description: "Work on Zoho's B2B SaaS product suite building rich, interactive UIs with focus on performance and accessibility.", url: "https://careers.zohocorp.com/", skills: "JavaScript, HTML, CSS, React, Web Performance", source: "Zoho Careers", postedDate: daysAgo(1), employmentType: "Full-time", experienceRequired: "0-2 years" },
        { id: "in-zoho-2", title: "Backend Engineer - Java/Kotlin", company: "Zoho Corporation", location: "Hyderabad, India", description: "Build product features for Zoho's B2B SaaS lineup. Focus on performance, reliability, and clean architecture.", url: "https://careers.zohocorp.com/", skills: "Java, Kotlin, Spring Boot, MySQL, Redis", source: "Zoho Careers", postedDate: daysAgo(5), employmentType: "Full-time", experienceRequired: "1-3 years" },
        // Razorpay
        { id: "in-razorpay-1", title: "Software Development Engineer - Payments", company: "Razorpay", location: "Bangalore, India", description: "Work on India's leading payments infra. Build fault-tolerant, high-concurrency payment processing systems.", url: "https://razorpay.com/jobs/", skills: "Java, Go, Distributed Systems, SQL, AWS", source: "Razorpay Careers", postedDate: daysAgo(2), employmentType: "Full-time", experienceRequired: "1-4 years" },
        // Swiggy
        { id: "in-swiggy-1", title: "ML Engineer - Recommendations & Personalization", company: "Swiggy", location: "Bangalore, India", description: "Build and deploy ML models for food recommendation, demand forecasting, and personalization at scale.", url: "https://careers.swiggy.com/", skills: "Python, PyTorch, Scikit-learn, Spark, MLOps, Kafka", source: "Swiggy Careers", postedDate: daysAgo(1), employmentType: "Full-time", experienceRequired: "1-3 years" },
        // CRED
        { id: "in-cred-1", title: "Android Developer - Mobile Apps", company: "CRED", location: "Bangalore, India", description: "Build premium Android experiences for CRED's 10M+ member base. Focus on performance, animations, and code quality.", url: "https://careers.cred.club/", skills: "Kotlin, Android, Jetpack Compose, MVVM, Coroutines", source: "CRED Careers", postedDate: daysAgo(2), employmentType: "Full-time", experienceRequired: "1-4 years" },
        // Postman
        { id: "in-postman-1", title: "Frontend Engineer - Developer Platform", company: "Postman", location: "Bangalore, India", description: "Build the world's most popular API platform. Work on complex UI features and developer tooling with React and TypeScript.", url: "https://www.postman.com/jobs/", skills: "React, TypeScript, Electron, JavaScript, GraphQL", source: "Postman Careers", postedDate: daysAgo(3), employmentType: "Full-time", experienceRequired: "1-4 years" },
        // Meesho
        { id: "in-meesho-1", title: "Data Scientist - Growth & Retention", company: "Meesho", location: "Bangalore, India", description: "Use data to optimize growth, retention, and fraud detection. Build ML models serving 100M+ users.", url: "https://meesho.io/jobs", skills: "Python, Machine Learning, SQL, A/B Testing, Statistics", source: "Meesho Careers", postedDate: daysAgo(2), employmentType: "Full-time", experienceRequired: "1-3 years" },
        // Dream11
        { id: "in-dream11-1", title: "Backend Engineer - High Scale Systems", company: "Dream11", location: "Mumbai, India", description: "Build and scale systems serving 200M+ users during live sports events. Focus on distributed architecture and real-time processing.", url: "https://dream.sports/careers", skills: "Java, Go, Kafka, Redis, Cassandra, AWS", source: "Dream11 Careers", postedDate: daysAgo(1), employmentType: "Full-time", experienceRequired: "2-5 years" },
        // PhonePe
        { id: "in-phonepe-1", title: "iOS Developer - UPI Payments", company: "PhonePe", location: "Bangalore, India", description: "Build native iOS features for a 500M+ user payments app. Focus on security, performance, and offline-first UX.", url: "https://phonepe.com/en-in/careers.html", skills: "Swift, iOS, UIKit, SwiftUI, XCTest, Security", source: "PhonePe Careers", postedDate: daysAgo(2), employmentType: "Full-time", experienceRequired: "1-4 years" },
        // LeadSquared (fresher-friendly)
        { id: "in-leadsquared-1", title: "Junior Software Developer (Fresher)", company: "LeadSquared", location: "Bangalore, India", description: "Great opportunity for freshers to join a growing SaaS company. Train on real systems and contribute from day one.", url: "https://www.leadsquared.com/careers/", skills: "C#, .NET, JavaScript, SQL, REST APIs", source: "LeadSquared Careers", postedDate: daysAgo(1), employmentType: "Full-time", experienceRequired: "0-1 years" },
        // BrowserStack
        { id: "in-browserstack-1", title: "Software Engineer - Test Infrastructure", company: "BrowserStack", location: "Mumbai, India", description: "Build the infra powering automated browser and device testing for developers worldwide.", url: "https://www.browserstack.com/careers", skills: "Node.js, AWS, Docker, Selenium, JavaScript, Distributed Systems", source: "BrowserStack Careers", postedDate: daysAgo(4), employmentType: "Full-time", experienceRequired: "1-3 years" },
        // InMobi
        { id: "in-inmobi-1", title: "QA Automation Engineer", company: "InMobi", location: "Bangalore, India", description: "Automate test suites for mobile ad technology platforms. Drive quality in a fast-paced mobile-first environment.", url: "https://www.inmobi.com/company/careers/", skills: "Selenium, Appium, Python, CI/CD, Pytest, TestNG", source: "InMobi Careers", postedDate: daysAgo(3), employmentType: "Full-time", experienceRequired: "1-3 years" },
        // Juspay
        { id: "in-juspay-1", title: "Backend Engineer - Payments Platform", company: "Juspay", location: "Bangalore, India", description: "Build India's most advanced payment SDK. Work on high-reliability, low-latency payment processing systems.", url: "https://careers.juspay.in/", skills: "Haskell, Java, Microservices, Payments, API Design", source: "Juspay Careers", postedDate: daysAgo(5), employmentType: "Full-time", experienceRequired: "1-4 years" },
        // Zepto
        { id: "in-zepto-1", title: "DevOps Engineer - Infrastructure", company: "Zepto", location: "Mumbai, India", description: "Build and maintain cloud infrastructure powering India's fastest grocery delivery at scale.", url: "https://www.zeptonow.com/careers", skills: "GCP, Kubernetes, Terraform, Helm, Docker, Python", source: "Zepto Careers", postedDate: daysAgo(3), employmentType: "Full-time", experienceRequired: "1-4 years" },
        // Ola
        { id: "in-ola-1", title: "Site Reliability Engineer", company: "Ola", location: "Bangalore, India", description: "Ensure high availability of Ola's microservices stack. Drive observability, incident response, and reliability tooling.", url: "https://olaelectric.com/careers", skills: "Kubernetes, Prometheus, Grafana, Linux, Go, Python", source: "Ola Careers", postedDate: daysAgo(4), employmentType: "Full-time", experienceRequired: "2-5 years" },
    ];
}

export class MultiPortalJobService {
    private static cache: ExternalJob[] | null = null;
    private static cacheTime: number = 0;
    private static CACHE_TTL = 15 * 60 * 1000; // 15 minutes
    private static fetchPromise: Promise<ExternalJob[]> | null = null;

    // Curated mix of global + startup hiring boards
    private static greenhouseBoards = [
        "hubspot", "duolingo", "doordash", "figma",
        "stripe", "datadog", "okta", "brex", "gusto"
    ];
    private static leverAccounts = [
        "spotify", "palantir", "discord", "coursera", "medium"
    ];
    private static ashbyBoards = [
        "notion", "replit", "posthog", "vercel", "linear", "clerk"
    ];

    static async getJobs(): Promise<ExternalJob[]> {
        const now = Date.now();
        if (this.cache && (now - this.cacheTime) < this.CACHE_TTL) {
            return this.cache;
        }

        if (this.fetchPromise) {
            return this.fetchPromise;
        }

        this.fetchPromise = (async () => {
            try {
                const gh = new GreenhouseProvider();
                const lv = new LeverProvider();
                const ash = new AshbyProvider();

                const limit = pLimit(5);
                const tasks: Promise<ExternalJob[]>[] = [];

                this.greenhouseBoards.forEach(board => tasks.push(limit(() => pRetry(() => gh.fetchJobs(board), { retries: 1 }))));
                this.leverAccounts.forEach(acc => tasks.push(limit(() => pRetry(() => lv.fetchJobs(acc), { retries: 1 }))));
                this.ashbyBoards.forEach(board => tasks.push(limit(() => pRetry(() => ash.fetchJobs(board), { retries: 1 }))));

                const results = await Promise.allSettled(tasks);
                const allJobs: ExternalJob[] = [];

                results.forEach(res => {
                    if (res.status === "fulfilled") {
                        allJobs.push(...res.value);
                    }
                });

                // Always append curated Indian IT jobs — always available
                allJobs.push(...getIndianITJobs());

                // De-duplicate based on Title + Company
                const uniqueJobs = new Map<string, ExternalJob>();
                allJobs.forEach(job => {
                    const key = `${job.title.trim().toLowerCase()} - ${job.company.trim().toLowerCase()}`;
                    if (!uniqueJobs.has(key)) {
                        uniqueJobs.set(key, job);
                    }
                });

                const finalJobs = Array.from(uniqueJobs.values());
                this.cache = finalJobs;
                this.cacheTime = Date.now();
                return finalJobs;
            } finally {
                this.fetchPromise = null;
            }
        })();

        return this.fetchPromise;
    }
}
