import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
    Loader2, Brain, Code2, Database, Server, Globe, Layers,
    Coffee, FileCode, Cpu, Network, ShieldCheck, GitBranch,
    BarChart2, Sparkles, Users, FlaskConical, ChevronRight, CheckCircle2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ─── Concept definitions ──────────────────────────────────────────────────────
interface Concept {
    id: string;
    name: string;
    description: string;
    icon: React.ElementType;
    difficulty: "Easy" | "Medium" | "Hard";
    type: "technical" | "behavioral";
    color: string;        // tailwind bg gradient classes
    iconBg: string;       // icon container bg
    tag?: string;         // optional extra tag
}

const CONCEPTS: Concept[] = [
    {
        id: "dsa",
        name: "Data Structures & Algorithms",
        description: "Arrays, trees, graphs, sorting, searching and complexity analysis",
        icon: GitBranch,
        difficulty: "Hard",
        type: "technical",
        color: "from-violet-500/10 to-purple-500/5",
        iconBg: "bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400",
    },
    {
        id: "dbms",
        name: "DBMS",
        description: "Relational databases, normalization, transactions, ACID & indexing",
        icon: Database,
        difficulty: "Medium",
        type: "technical",
        color: "from-blue-500/10 to-cyan-500/5",
        iconBg: "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400",
    },
    {
        id: "os",
        name: "Operating Systems",
        description: "Processes, threads, memory management, scheduling & deadlocks",
        icon: Cpu,
        difficulty: "Hard",
        type: "technical",
        color: "from-orange-500/10 to-amber-500/5",
        iconBg: "bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400",
    },
    {
        id: "cn",
        name: "Computer Networks",
        description: "OSI model, TCP/IP, HTTP, DNS, routing and network security",
        icon: Network,
        difficulty: "Medium",
        type: "technical",
        color: "from-sky-500/10 to-blue-500/5",
        iconBg: "bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400",
    },
    {
        id: "oops",
        name: "OOP Concepts",
        description: "Encapsulation, inheritance, polymorphism, abstraction & design patterns",
        icon: Layers,
        difficulty: "Medium",
        type: "technical",
        color: "from-emerald-500/10 to-green-500/5",
        iconBg: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400",
    },
    {
        id: "system-design",
        name: "System Design",
        description: "Scalable architecture, load balancing, caching, microservices & APIs",
        icon: Server,
        difficulty: "Hard",
        type: "technical",
        color: "from-rose-500/10 to-pink-500/5",
        iconBg: "bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400",
        tag: "Senior Level",
    },
    {
        id: "java",
        name: "Java",
        description: "Core Java, JVM, collections, concurrency, Spring & JVM internals",
        icon: Coffee,
        difficulty: "Medium",
        type: "technical",
        color: "from-yellow-500/10 to-orange-500/5",
        iconBg: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400",
    },
    {
        id: "python",
        name: "Python",
        description: "Python basics, OOP, decorators, generators, async & frameworks",
        icon: FileCode,
        difficulty: "Easy",
        type: "technical",
        color: "from-teal-500/10 to-cyan-500/5",
        iconBg: "bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-400",
    },
    {
        id: "mern",
        name: "MERN Stack",
        description: "MongoDB, Express.js, React & Node.js full-stack development",
        icon: Globe,
        difficulty: "Medium",
        type: "technical",
        color: "from-green-500/10 to-emerald-500/5",
        iconBg: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
        tag: "Popular",
    },
    {
        id: "sql",
        name: "SQL",
        description: "Joins, subqueries, aggregations, stored procedures & optimization",
        icon: Database,
        difficulty: "Easy",
        type: "technical",
        color: "from-indigo-500/10 to-blue-500/5",
        iconBg: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400",
    },
    {
        id: "ml",
        name: "Machine Learning",
        description: "Supervised/unsupervised learning, model evaluation & neural networks",
        icon: BarChart2,
        difficulty: "Hard",
        type: "technical",
        color: "from-fuchsia-500/10 to-purple-500/5",
        iconBg: "bg-fuchsia-100 text-fuchsia-600 dark:bg-fuchsia-900/40 dark:text-fuchsia-400",
        tag: "AI/ML",
    },
    {
        id: "security",
        name: "Cyber Security",
        description: "Authentication, encryption, OWASP, secure coding & vulnerabilities",
        icon: ShieldCheck,
        difficulty: "Hard",
        type: "technical",
        color: "from-red-500/10 to-rose-500/5",
        iconBg: "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400",
    },
    {
        id: "frontend",
        name: "Frontend Development",
        description: "HTML, CSS, JavaScript, React, performance and browser APIs",
        icon: Code2,
        difficulty: "Medium",
        type: "technical",
        color: "from-pink-500/10 to-fuchsia-500/5",
        iconBg: "bg-pink-100 text-pink-600 dark:bg-pink-900/40 dark:text-pink-400",
    },
    {
        id: "devops",
        name: "DevOps & Cloud",
        description: "CI/CD, Docker, Kubernetes, AWS/GCP, monitoring & infrastructure as code",
        icon: FlaskConical,
        difficulty: "Hard",
        type: "technical",
        color: "from-cyan-500/10 to-sky-500/5",
        iconBg: "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/40 dark:text-cyan-400",
    },
    {
        id: "hr",
        name: "HR / Behavioral",
        description: "Tell me about yourself, situational questions, leadership & teamwork",
        icon: Users,
        difficulty: "Easy",
        type: "behavioral",
        color: "from-amber-500/10 to-yellow-500/5",
        iconBg: "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400",
        tag: "Soft Skills",
    },
    {
        id: "aptitude",
        name: "Aptitude & Reasoning",
        description: "Quantitative aptitude, logical reasoning, verbal ability & puzzles",
        icon: Sparkles,
        difficulty: "Easy",
        type: "technical",
        color: "from-lime-500/10 to-green-500/5",
        iconBg: "bg-lime-100 text-lime-700 dark:bg-lime-900/40 dark:text-lime-400",
    },
];

const DIFFICULTY_COLOR: Record<string, string> = {
    Easy: "bg-emerald-100 text-emerald-700 border-emerald-200",
    Medium: "bg-amber-100 text-amber-700 border-amber-200",
    Hard: "bg-red-100 text-red-700 border-red-200",
};

const QUESTION_COUNTS = [3, 5, 8, 10];

// ─── Domain name mapper (concept.id → API domain name) ───────────────────────
const DOMAIN_MAP: Record<string, string> = {
    dsa: "Data Structures & Algorithms",
    dbms: "Database Management System",
    os: "Operating Systems",
    cn: "Computer Networks",
    oops: "Object-Oriented Programming",
    "system-design": "System Design",
    java: "Java",
    python: "Python",
    mern: "MERN Stack",
    sql: "SQL",
    ml: "Machine Learning",
    security: "Cyber Security",
    frontend: "Frontend Development",
    devops: "DevOps & Cloud",
    hr: "Behavioral",
    aptitude: "Aptitude & Reasoning",
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function InterviewSetup() {
    const [, setLocation] = useLocation();
    const { toast } = useToast();

    const [selected, setSelected] = useState<Concept | null>(null);
    const [questionCount, setQuestionCount] = useState(5);

    const startMutation = useMutation({
        mutationFn: async () => {
            if (!selected) throw new Error("No concept selected");
            const res = await apiRequest("POST", "/api/interviews", {
                domain: DOMAIN_MAP[selected.id] ?? selected.name,
                difficulty: selected.difficulty,
                questionCount,
                type: selected.type,
            });
            return res.json();
        },
        onSuccess: (data) => {
            setLocation(`/mock/${data.interview.id}`);
        },
        onError: (error: Error) => {
            toast({ title: "Failed to start interview", description: error.message, variant: "destructive" });
        },
    });

    return (
        <DashboardLayout>
            <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">

                {/* ── Header ─────────────────────────────────────────────── */}
                <div className="text-center space-y-3">
                    <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-2">
                        <Brain className="h-4 w-4" />
                        AI-Powered Mock Interview
                    </div>
                    <h1 className="text-4xl font-bold font-display bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                        Choose Your Interview Domain
                    </h1>
                    <p className="text-muted-foreground text-lg max-w-xl mx-auto">
                        Select a concept below to begin your personalised AI mock interview session.
                    </p>
                </div>

                {/* ── Concept Grid ───────────────────────────────────────── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {CONCEPTS.map((concept) => {
                        const Icon = concept.icon;
                        const isSelected = selected?.id === concept.id;
                        return (
                            <button
                                key={concept.id}
                                onClick={() => setSelected(concept)}
                                className={`
                                    group relative text-left rounded-2xl border-2 p-5 transition-all duration-200
                                    bg-gradient-to-br ${concept.color}
                                    hover:shadow-xl hover:-translate-y-1 hover:border-primary/40
                                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50
                                    ${isSelected
                                        ? "border-primary shadow-lg shadow-primary/10 -translate-y-1 ring-2 ring-primary/30"
                                        : "border-border/60 shadow-sm"
                                    }
                                `}
                            >
                                {/* Selected check */}
                                {isSelected && (
                                    <div className="absolute top-3 right-3">
                                        <CheckCircle2 className="h-5 w-5 text-primary fill-primary/10" />
                                    </div>
                                )}

                                {/* Tag chip */}
                                {concept.tag && (
                                    <span className="absolute top-3 right-3 text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 rounded-full px-2 py-0.5">
                                        {concept.tag}
                                    </span>
                                )}

                                {/* Icon */}
                                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${concept.iconBg}`}>
                                    <Icon className="h-5 w-5" />
                                </div>

                                {/* Name */}
                                <h3 className="font-bold text-base text-foreground mb-1 leading-tight group-hover:text-primary transition-colors">
                                    {concept.name}
                                </h3>

                                {/* Description */}
                                <p className="text-xs text-muted-foreground leading-relaxed mb-4 line-clamp-2">
                                    {concept.description}
                                </p>

                                {/* Footer row */}
                                <div className="flex items-center justify-between">
                                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${DIFFICULTY_COLOR[concept.difficulty]}`}>
                                        {concept.difficulty}
                                    </span>
                                    <span className="text-[11px] text-muted-foreground capitalize bg-secondary/60 px-2 py-0.5 rounded-full">
                                        {concept.type}
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* ── Configuration Panel (shows after selecting) ─────────── */}
                {selected && (
                    <div className="sticky bottom-6 z-10">
                        <div className="bg-card/95 backdrop-blur-md border border-border/60 rounded-2xl shadow-2xl shadow-primary/10 p-5 flex flex-col sm:flex-row items-center gap-5">

                            {/* Selected concept info */}
                            <div className="flex items-center gap-3 flex-1">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${selected.iconBg}`}>
                                    <selected.icon className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Selected Domain</p>
                                    <p className="font-semibold text-sm text-foreground">{selected.name}</p>
                                </div>
                                <Badge variant="outline" className={`ml-2 text-[11px] ${DIFFICULTY_COLOR[selected.difficulty]}`}>
                                    {selected.difficulty}
                                </Badge>
                            </div>

                            {/* Question count pills */}
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground whitespace-nowrap">Questions:</span>
                                {QUESTION_COUNTS.map(n => (
                                    <button
                                        key={n}
                                        onClick={() => setQuestionCount(n)}
                                        className={`w-9 h-9 rounded-xl text-sm font-semibold border transition-all
                                            ${questionCount === n
                                                ? "bg-primary text-white border-primary shadow-md"
                                                : "bg-secondary/60 text-muted-foreground border-border/60 hover:bg-secondary"
                                            }`}
                                    >
                                        {n}
                                    </button>
                                ))}
                            </div>

                            {/* Start button */}
                            <Button
                                size="lg"
                                className="gap-2 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white font-bold rounded-xl shadow-lg shadow-primary/20 px-8 whitespace-nowrap"
                                onClick={() => startMutation.mutate()}
                                disabled={startMutation.isPending}
                            >
                                {startMutation.isPending ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Generating…
                                    </>
                                ) : (
                                    <>
                                        Start Interview
                                        <ChevronRight className="h-4 w-4" />
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                )}

                {/* ── Empty state nudge ──────────────────────────────────── */}
                {!selected && (
                    <p className="text-center text-muted-foreground text-sm pb-4">
                        👆 Click any card above to select an interview domain
                    </p>
                )}
            </div>
        </DashboardLayout>
    );
}
