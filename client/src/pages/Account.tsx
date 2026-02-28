import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/Sidebar";
import {
    UserCircle,
    BookOpen,
    Briefcase,
    Code,
    Award,
    Trophy,
    Plus,
    Trash2,
    Save,
    CheckCircle2,
    ChevronDown,
    Linkedin,
    Github,
    Globe,
    Mail,
    Phone,
    MapPin,
    Edit3,
    ExternalLink,
    Pencil
} from "lucide-react";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { auth } from "@/lib/firebase";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { updateProfile } from "firebase/auth";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { api } from "../../shared/routes.js";
import {
    PersonalInfo,
    Education,
    Experience,
    Project,
    Skill,
    Certification,
    Achievement
} from "../../shared/schema.js";

interface ProfileData {
    personalInfo?: PersonalInfo;
    education: Education[];
    experience: Experience[];
    projects: Project[];
    skills: Skill[];
    certifications: Certification[];
    achievements: Achievement[];
}

export default function Account() {
    const { toast } = useToast();
    const [activeSection, setActiveSection] = useState<string>("personal");
    const { user } = useAuth();
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

    const { data: profile, isLoading } = useQuery<ProfileData>({
        queryKey: ["/api/profile"],
    });

    // Mutations
    const updatePersonalInfo = useMutation({
        mutationFn: async (data: Partial<PersonalInfo>) => {
            const res = await apiRequest("PATCH", "/api/profile/personal-info", data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
            toast({ title: "Profile updated", description: "Your personal information has been saved." });
        }
    });

    if (isLoading) {
        return (
            <div className="flex h-screen bg-background">
                <Sidebar />
                <div className="flex-1 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            </div>
        );
    }

    // Calculate profile completion %
    const calculateCompletion = () => {
        let score = 0;
        if (profile?.personalInfo?.fullName) score += 20;
        if ((profile?.education?.length ?? 0) > 0) score += 20;
        if ((profile?.experience?.length ?? 0) > 0) score += 20;
        if ((profile?.projects?.length ?? 0) > 0) score += 20;
        if ((profile?.skills?.length ?? 0) > 0) score += 10;
        if ((profile?.certifications?.length ?? 0) > 0 || (profile?.achievements?.length ?? 0) > 0) score += 10;
        return score;
    };
    const completionPercentage = calculateCompletion();

    const info = profile?.personalInfo;

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        if (!file.type.startsWith("image/")) {
            toast({ title: "Invalid file type", description: "Please upload an image.", variant: "destructive" });
            return;
        }

        setIsUploadingPhoto(true);
        try {
            const base64Image = await new Promise<string>((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement("canvas");
                    const MAX_SIZE = 500; // max width/height
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_SIZE) {
                            height = Math.round((height * MAX_SIZE) / width);
                            width = MAX_SIZE;
                        }
                    } else {
                        if (height > MAX_SIZE) {
                            width = Math.round((width * MAX_SIZE) / height);
                            height = MAX_SIZE;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext("2d");
                    if (!ctx) return reject(new Error("Canvas not supported"));

                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL("image/webp", 0.8)); // 80% quality WebP Base64
                };
                img.onerror = () => reject(new Error("Image load failed"));
                img.src = URL.createObjectURL(file);
            });

            // Fast Upload directly to our DB endpoint
            await apiRequest("PATCH", "/api/profile/personal-info", {
                ...info,
                fullName: info?.fullName || user.displayName || "User",
                email: info?.email || user.email || "",
                photoBase64: base64Image
            });

            // Refresh React Query Cache
            queryClient.invalidateQueries({ queryKey: ["/api/profile"] });

            toast({ title: "Profile updated", description: "Your profile picture has been saved securely to the database." });
        } catch (error: any) {
            toast({ title: "Upload failed", description: error.message, variant: "destructive" });
        } finally {
            setIsUploadingPhoto(false);
            e.target.value = ""; // reset input
        }
    };

    return (
        <div className="flex h-screen bg-background overflow-hidden font-sans">
            <Sidebar />
            <main className="flex-1 overflow-y-auto p-8 bg-slate-50/50 dark:bg-slate-950/50">
                <div className="max-w-5xl mx-auto space-y-8">
                    {/* Professional Header Section */}
                    <Card className="border-none shadow-xl bg-white dark:bg-slate-900 overflow-hidden">
                        <div className="h-32 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent"></div>
                        <CardContent className="relative pt-0 pb-8 px-8">
                            <div className="flex flex-col md:flex-row gap-8 -mt-12 items-start md:items-end">
                                <div className="relative group">
                                    <div className="h-32 w-32 rounded-2xl bg-white dark:bg-slate-800 p-1 shadow-2xl border-4 border-white dark:border-slate-900 overflow-hidden relative">
                                        <div className="h-full w-full rounded-xl bg-primary/5 flex items-center justify-center overflow-hidden">
                                            {isUploadingPhoto ? (
                                                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                                            ) : info?.photoBase64 ? (
                                                <img src={info.photoBase64} alt="Profile" className="h-full w-full object-cover" />
                                            ) : user?.photoURL ? (
                                                <img src={user.photoURL} alt="Profile" className="h-full w-full object-cover" />
                                            ) : (
                                                <UserCircle className="h-20 w-20 text-primary/40" />
                                            )}
                                        </div>
                                    </div>
                                    <label className="absolute bottom-2 right-2 p-2 bg-primary text-white rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                        <Edit3 className="h-4 w-4" />
                                        <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} disabled={isUploadingPhoto} />
                                    </label>
                                </div>

                                <div className="flex-1 space-y-2">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div>
                                            <h1 className="text-3xl font-bold tracking-tight">{info?.fullName || "Your Name"}</h1>
                                            <p className="text-muted-foreground font-medium flex items-center gap-2">
                                                <MapPin className="h-4 w-4" />
                                                {info?.location || "Add Location"}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Button variant="outline" size="sm" onClick={() => setActiveSection("personal")} className="rounded-xl shadow-sm">
                                                <Pencil className="h-4 w-4 mr-2" />
                                                Edit Profile
                                            </Button>
                                            <Button size="sm" className="rounded-xl shadow-lg shadow-primary/20">
                                                <Save className="h-4 w-4 mr-2" />
                                                Save Changes
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-4 pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
                                        {info?.email && (
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer">
                                                <Mail className="h-4 w-4" />
                                                {info.email}
                                            </div>
                                        )}
                                        {info?.phone && (
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Phone className="h-4 w-4" />
                                                {info.phone}
                                            </div>
                                        )}
                                        <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700 mx-2 hidden md:block"></div>
                                        <div className="flex items-center gap-3">
                                            {info?.linkedinUrl && (
                                                <a href={info.linkedinUrl} target="_blank" rel="noopener noreferrer" className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-blue-600 hover:scale-110 transition-transform">
                                                    <Linkedin className="h-4 w-4" />
                                                </a>
                                            )}
                                            {info?.githubUrl && (
                                                <a href={info.githubUrl} target="_blank" rel="noopener noreferrer" className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-800 dark:text-slate-200 hover:scale-110 transition-transform">
                                                    <Github className="h-4 w-4" />
                                                </a>
                                            )}
                                            {info?.portfolioUrl && (
                                                <a href={info.portfolioUrl} target="_blank" rel="noopener noreferrer" className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-emerald-600 hover:scale-110 transition-transform">
                                                    <Globe className="h-4 w-4" />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>

                        <div className="px-8 pb-8 pt-4 bg-primary/[0.02] dark:bg-primary/[0.05] border-t border-slate-50 dark:border-slate-800">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                                    <CheckCircle2 className="h-4 w-4" />
                                    Profile Completion
                                </div>
                                <span className="text-sm font-bold">{completionPercentage}%</span>
                            </div>
                            <Progress value={completionPercentage} className="h-3 rounded-full bg-slate-100 dark:bg-slate-800" />
                            <p className="text-xs text-muted-foreground mt-3 italic">
                                * Complete your profile to get 10x better results from the AI Resume Enhancer.
                            </p>
                        </div>
                    </Card>

                    <Accordion type="single" collapsible className="space-y-4" value={activeSection} onValueChange={setActiveSection}>
                        {/* Personal Information */}
                        <AccordionItem value="personal" className="border rounded-xl px-6 bg-card shadow-sm overflow-hidden">
                            <AccordionTrigger className="hover:no-underline">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-600">
                                        <UserCircle className="h-5 w-5" />
                                    </div>
                                    <div className="text-left">
                                        <div className="font-bold text-lg">Personal Information</div>
                                        <div className="text-sm text-muted-foreground font-normal">Contact details, social links, and summary</div>
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-4 pb-6 space-y-6">
                                <PersonalInfoForm
                                    data={profile?.personalInfo}
                                    onSave={(val) => updatePersonalInfo.mutate(val)}
                                    isSaving={updatePersonalInfo.isPending}
                                />
                            </AccordionContent>
                        </AccordionItem>

                        {/* Education */}
                        <AccordionItem value="education" className="border rounded-xl px-6 bg-card shadow-sm overflow-hidden">
                            <AccordionTrigger className="hover:no-underline">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-600">
                                        <BookOpen className="h-5 w-5" />
                                    </div>
                                    <div className="text-left">
                                        <div className="font-bold text-lg">Education</div>
                                        <div className="text-sm text-muted-foreground font-normal">Degrees, certifications, and academic background</div>
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-4 pb-6 space-y-6">
                                <EducationList education={profile?.education || []} />
                            </AccordionContent>
                        </AccordionItem>

                        {/* Work Experience */}
                        <AccordionItem value="experience" className="border rounded-xl px-6 bg-card shadow-sm overflow-hidden">
                            <AccordionTrigger className="hover:no-underline">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-orange-500/10 rounded-lg text-orange-600">
                                        <Briefcase className="h-5 w-5" />
                                    </div>
                                    <div className="text-left">
                                        <div className="font-bold text-lg">Work Experience</div>
                                        <div className="text-sm text-muted-foreground font-normal">Professional history and responsibilities</div>
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-4 pb-6 space-y-6">
                                <ExperienceList experiences={profile?.experience || []} />
                            </AccordionContent>
                        </AccordionItem>

                        {/* Projects */}
                        <AccordionItem value="projects" className="border rounded-xl px-6 bg-card shadow-sm overflow-hidden">
                            <AccordionTrigger className="hover:no-underline">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-500/10 rounded-lg text-purple-600">
                                        <Code className="h-5 w-5" />
                                    </div>
                                    <div className="text-left">
                                        <div className="font-bold text-lg">Projects</div>
                                        <div className="text-sm text-muted-foreground font-normal">Key projects, tech stacks, and results</div>
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-4 pb-6 space-y-6">
                                <ProjectList projects={profile?.projects || []} />
                            </AccordionContent>
                        </AccordionItem>

                        {/* Skills */}
                        <AccordionItem value="skills" className="border rounded-xl px-6 bg-card shadow-sm overflow-hidden">
                            <AccordionTrigger className="hover:no-underline">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-pink-500/10 rounded-lg text-pink-600">
                                        <CheckCircle2 className="h-5 w-5" />
                                    </div>
                                    <div className="text-left">
                                        <div className="font-bold text-lg">Skills & Tech Stack</div>
                                        <div className="text-sm text-muted-foreground font-normal">Technical skills, tools, and expertise</div>
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-4 pb-6 space-y-6">
                                <SkillList skills={profile?.skills || []} />
                            </AccordionContent>
                        </AccordionItem>

                        {/* Certifications & Achievements */}
                        <AccordionItem value="extra" className="border rounded-xl px-6 bg-card shadow-sm overflow-hidden">
                            <AccordionTrigger className="hover:no-underline">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-600">
                                        <Award className="h-5 w-5" />
                                    </div>
                                    <div className="text-left">
                                        <div className="font-bold text-lg">Certifications & Achievements</div>
                                        <div className="text-sm text-muted-foreground font-normal">Awards, accolades, and formal certifications</div>
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-4 pb-6 space-y-6">
                                <ExtraList
                                    certifications={profile?.certifications || []}
                                    achievements={profile?.achievements || []}
                                />
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>
            </main>
        </div>
    );
}

// --- Sub-components (forms and lists) ---

// --- Sub-components (forms and lists) ---

function PersonalInfoForm({ data, onSave, isSaving }: { data: PersonalInfo, onSave: (val: any) => void, isSaving: boolean }) {
    const [isEditing, setIsEditing] = useState(!data?.fullName);
    const [formData, setFormData] = useState(data || {
        fullName: "",
        email: "",
        phone: "",
        location: "",
        linkedinUrl: "",
        githubUrl: "",
        portfolioUrl: "",
        summary: ""
    });

    if (!isEditing && data?.fullName) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Full Name</Label>
                        <p className="font-semibold text-lg">{data.fullName}</p>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Email</Label>
                        <p className="font-medium">{data.email}</p>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Phone</Label>
                        <p className="font-medium">{data.phone || "Not provided"}</p>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Location</Label>
                        <p className="font-medium">{data.location || "Not provided"}</p>
                    </div>
                </div>
                <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Professional Summary</Label>
                    <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">{data.summary || "No summary added yet."}</p>
                </div>
                <div className="flex justify-end">
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit Information
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
                <Label htmlFor="fullName" className="text-sm font-semibold">Full Name</Label>
                <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="John Doe"
                    className="rounded-xl"
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold">Public Email</Label>
                <Input
                    id="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john@example.com"
                    className="rounded-xl"
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-semibold">Phone Number</Label>
                <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1 234 567 890"
                    className="rounded-xl"
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="location" className="text-sm font-semibold">Location</Label>
                <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="San Francisco, CA"
                    className="rounded-xl"
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="linkedin" className="text-sm font-semibold">LinkedIn URL</Label>
                <Input
                    id="linkedin"
                    value={formData.linkedinUrl}
                    onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                    placeholder="https://linkedin.com/in/johndoe"
                    className="rounded-xl"
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="github" className="text-sm font-semibold">GitHub URL</Label>
                <Input
                    id="github"
                    value={formData.githubUrl}
                    onChange={(e) => setFormData({ ...formData, githubUrl: e.target.value })}
                    placeholder="https://github.com/johndoe"
                    className="rounded-xl"
                />
            </div>
            <div className="md:col-span-2 space-y-2">
                <Label htmlFor="summary" className="text-sm font-semibold">Professional Summary</Label>
                <Textarea
                    id="summary"
                    rows={4}
                    value={formData.summary}
                    onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                    placeholder="A brief overview of your professional background and goals..."
                    className="rounded-xl"
                />
            </div>
            <div className="md:col-span-2 flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                <Button onClick={() => { onSave(formData); setIsEditing(false); }} disabled={isSaving}>
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? "Saving..." : "Save Changes"}
                </Button>
            </div>
        </div>
    );
}

function EducationList({ education }: { education: Education[] }) {
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const addMutation = useMutation({
        mutationFn: async (data: Partial<Education>) => {
            const res = await apiRequest("POST", "/api/profile/education", data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
            setIsAdding(false);
        }
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string, data: Partial<Education> }) => {
            const res = await apiRequest("PATCH", `/api/profile/education/${id}`, data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
            setEditingId(null);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await apiRequest("DELETE", `/api/profile/education/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
        }
    });

    return (
        <div className="space-y-6">
            <div className="space-y-4">
                {education.length === 0 && !isAdding && (
                    <div className="text-center py-12 border-2 border-dashed rounded-2xl bg-slate-50 dark:bg-slate-900/50">
                        <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                        <p className="text-muted-foreground">No education added yet.</p>
                        <Button variant="ghost" onClick={() => setIsAdding(true)} className="mt-2 text-primary hover:underline hover:bg-transparent p-0 h-auto">
                            Add your first qualification
                        </Button>
                    </div>
                )}

                {education.map((edu) => (
                    <Card key={edu.id} className="group overflow-hidden border-slate-200 dark:border-slate-800 hover:shadow-md transition-all rounded-2xl">
                        <CardContent className="p-0">
                            {editingId === edu.id ? (
                                <EducationForm
                                    initialData={edu}
                                    onSave={(data) => updateMutation.mutate({ id: edu.id, data })}
                                    onCancel={() => setEditingId(null)}
                                    isSaving={updateMutation.isPending}
                                />
                            ) : (
                                <div className="p-6 flex gap-6 items-start">
                                    <div className="h-16 w-16 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                        <BookOpen className="h-8 w-8 text-primary/40" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="font-bold text-lg">{edu.institution}</h4>
                                                <p className="text-primary font-semibold">{edu.degree} in {edu.fieldOfStudy}</p>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                                    <span>{edu.startYear} — {edu.endYear || 'Present'}</span>
                                                    {edu.cgpa && (
                                                        <>
                                                            <span className="h-1 w-1 rounded-full bg-slate-300"></span>
                                                            <span className="font-medium text-slate-900 dark:text-slate-100">CGPA: {edu.cgpa}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" onClick={() => setEditingId(edu.id)} className="h-8 w-8">
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(edu.id)} className="h-8 w-8 text-destructive">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>

            {isAdding ? (
                <Card className="border-primary/20 bg-primary/[0.02] dark:bg-primary/[0.05] rounded-2xl overflow-hidden shadow-inner">
                    <EducationForm
                        onSave={(data) => addMutation.mutate(data)}
                        onCancel={() => setIsAdding(false)}
                        isSaving={addMutation.isPending}
                    />
                </Card>
            ) : (
                <Button variant="outline" className="w-full border-dashed py-8 rounded-2xl border-slate-300 hover:border-primary transition-colors" onClick={() => setIsAdding(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Education Entry
                </Button>
            )}
        </div>
    );
}

function EducationForm({ initialData, onSave, onCancel, isSaving }: { initialData?: Education, onSave: (data: any) => void, onCancel: () => void, isSaving: boolean }) {
    const [formData, setFormData] = useState(initialData || {
        institution: "",
        degree: "",
        fieldOfStudy: "",
        cgpa: "",
        startYear: "",
        endYear: ""
    });

    return (
        <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-sm font-semibold">Institution Name</Label>
                    <Input value={formData.institution} onChange={e => setFormData({ ...formData, institution: e.target.value })} placeholder="e.g. Stanford University" className="rounded-xl" />
                </div>
                <div className="space-y-2">
                    <Label className="text-sm font-semibold">Degree</Label>
                    <Input value={formData.degree} onChange={e => setFormData({ ...formData, degree: e.target.value })} placeholder="e.g. B.Tech, M.Sc" className="rounded-xl" />
                </div>
                <div className="space-y-2">
                    <Label className="text-sm font-semibold">Field of Study</Label>
                    <Input value={formData.fieldOfStudy} onChange={e => setFormData({ ...formData, fieldOfStudy: e.target.value })} placeholder="e.g. Computer Science" className="rounded-xl" />
                </div>
                <div className="space-y-2">
                    <Label className="text-sm font-semibold">GPA / Percentage</Label>
                    <Input value={formData.cgpa} onChange={e => setFormData({ ...formData, cgpa: e.target.value })} placeholder="e.g. 3.8/4.0 or 85%" className="rounded-xl" />
                </div>
                <div className="space-y-2">
                    <Label className="text-sm font-semibold">Start Year</Label>
                    <Input value={formData.startYear} onChange={e => setFormData({ ...formData, startYear: e.target.value })} placeholder="e.g. 2020" className="rounded-xl" />
                </div>
                <div className="space-y-2">
                    <Label className="text-sm font-semibold">End Year (or Present)</Label>
                    <Input value={formData.endYear} onChange={e => setFormData({ ...formData, endYear: e.target.value })} placeholder="e.g. 2024" className="rounded-xl" />
                </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={onCancel}>Cancel</Button>
                <Button onClick={() => onSave(formData)} disabled={isSaving}>
                    {isSaving ? "Saving..." : initialData ? "Update Entry" : "Add Education"}
                </Button>
            </div>
        </div>
    );
}

function ExperienceList({ experiences }: { experiences: Experience[] }) {
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const addMutation = useMutation({
        mutationFn: async (data: Partial<Experience>) => {
            const res = await apiRequest("POST", "/api/profile/experience", data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
            setIsAdding(false);
        }
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string, data: Partial<Experience> }) => {
            const res = await apiRequest("PATCH", `/api/profile/experience/${id}`, data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
            setEditingId(null);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await apiRequest("DELETE", `/api/profile/experience/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
        }
    });

    return (
        <div className="space-y-6">
            <div className="space-y-4">
                {experiences.length === 0 && !isAdding && (
                    <div className="text-center py-12 border-2 border-dashed rounded-2xl bg-slate-50 dark:bg-slate-900/50">
                        <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                        <p className="text-muted-foreground">No work experience added yet.</p>
                        <Button variant="ghost" onClick={() => setIsAdding(true)} className="mt-2 text-primary hover:underline hover:bg-transparent p-0 h-auto">
                            Add your first role
                        </Button>
                    </div>
                )}

                {experiences.map((exp) => (
                    <Card key={exp.id} className="group overflow-hidden border-slate-200 dark:border-slate-800 hover:shadow-md transition-all rounded-2xl">
                        <CardContent className="p-0">
                            {editingId === exp.id ? (
                                <ExperienceForm
                                    initialData={exp}
                                    onSave={(data) => updateMutation.mutate({ id: exp.id, data })}
                                    onCancel={() => setEditingId(null)}
                                    isSaving={updateMutation.isPending}
                                />
                            ) : (
                                <div className="p-6">
                                    <div className="flex gap-6 items-start">
                                        <div className="h-16 w-16 rounded-xl bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center shrink-0">
                                            <Briefcase className="h-8 w-8 text-orange-600/60" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h4 className="font-bold text-lg">{exp.company}</h4>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-primary font-semibold">{exp.title}</p>
                                                        <Badge variant="secondary" className="text-[10px] h-4 uppercase">{exp.type}</Badge>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1 text-slate-500">
                                                        <span>{exp.startDate} — {exp.endDate || 'Present'}</span>
                                                        {exp.location && (
                                                            <>
                                                                <span className="h-1 w-1 rounded-full bg-slate-300"></span>
                                                                <span>{exp.location}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button variant="ghost" size="icon" onClick={() => setEditingId(exp.id)} className="h-8 w-8">
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(exp.id)} className="h-8 w-8 text-destructive">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className={`mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-400 ${expandedId === exp.id ? '' : 'line-clamp-2'}`}>
                                                {exp.description.split('\n').map((line: string, i: number) => (
                                                    <p key={i}>{line}</p>
                                                ))}
                                            </div>

                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="mt-2 text-primary p-0 h-auto hover:bg-transparent"
                                                onClick={() => setExpandedId(expandedId === exp.id ? null : exp.id)}
                                            >
                                                {expandedId === exp.id ? "Show less" : "Read more"}
                                                <ChevronDown className={`ml-1 h-3 w-3 transition-transform ${expandedId === exp.id ? 'rotate-180' : ''}`} />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>

            {isAdding ? (
                <Card className="border-primary/20 bg-primary/[0.02] dark:bg-primary/[0.05] rounded-2xl overflow-hidden shadow-inner">
                    <ExperienceForm
                        onSave={(data) => addMutation.mutate(data)}
                        onCancel={() => setIsAdding(false)}
                        isSaving={addMutation.isPending}
                    />
                </Card>
            ) : (
                <Button variant="outline" className="w-full border-dashed py-8 rounded-2xl border-slate-300 hover:border-primary transition-colors" onClick={() => setIsAdding(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Work Experience
                </Button>
            )}
        </div>
    );
}

function ExperienceForm({ initialData, onSave, onCancel, isSaving }: { initialData?: Experience, onSave: (data: any) => void, onCancel: () => void, isSaving: boolean }) {
    const [formData, setFormData] = useState(initialData || {
        company: "",
        title: "",
        location: "",
        startDate: "",
        endDate: "",
        type: "Internship" as "Internship" | "Full-time" | "Freelance",
        description: ""
    });

    return (
        <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-sm font-semibold">Company Name</Label>
                    <Input value={formData.company} onChange={e => setFormData({ ...formData, company: e.target.value })} placeholder="e.g. Google" className="rounded-xl" />
                </div>
                <div className="space-y-2">
                    <Label className="text-sm font-semibold">Role / Job Title</Label>
                    <Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="e.g. Software Engineer" className="rounded-xl" />
                </div>
                <div className="space-y-2">
                    <Label className="text-sm font-semibold">Employement Type</Label>
                    <select
                        value={formData.type}
                        onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                        className="w-full flex h-10 rounded-xl border border-input bg-background px-3 py-2 text-sm"
                    >
                        <option value="Internship">Internship</option>
                        <option value="Full-time">Full-time</option>
                        <option value="Freelance">Freelance</option>
                    </select>
                </div>
                <div className="space-y-2">
                    <Label className="text-sm font-semibold">Location</Label>
                    <Input value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} placeholder="e.g. Remote or City, State" className="rounded-xl" />
                </div>
                <div className="space-y-2">
                    <Label className="text-sm font-semibold">Start Date</Label>
                    <Input value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} placeholder="e.g. June 2024" className="rounded-xl" />
                </div>
                <div className="space-y-2">
                    <Label className="text-sm font-semibold">End Date (or Present)</Label>
                    <Input value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} placeholder="e.g. August 2024" className="rounded-xl" />
                </div>
                <div className="md:col-span-2 space-y-2">
                    <Label className="text-sm font-semibold">Description</Label>
                    <Textarea
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                        placeholder="• Built REST APIs using Spring Boot&#10;• Reduced query latency by 30%"
                        rows={4}
                        className="rounded-xl"
                    />
                </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={onCancel}>Cancel</Button>
                <Button onClick={() => onSave(formData)} disabled={isSaving}>
                    {isSaving ? "Saving..." : initialData ? "Update Role" : "Add Experience"}
                </Button>
            </div>
        </div>
    );
}

function ProjectList({ projects }: { projects: Project[] }) {
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const addMutation = useMutation({
        mutationFn: async (data: Partial<Project>) => {
            const res = await apiRequest("POST", "/api/profile/projects", data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
            setIsAdding(false);
        }
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string, data: Partial<Project> }) => {
            const res = await apiRequest("PATCH", `/api/profile/projects/${id}`, data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
            setEditingId(null);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await apiRequest("DELETE", `/api/profile/projects/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
        }
    });

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projects.length === 0 && !isAdding && (
                    <div className="col-span-full text-center py-12 border-2 border-dashed rounded-2xl bg-slate-50 dark:bg-slate-900/50">
                        <Code className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                        <p className="text-muted-foreground">No projects added yet.</p>
                        <Button variant="ghost" onClick={() => setIsAdding(true)} className="mt-2 text-primary hover:underline hover:bg-transparent p-0 h-auto">
                            Showcase your best work
                        </Button>
                    </div>
                )}

                {projects.map((proj) => (
                    <Card key={proj.id} className="group overflow-hidden border-slate-200 dark:border-slate-800 hover:shadow-md transition-all rounded-2xl flex flex-col">
                        <CardContent className="p-0 flex-1">
                            {editingId === proj.id ? (
                                <ProjectForm
                                    initialData={proj}
                                    onSave={(data) => updateMutation.mutate({ id: proj.id, data })}
                                    onCancel={() => setEditingId(null)}
                                    isSaving={updateMutation.isPending}
                                />
                            ) : (
                                <div className="p-6 h-full flex flex-col">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="h-12 w-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/20 flex items-center justify-center shrink-0">
                                            <Code className="h-6 w-6 text-indigo-600/60" />
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" onClick={() => setEditingId(proj.id)} className="h-8 w-8">
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(proj.id)} className="h-8 w-8 text-destructive">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <h4 className="font-bold text-lg leading-tight">{proj.title}</h4>
                                        <div className="flex flex-wrap gap-1">
                                            {proj.technologies.split(',').map((tech: string, i: number) => (
                                                <Badge key={i} variant="outline" className="text-[10px] py-0 bg-slate-50 dark:bg-slate-800 font-medium">{tech.trim()}</Badge>
                                            ))}
                                        </div>
                                        <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3 pt-2">{proj.description}</p>
                                    </div>
                                    {proj.url && (
                                        <a href={proj.url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center text-xs font-semibold text-primary hover:underline group/link">
                                            View Project
                                            <ExternalLink className="ml-1 h-3 w-3 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
                                        </a>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>

            {isAdding ? (
                <Card className="border-primary/20 bg-primary/[0.02] dark:bg-primary/[0.05] rounded-2xl overflow-hidden shadow-inner">
                    <ProjectForm
                        onSave={(data) => addMutation.mutate(data)}
                        onCancel={() => setIsAdding(false)}
                        isSaving={addMutation.isPending}
                    />
                </Card>
            ) : (
                <Button variant="outline" className="w-full border-dashed py-8 rounded-2xl border-slate-300 hover:border-primary transition-colors" onClick={() => setIsAdding(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Project
                </Button>
            )}
        </div>
    );
}

function ProjectForm({ initialData, onSave, onCancel, isSaving }: { initialData?: Project, onSave: (data: any) => void, onCancel: () => void, isSaving: boolean }) {
    const [formData, setFormData] = useState(initialData || {
        title: "",
        technologies: "",
        url: "",
        description: ""
    });

    return (
        <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                    <Label className="text-sm font-semibold">Project Title</Label>
                    <Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="e.g. AI Portfolio Dashboard" className="rounded-xl" />
                </div>
                <div className="space-y-2">
                    <Label className="text-sm font-semibold">Technologies (Comma separated)</Label>
                    <Input value={formData.technologies} onChange={e => setFormData({ ...formData, technologies: e.target.value })} placeholder="e.g. React, TypeScript, Tailwind" className="rounded-xl" />
                </div>
                <div className="space-y-2">
                    <Label className="text-sm font-semibold">Project Link (Optional)</Label>
                    <Input value={formData.url} onChange={e => setFormData({ ...formData, url: e.target.value })} placeholder="https://github.com/..." className="rounded-xl" />
                </div>
                <div className="space-y-2">
                    <Label className="text-sm font-semibold">Project Description</Label>
                    <Textarea
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Describe the problem you solved and your contribution..."
                        rows={4}
                        className="rounded-xl"
                    />
                </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={onCancel}>Cancel</Button>
                <Button onClick={() => onSave(formData)} disabled={isSaving}>
                    {isSaving ? "Saving..." : initialData ? "Update Project" : "Add Project"}
                </Button>
            </div>
        </div>
    );
}

function SkillList({ skills }: { skills: Skill[] }) {
    const [newSkill, setNewSkill] = useState("");
    const [newCategory, setNewCategory] = useState("Technical");

    const addMutation = useMutation({
        mutationFn: async (data: Partial<Skill>) => {
            const res = await apiRequest("POST", "/api/profile/skills", data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
            setNewSkill("");
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await apiRequest("DELETE", `/api/profile/skills/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
        }
    });

    const categories = Array.from(new Set(skills.map(s => s.category)));

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row gap-4 p-6 border rounded-2xl bg-slate-50 dark:bg-slate-900/50">
                <div className="flex-1 space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider opacity-60">Skill Name</Label>
                    <Input
                        value={newSkill}
                        onChange={(e) => setNewSkill(e.target.value)}
                        placeholder="e.g. React, Python, AWS"
                        className="rounded-xl bg-white dark:bg-slate-800"
                    />
                </div>
                <div className="w-full md:w-48 space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider opacity-60">Category</Label>
                    <Input
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        placeholder="Technical"
                        className="rounded-xl bg-white dark:bg-slate-800"
                    />
                </div>
                <div className="flex items-end">
                    <Button onClick={() => addMutation.mutate({ name: newSkill, category: newCategory, proficiency: "Intermediate" })} disabled={!newSkill} className="rounded-xl h-10 w-full md:w-auto">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Skill
                    </Button>
                </div>
            </div>

            <div className="space-y-6">
                {categories.length === 0 && skills.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground italic bg-slate-50/50 dark:bg-slate-900/20 rounded-2xl border-2 border-dashed">
                        No skills showcased yet.
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                    {categories.map(cat => (
                        <div key={cat} className="space-y-3">
                            <h4 className="text-sm font-bold uppercase tracking-widest text-primary/80 border-b pb-2 border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                {cat}
                                <span className="text-[10px] bg-primary/10 px-2 py-0.5 rounded-full">{skills.filter(s => s.category === cat).length}</span>
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {skills.filter(s => s.category === cat).map(s => (
                                    <Badge key={s.id} variant="secondary" className="pl-3 pr-1 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 transition-colors flex items-center gap-1 group">
                                        <span className="font-medium text-slate-700 dark:text-slate-300">{s.name}</span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => deleteMutation.mutate(s.id)}
                                            className="h-5 w-5 rounded-md hover:bg-destructive/10 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function ExtraList({ certifications, achievements }: { certifications: Certification[], achievements: Achievement[] }) {
    const [isAddingCert, setIsAddingCert] = useState(false);
    const [isAddingAch, setIsAddingAch] = useState(false);

    const addCert = useMutation({
        mutationFn: async (data: Partial<Certification>) => {
            const res = await apiRequest("POST", "/api/profile/certifications", data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
            setIsAddingCert(false);
        }
    });

    const addAch = useMutation({
        mutationFn: async (data: Partial<Achievement>) => {
            const res = await apiRequest("POST", "/api/profile/achievements", data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
            setIsAddingAch(false);
        }
    });

    const deleteCert = useMutation({
        mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/profile/certifications/${id}`); },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/profile"] }); }
    });

    const deleteAch = useMutation({
        mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/profile/achievements/${id}`); },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/profile"] }); }
    });

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Certifications */}
            <div className="space-y-6">
                <div className="flex items-center justify-between border-b pb-4 border-slate-100 dark:border-slate-800">
                    <h4 className="text-xl font-bold flex items-center gap-3">
                        <Award className="h-6 w-6 text-indigo-600" />
                        Certifications
                    </h4>
                    {!isAddingCert && (
                        <Button variant="ghost" size="sm" onClick={() => setIsAddingCert(true)} className="text-primary hover:bg-primary/5 rounded-xl">
                            <Plus className="h-4 w-4 mr-1" /> Add
                        </Button>
                    )}
                </div>

                <div className="space-y-3">
                    {certifications.length === 0 && !isAddingCert && (
                        <p className="text-sm text-muted-foreground italic py-4">No certifications added yet.</p>
                    )}
                    {certifications.map(c => (
                        <div key={c.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border rounded-2xl hover:shadow-sm group transition-all">
                            <div className="flex gap-4 items-center">
                                <div className="h-10 w-10 rounded-lg bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center shrink-0">
                                    <Award className="h-5 w-5 text-indigo-600/60" />
                                </div>
                                <div>
                                    <div className="font-bold text-slate-900 dark:text-slate-100">{c.name}</div>
                                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                                        <span>{c.issuer}</span>
                                        <span className="h-1 w-1 rounded-full bg-slate-200"></span>
                                        <span>{c.date}</span>
                                    </div>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => deleteCert.mutate(c.id)} className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-destructive hover:bg-destructive/5 rounded-lg">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>

                {isAddingCert && (
                    <Card className="p-5 border-primary/20 bg-primary/[0.02] rounded-2xl space-y-4 shadow-inner">
                        <div className="space-y-3">
                            <div className="space-y-1">
                                <Label className="text-xs font-bold uppercase tracking-wider opacity-60">Certification Name</Label>
                                <Input id="certName" placeholder="e.g. AWS Solutions Architect" className="rounded-xl" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs font-bold uppercase tracking-wider opacity-60">Issuing Organization</Label>
                                <Input id="certIssuer" placeholder="e.g. Amazon Web Services" className="rounded-xl" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs font-bold uppercase tracking-wider opacity-60">Issue Date</Label>
                                <Input id="certDate" placeholder="e.g. March 2024" className="rounded-xl" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="ghost" size="sm" onClick={() => setIsAddingCert(false)}>Cancel</Button>
                            <Button size="sm" className="rounded-xl" onClick={() => {
                                const name = (document.getElementById("certName") as HTMLInputElement).value;
                                const issuer = (document.getElementById("certIssuer") as HTMLInputElement).value;
                                const date = (document.getElementById("certDate") as HTMLInputElement).value;
                                addCert.mutate({ name, issuer, date });
                            }}>Add Certification</Button>
                        </div>
                    </Card>
                )}
            </div>

            {/* Achievements */}
            <div className="space-y-6">
                <div className="flex items-center justify-between border-b pb-4 border-slate-100 dark:border-slate-800">
                    <h4 className="text-xl font-bold flex items-center gap-3">
                        <Trophy className="h-6 w-6 text-amber-500" />
                        Achievements
                    </h4>
                    {!isAddingAch && (
                        <Button variant="ghost" size="sm" onClick={() => setIsAddingAch(true)} className="text-primary hover:bg-primary/5 rounded-xl">
                            <Plus className="h-4 w-4 mr-1" /> Add
                        </Button>
                    )}
                </div>

                <div className="space-y-3">
                    {achievements.length === 0 && !isAddingAch && (
                        <p className="text-sm text-muted-foreground italic py-4">No achievements listed yet.</p>
                    )}
                    {achievements.map(a => (
                        <div key={a.id} className="flex flex-col gap-2 p-4 bg-white dark:bg-slate-900 border rounded-2xl hover:shadow-sm group transition-all relative">
                            <div className="flex justify-between items-start pr-10">
                                <div>
                                    <div className="font-bold text-slate-900 dark:text-slate-100">{a.title}</div>
                                    <div className="text-[10px] font-bold uppercase tracking-widest text-amber-600 mt-0.5">{a.date}</div>
                                </div>
                                <div className="h-10 w-10 rounded-lg bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center shrink-0">
                                    <Trophy className="h-5 w-5 text-amber-500/60" />
                                </div>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed pr-6">{a.description}</p>
                            <Button variant="ghost" size="icon" onClick={() => deleteAch.mutate(a.id)} className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-destructive hover:bg-destructive/5 rounded-lg">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>

                {isAddingAch && (
                    <Card className="p-5 border-primary/20 bg-primary/[0.02] rounded-2xl space-y-4 shadow-inner">
                        <div className="space-y-3">
                            <div className="space-y-1">
                                <Label className="text-xs font-bold uppercase tracking-wider opacity-60">Achievement Title</Label>
                                <Input id="achTitle" placeholder="e.g. Hackathon Winner" className="rounded-xl" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs font-bold uppercase tracking-wider opacity-60">Date / Year</Label>
                                <Input id="achDate" placeholder="e.g. 2024" className="rounded-xl" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs font-bold uppercase tracking-wider opacity-60">Description</Label>
                                <Textarea id="achDesc" placeholder="Briefly describe your accomplishment..." rows={3} className="rounded-xl" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="ghost" size="sm" onClick={() => setIsAddingAch(false)}>Cancel</Button>
                            <Button size="sm" className="rounded-xl" onClick={() => {
                                const title = (document.getElementById("achTitle") as HTMLInputElement).value;
                                const date = (document.getElementById("achDate") as HTMLInputElement).value;
                                const description = (document.getElementById("achDesc") as HTMLTextAreaElement).value;
                                addAch.mutate({ title, date, description });
                            }}>Add Achievement</Button>
                        </div>
                    </Card>
                )}
            </div>
        </div>
    );
}
