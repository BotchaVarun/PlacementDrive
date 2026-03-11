import { useState, useMemo, useEffect, useTransition, memo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
    Search,
    Filter,
    MapPin,
    Clock,
    Briefcase,
    ChevronRight,
    Star,
    CheckCircle2,
    X,
    ExternalLink,
    Sparkles,
    Bookmark,
    Building2,
    DollarSign
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

/** Decode HTML entities (e.g. &lt;p&gt; → <p>) and strip dangerous tags */
function sanitizeHtml(raw: string): string {
    if (!raw) return "";

    // Step 1: Decode HTML entities if the content is entity-encoded
    // (some APIs store descriptions as &lt;p&gt; instead of <p>)
    let decoded = raw;
    if (raw.includes("&lt;") || raw.includes("&amp;") || raw.includes("&#")) {
        const textarea = document.createElement("textarea");
        textarea.innerHTML = raw;
        decoded = textarea.value;
    }

    // Step 2: Parse and sanitize the decoded HTML
    const doc = new DOMParser().parseFromString(decoded, "text/html");
    const DANGEROUS = ["script", "iframe", "object", "embed", "form", "input", "button", "style"];
    DANGEROUS.forEach(tag => doc.querySelectorAll(tag).forEach(el => el.remove()));
    // Hide invisible spam like #LI-Remote
    doc.querySelectorAll('[style*="color: white"], [style*="color:white"]').forEach(el => el.remove());
    return doc.body.innerHTML;
}

interface Job {
    id: string;
    title: string;
    company: string;
    location?: string;
    description: string;
    skills?: string;
    experienceRequired?: string;
    source?: string;
    url?: string;
    postedDate?: string;
    employmentType?: string;
    companyLogo?: string;
}

interface JobSearchResult {
    job: Job;
    matchScore: number;
    matchedSkills: string[];
    category: "Strong Match" | "Good Match" | "Moderate Match";
    reasoning: string;
}

export default function JobSeekers() {
    const { toast } = useToast();
    const [, setLocation] = useLocation();
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);
    const [showFilters, setShowFilters] = useState(false);
    const [visibleCount, setVisibleCount] = useState(24);
    const [isPending, startTransition] = useTransition();

    // Filters State
    const [filters, setFilters] = useState({
        experience: "All",
        location: "All",
        type: "All",
        time: "Latest First",
        roleCategory: "IT"
    });

    // Debounce search query
    useEffect(() => {
        const handler = setTimeout(() => {
            startTransition(() => {
                setDebouncedSearchQuery(searchQuery);
                setVisibleCount(24); // Reset pagination on new search
            });
        }, 400);

        return () => clearTimeout(handler);
    }, [searchQuery]);



    const { user } = useAuth();

    // Queries
    const { data: recommendations, isLoading: recsLoading, error: recsError } = useQuery<JobSearchResult[]>({
        queryKey: ["/api/jobs/recommendations"],
        queryFn: async () => {
            const res = await apiRequest("GET", "/api/jobs/recommendations");
            return res.json();
        },
        enabled: !!user
    });

    const { data: searchResults, isLoading: searchLoading, error: searchError } = useQuery<JobSearchResult[]>({
        queryKey: ["/api/jobs/discovery", debouncedSearchQuery, filters],
        queryFn: async () => {
            const params = new URLSearchParams({
                q: debouncedSearchQuery,
                experience: filters.experience,
                location: filters.location,
                type: filters.type,
                time: filters.time,
                roleCategory: filters.roleCategory
            });
            const res = await apiRequest("GET", `/api/jobs/discovery?${params}`);
            return res.json();
        },
        enabled: !!user
    });

    const discoveryLoading = searchLoading;

    // ─── SAVE / BOOKMARK ── calls /api/jobs/save → status "new" ─────────────────
    const saveMutation = useMutation({
        mutationFn: async (job: Job) => {
            const { auth } = await import("@/lib/firebase");
            const token = await auth.currentUser?.getIdToken();
            const headers: Record<string, string> = { "Content-Type": "application/json" };
            if (token) headers["Authorization"] = `Bearer ${token}`;

            const res = await fetch("/api/jobs/save", {
                method: "POST",
                headers,
                body: JSON.stringify({
                    jobId: job.id,
                    jobData: { id: job.id, title: job.title, company: job.company, location: job.location, description: job.description, skills: job.skills, experienceRequired: job.experienceRequired, source: job.source, url: job.url, postedDate: job.postedDate, employmentType: job.employmentType }
                }),
                credentials: "include"
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(body.message || "Failed to save");
            return body;
        },
        onSuccess: (data) => {
            if (data?.statusChanged) {
                toast({ title: "🔖 Moved to Wishlist", description: "Job status changed to Wishlist (New)." });
            } else if (data?.alreadyExisted) {
                toast({ title: "Already in Wishlist", description: "This job is already saved." });
            } else {
                toast({ title: "🔖 Saved to Wishlist!", description: "Job added to Job Tracker → Wishlist." });
            }
            queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
            queryClient.invalidateQueries({ queryKey: ["/api/jobs/saved"] });
        },
        onError: (err: Error) => {
            toast({ title: "Save Failed", description: err.message, variant: "destructive" });
        }
    });

    // ─── APPLY NOW ── calls /api/jobs/apply → status "applied" ──────────────────
    const applyMutation = useMutation({
        mutationFn: async (job: Job) => {
            const { auth } = await import("@/lib/firebase");
            const token = await auth.currentUser?.getIdToken();
            const headers: Record<string, string> = { "Content-Type": "application/json" };
            if (token) headers["Authorization"] = `Bearer ${token}`;

            const res = await fetch("/api/jobs/apply", {
                method: "POST",
                headers,
                body: JSON.stringify({
                    jobId: job.id,
                    jobData: { id: job.id, title: job.title, company: job.company, location: job.location, description: job.description, skills: job.skills, experienceRequired: job.experienceRequired, source: job.source, url: job.url, postedDate: job.postedDate, employmentType: job.employmentType }
                }),
                credentials: "include"
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(body.message || "Failed to apply");
            return body;
        },
        onSuccess: (data) => {
            if (data?.statusChanged) {
                toast({ title: "✓ Moved to Applied!", description: "Upgraded from Wishlist → Applied." });
            } else if (data?.alreadyExisted) {
                toast({ title: "✓ Already Applied", description: "This job is already in Applied." });
            } else {
                toast({ title: "✓ Applied!", description: "Job added to Job Tracker → Applied column." });
            }
            queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
            queryClient.invalidateQueries({ queryKey: ["/api/jobs/saved"] });
        },
        onError: (err: Error) => {
            toast({ title: "Apply Failed", description: err.message, variant: "destructive" });
        }
    });

    const strongMatches = recommendations?.filter(r => r.category === "Strong Match") || [];
    const allResults = searchResults || [];
    const displayResults = useMemo(() => allResults.slice(0, visibleCount), [allResults, visibleCount]);

    // UI state for showing search results vs recommendations
    // We show search results only when debounced query is active
    const isSearching = !!debouncedSearchQuery;
    const isInitialLoading = recsLoading || searchLoading;

    return (
        <DashboardLayout>
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Header Section */}
                <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-end">
                        <div>
                            <h1 className="text-3xl font-bold font-display tracking-tight text-foreground">Job Seekers</h1>
                            <p className="text-muted-foreground mt-1">Discover opportunities personalized for your career profile.</p>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="relative flex-1 group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <Input
                                placeholder="Search for any role, skill, company, or keyword..."
                                className="pl-10 h-12 bg-card border-border/60 focus:border-primary/50 shadow-sm transition-all"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Button
                            variant="outline"
                            className={`h-12 gap-2 px-6 transition-all ${showFilters ? 'bg-primary/5 border-primary/30 text-primary' : ''}`}
                            onClick={() => setShowFilters(!showFilters)}
                        >
                            <Filter className="h-4 w-4" />
                            Filters
                        </Button>
                    </div>
                </div>

                {(recsError || searchError) && (
                    <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold">Error loading jobs:</span>
                            <span>{((recsError || searchError) as Error).message || "Something went wrong."}</span>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                            Retry
                        </Button>
                    </div>
                )}



                {/* Filters Panel (Collapsible) */}
                {showFilters && (
                    <Card className="bg-secondary/20 border-border/50 animate-in zoom-in-95 duration-200">
                        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                            <div className="space-y-3">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Role Category</label>
                                <Select
                                    value={filters.roleCategory}
                                    onValueChange={(val) => startTransition(() => setFilters({ ...filters, roleCategory: val }))}
                                >
                                    <SelectTrigger className="w-full bg-card border-border/50">
                                        <SelectValue placeholder="Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="All">All Categories</SelectItem>
                                        <SelectItem value="IT">IT & Tech</SelectItem>
                                        <SelectItem value="Marketing">Marketing</SelectItem>
                                        <SelectItem value="Sales">Sales</SelectItem>
                                        <SelectItem value="Finance">Finance</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Experience</label>
                                <div className="flex flex-wrap gap-2">
                                    {["All", "Fresher", "1-3 years", "3-5 years", "5+ years"].map(exp => (
                                        <Badge
                                            key={exp}
                                            variant={filters.experience === exp ? "default" : "outline"}
                                            className="cursor-pointer px-3 py-1 text-xs"
                                            onClick={() => setFilters({ ...filters, experience: exp })}
                                        >
                                            {exp}
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Location</label>
                                <Select
                                    value={filters.location}
                                    onValueChange={(val) => startTransition(() => setFilters({ ...filters, location: val }))}
                                >
                                    <SelectTrigger className="w-full bg-card border-border/50">
                                        <SelectValue placeholder="Select Location" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="All">All Locations</SelectItem>
                                        <SelectItem value="Remote">Remote</SelectItem>
                                        <SelectItem value="Hyderabad">Hyderabad</SelectItem>
                                        <SelectItem value="Bengaluru">Bengaluru</SelectItem>
                                        <SelectItem value="Mumbai">Mumbai</SelectItem>
                                        <SelectItem value="Pune">Pune</SelectItem>
                                        <SelectItem value="Delhi">Delhi</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Posted Time</label>
                                <Select
                                    value={filters.time}
                                    onValueChange={(val) => startTransition(() => setFilters({ ...filters, time: val }))}
                                >
                                    <SelectTrigger className="w-full bg-card border-border/50">
                                        <SelectValue placeholder="Date Posted" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Latest First">Latest First</SelectItem>
                                        <SelectItem value="Last 24 hours">Last 24 hours</SelectItem>
                                        <SelectItem value="Last 3 days">Last 3 days</SelectItem>
                                        <SelectItem value="Last 7 days">Last 7 days</SelectItem>
                                        <SelectItem value="Last 30 days">Last 30 days</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                        </CardContent>
                    </Card>
                )}

                {/* Recommendations Section */}
                {strongMatches.length > 0 && !isSearching && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                            <h2 className="text-xl font-bold font-display">Recommended Based on Your Profile</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {recsLoading ? (
                                [1, 2, 3].map(i => <div key={i} className="h-[280px] bg-card/50 rounded-2xl animate-pulse border border-border/40" />)
                            ) : strongMatches.map(rec => (
                                <JobCard
                                    key={rec.job.id}
                                    job={rec.job}
                                    rec={rec}
                                    onClick={() => setSelectedJob(rec.job)}
                                    onSave={() => saveMutation.mutate(rec.job)}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* All Discovery Jobs */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold font-display flex items-center justify-between">
                        <div>
                            {isSearching ? `Search Results (${allResults.length})` : "General Opportunities"}
                        </div>
                        {searchQuery && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground h-8 gap-1"
                                onClick={() => {
                                    setSearchQuery("");
                                    setFilters({ experience: "All", location: "All", type: "All", time: "Latest First", roleCategory: "IT" });
                                }}
                            >
                                <X className="h-4 w-4" />
                                Clear Search
                            </Button>
                        )}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {isInitialLoading || discoveryLoading ? (
                            [1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-[280px] bg-card/50 rounded-2xl animate-pulse border border-border/40" />)
                        ) : displayResults.length > 0 ? (
                            displayResults.map(res => (
                                <JobCard
                                    key={res.job.id}
                                    job={res.job}
                                    rec={res}
                                    onClick={() => setSelectedJob(res.job)}
                                    onSave={() => saveMutation.mutate(res.job)}
                                />
                            ))
                        ) : (
                            <div className="col-span-full py-20 text-center">
                                <div className="h-16 w-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Briefcase className="h-8 w-8 text-muted-foreground opacity-20" />
                                </div>
                                <h3 className="text-lg font-semibold">No jobs found</h3>
                                <p className="text-muted-foreground">Try adjusting your search or filters.</p>
                            </div>
                        )}
                    </div>

                    {allResults.length > visibleCount && (
                        <div className="flex justify-center pt-8 pb-12">
                            <Button
                                variant="outline"
                                className="gap-2 px-8 h-12 rounded-xl border-primary/20 hover:bg-primary/5 hover:text-primary transition-all"
                                onClick={() => setVisibleCount(prev => prev + 24)}
                            >
                                Load More Opportunities
                                <ChevronRight className="h-4 w-4 rotate-90" />
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Job Detail Dialog */}
            {selectedJob && (
                <Dialog open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
                    <DialogContent className="max-w-3xl h-[85vh] flex flex-col p-0 overflow-hidden rounded-3xl border-border/40">
                        <div className="p-8 pb-4 overflow-y-auto flex-1">
                            <DialogHeader className="space-y-4">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="h-16 w-16 rounded-2xl bg-primary/5 flex items-center justify-center text-primary border border-primary/10 shadow-inner">
                                            <Building2 className="h-8 w-8" />
                                        </div>
                                        <div>
                                            <DialogTitle className="text-2xl font-bold">{selectedJob.title}</DialogTitle>
                                            <div className="text-lg font-medium text-muted-foreground flex items-center gap-2">
                                                {selectedJob.company}
                                                <Badge variant="secondary" className="font-normal">{selectedJob.source}</Badge>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 w-full md:w-auto">
                                        <Button variant="outline" size="icon" title="Save for later" className="rounded-xl h-12 w-12" onClick={() => saveMutation.mutate(selectedJob)}>
                                            <Bookmark className="h-5 w-5" />
                                        </Button>
                                        <a href={selectedJob.url} target="_blank" rel="noopener noreferrer" className="flex-1 md:flex-none" onClick={() => applyMutation.mutate(selectedJob)}>
                                            <Button className="w-full gap-2 rounded-xl h-12 px-6 shadow-lg shadow-primary/20">
                                                Apply Now
                                                <ExternalLink className="h-4 w-4" />
                                            </Button>
                                        </a>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4">
                                    <InfoItem icon={MapPin} label="Location" value={selectedJob.location || "Remote"} />
                                    <InfoItem icon={Briefcase} label="Type" value={selectedJob.employmentType || "Full-time"} />
                                    <InfoItem icon={Clock} label="Posted" value={selectedJob.postedDate || "Recently"} />
                                    <InfoItem icon={DollarSign} label="Experience" value={selectedJob.experienceRequired || "N/A"} />
                                </div>
                            </DialogHeader>

                            <Separator className="my-8" />

                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-bold mb-3">Job Description</h3>
                                    <div
                                        className="job-desc text-sm text-muted-foreground leading-relaxed"
                                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(selectedJob.description || "") }}
                                    />
                                </div>

                                <div>
                                    <h3 className="text-lg font-bold mb-3">Skills Required</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedJob.skills?.split(",").map((skill: string) => (
                                            <Badge key={skill} variant="secondary" className="px-3 py-1 bg-secondary/50 text-foreground border-border/50">
                                                {skill.trim()}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="p-6 bg-secondary/20 shadow-inner border-t border-border/20">
                            <div className="flex w-full justify-between items-center gap-4">
                                <div className="hidden md:block">
                                    <p className="text-sm text-muted-foreground">Ready to stand out?</p>
                                    <p className="text-sm font-semibold">Tailor your resume for this role.</p>
                                </div>
                                <Button
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200/50 gap-2 rounded-xl h-12 px-8"
                                    onClick={() => {
                                        // Logic to redirect with JD
                                        localStorage.setItem("jd_to_enhance", selectedJob.description);
                                        setLocation("/enhance");
                                    }}
                                >
                                    <Sparkles className="h-4 w-4" />
                                    Optimize Resume
                                </Button>
                            </div>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </DashboardLayout>
    );
}

const JobCard = memo(({ job, rec, onClick, onSave }: { job: Job, rec?: JobSearchResult, onClick: () => void, onSave: () => void }) => {
    const [bookmarked, setBookmarked] = useState(false);

    const handleSave = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (bookmarked) return; // prevent double-click spam
        setBookmarked(true);
        onSave();
        // Reset the animation after 2.5s (gives enough visual feedback)
        setTimeout(() => setBookmarked(false), 2500);
    };

    return (
        <Card
            className={`group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer border-border/60 ${rec?.category === 'Strong Match' ? 'ring-2 ring-primary/20 border-primary/30' : ''}`}
            onClick={onClick}
        >
            {rec && (
                <div className="absolute top-0 right-0 p-3">
                    <Badge className={`${rec.category === 'Strong Match' ? 'bg-green-500 hover:bg-green-600' : 'bg-primary/80 hover:bg-primary'} text-white gap-1 px-3 py-1 shadow-lg italic transition-all`}>
                        <Star className="h-3 w-3 fill-white" />
                        {rec.matchScore}% Match
                    </Badge>
                </div>
            )}

            <CardHeader className="pb-4">
                <div className="flex gap-4 items-center">
                    <div className="h-12 w-12 rounded-xl bg-secondary/50 flex items-center justify-center text-muted-foreground group-hover:bg-primary/5 group-hover:text-primary transition-colors border border-border/40">
                        <Building2 className="h-6 w-6" />
                    </div>
                    <div className="flex-1 truncate">
                        <CardTitle className="text-lg truncate group-hover:text-primary transition-colors">{job.title}</CardTitle>
                        <CardDescription className="font-medium text-foreground/80">{job.company}</CardDescription>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="bg-secondary/40 text-muted-foreground gap-1 font-normal">
                        <MapPin className="h-3 w-3" />
                        {job.location || "Remote"}
                    </Badge>
                    <Badge variant="secondary" className="bg-secondary/40 text-muted-foreground gap-1 font-normal">
                        <Briefcase className="h-3 w-3" />
                        {job.employmentType || "Full-time"}
                    </Badge>
                    <Badge variant="secondary" className="bg-secondary/40 text-muted-foreground gap-1 font-normal">
                        <Clock className="h-3 w-3" />
                        {job.postedDate || "Recently"}
                    </Badge>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        <span>Skills Required</span>
                        {rec && <span className="text-primary">{rec.matchedSkills.length} Matched</span>}
                    </div>
                    <div className="flex flex-wrap gap-1">
                        {job.skills?.split(",").slice(0, 3).map(skill => {
                            const userHasSkill = rec?.matchedSkills.some(s => s.toLowerCase() === skill.trim().toLowerCase());
                            return (
                                <Badge
                                    key={skill}
                                    variant="outline"
                                    className={`text-[10px] px-2 py-0 h-5 border-border/50 ${userHasSkill ? 'bg-primary/5 text-primary border-primary/20' : ''}`}
                                >
                                    {skill.trim()}
                                    {userHasSkill && <CheckCircle2 className="h-2.5 w-2.5 ml-1" />}
                                </Badge>
                            );
                        })}
                        {(job.skills?.split(",").length || 0) > 3 && (
                            <span className="text-[10px] text-muted-foreground pl-1">
                                +{(job.skills?.split(",").length || 0) - 3} more
                            </span>
                        )}
                    </div>
                </div>

                <div className="pt-4 flex items-center justify-between border-t border-border/40 group-hover:border-primary/20 transition-colors">
                    <div className="text-xs text-muted-foreground">Source: <span className="font-medium text-foreground/70">{job.source}</span></div>
                    <div className="flex gap-2">
                        {/* Bookmark / Save button with animation */}
                        <Button
                            size="icon"
                            variant="ghost"
                            title={bookmarked ? "Saved to Wishlist!" : "Save for later"}
                            className={`h-8 w-8 rounded-lg transition-all duration-300 ${bookmarked ? 'text-primary bg-primary/10 scale-110' : 'hover:text-primary hover:bg-primary/5'}`}
                            onClick={handleSave}
                        >
                            <Bookmark className={`h-4 w-4 transition-all duration-300 ${bookmarked ? 'fill-primary scale-125' : ''}`} />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 rounded-lg group-hover:bg-primary/5 transition-all text-xs font-bold gap-1 px-3">
                            View
                            <ChevronRight className="h-3 w-3" />
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
});

function InfoItem({ icon: Icon, label, value }: { icon: any, label: string, value: string }) {
    return (
        <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-secondary/50 flex items-center justify-center text-muted-foreground group-hover:bg-primary/5 group-hover:text-primary transition-colors border border-border/40 shadow-inner">
                <Icon className="h-5 w-5" />
            </div>
            <div>
                <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60 leading-none mb-1">{label}</p>
                <p className="text-sm font-semibold text-foreground/90">{value}</p>
            </div>
        </div>
    );
}
