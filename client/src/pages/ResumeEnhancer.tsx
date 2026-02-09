import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useCreateResume, useAnalyzeResume } from "@/hooks/use-resumes";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Loader2, 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Copy,
  Download,
  ArrowRight
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

export default function ResumeEnhancer() {
  const [resumeTitle, setResumeTitle] = useState("");
  const [resumeContent, setResumeContent] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  
  const createResume = useCreateResume();
  const analyzeResume = useAnalyzeResume();
  const { toast } = useToast();

  const handleAnalyze = async () => {
    if (!resumeContent || !jobDescription) {
      toast({ title: "Missing Information", description: "Please provide both resume content and job description.", variant: "destructive" });
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      // 1. Create the resume entry first
      const resume = await createResume.mutateAsync({
        title: resumeTitle || "Untitled Resume",
        content: resumeContent,
      });

      // 2. Analyze it
      const result = await analyzeResume.mutateAsync({
        resumeId: resume.id,
        jobDescription,
      });
      
      setAnalysisResult(result);
    } catch (error) {
      // Error handled by hooks
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-8rem)] flex flex-col">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold font-display">Resume Enhancer</h1>
            <p className="text-muted-foreground">Tailor your resume to the job description for maximum impact.</p>
          </div>
          {analysisResult && (
             <Button onClick={() => { setAnalysisResult(null); setResumeContent(""); setJobDescription(""); }} variant="outline">
               Start New
             </Button>
          )}
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
          
          {/* LEFT COLUMN: INPUTS */}
          <div className="flex flex-col gap-6 overflow-y-auto pr-2 pb-4">
            <Card className="flex-1 shadow-sm border-border/60">
              <CardHeader>
                <CardTitle>1. Your Resume</CardTitle>
                <CardDescription>Paste your current resume content or LaTeX code.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input 
                  placeholder="Resume Title (e.g. Frontend Dev Resume)" 
                  value={resumeTitle}
                  onChange={(e) => setResumeTitle(e.target.value)}
                />
                <Tabs defaultValue="paste" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="paste">Paste Text / LaTeX</TabsTrigger>
                    <TabsTrigger value="upload" disabled>Upload File (Pro)</TabsTrigger>
                  </TabsList>
                  <TabsContent value="paste" className="mt-4">
                    <Textarea 
                      className="min-h-[300px] font-mono text-sm leading-relaxed"
                      placeholder="\documentclass{article}..." 
                      value={resumeContent}
                      onChange={(e) => setResumeContent(e.target.value)}
                    />
                  </TabsContent>
                  <TabsContent value="upload">
                     <div className="h-[300px] border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center text-muted-foreground bg-secondary/20">
                       <UploadCloud className="h-10 w-10 mb-2 opacity-50" />
                       <p>File upload coming soon.</p>
                     </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <Card className="flex-1 shadow-sm border-border/60">
              <CardHeader>
                <CardTitle>2. Job Description</CardTitle>
                <CardDescription>Paste the job description you want to target.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea 
                  className="min-h-[200px] text-sm"
                  placeholder="Paste JD here..." 
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                />
                <Button 
                  className="w-full h-12 text-lg shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all"
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Analyzing & Optimizing...
                    </>
                  ) : (
                    <>
                      Analyze & Optimize <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN: RESULTS */}
          <div className="flex flex-col gap-6 overflow-y-auto pb-4 h-full">
            <AnimatePresence mode="wait">
              {isAnalyzing ? (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }}
                  className="h-full flex flex-col items-center justify-center p-8 text-center space-y-6 bg-card/50 rounded-2xl border border-dashed border-border"
                >
                  <div className="relative">
                    <div className="w-24 h-24 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary h-8 w-8 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">AI is reading your resume...</h3>
                    <p className="text-muted-foreground mt-2 max-w-xs mx-auto">
                      Comparing keywords, analyzing formatting, and generating LaTeX optimizations.
                    </p>
                  </div>
                </motion.div>
              ) : analysisResult ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  {/* Score Card */}
                  <Card className="bg-gradient-to-br from-card to-secondary/30 border-primary/20 shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex justify-between items-center">
                        <span>Analysis Results</span>
                        <span className="text-sm font-normal text-muted-foreground bg-background px-3 py-1 rounded-full border">
                          Generated just now
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="relative h-40 w-40">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={[{ value: analysisResult.atsScore }, { value: 100 - analysisResult.atsScore }]}
                                innerRadius={60}
                                outerRadius={80}
                                startAngle={90}
                                endAngle={-270}
                                dataKey="value"
                              >
                                <Cell fill="hsl(var(--primary))" />
                                <Cell fill="hsl(var(--muted))" />
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-4xl font-bold font-display">{analysisResult.atsScore}</span>
                            <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">ATS Score</span>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                         <ScoreBar label="Skills Match" score={analysisResult.sectionScores.skills} />
                         <ScoreBar label="Experience Impact" score={analysisResult.sectionScores.experience} />
                         <ScoreBar label="Formatting" score={analysisResult.sectionScores.formatting} />
                         <ScoreBar label="Education" score={analysisResult.sectionScores.education} />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Feedback */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="border-l-4 border-l-orange-500">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-orange-500" />
                          Missing Keywords
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {analysisResult.missingKeywords.map((kw: string, i: number) => (
                            <span key={i} className="px-2 py-1 bg-orange-500/10 text-orange-700 dark:text-orange-300 text-xs font-semibold rounded-md border border-orange-500/20">
                              {kw}
                            </span>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-blue-500">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5 text-blue-500" />
                          AI Feedback
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {analysisResult.feedback}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Optimized Code */}
                  <Card className="border-primary/20 shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between bg-secondary/50 border-b border-border py-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        <CardTitle className="text-base">Optimized LaTeX Code</CardTitle>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            navigator.clipboard.writeText(analysisResult.optimizedLatex);
                            toast({ title: "Copied!", description: "LaTeX code copied to clipboard." });
                          }}
                        >
                          <Copy className="h-4 w-4 mr-1" /> Copy
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4 mr-1" /> .tex
                        </Button>
                      </div>
                    </CardHeader>
                    <div className="relative">
                      <pre className="p-4 bg-slate-950 text-slate-50 overflow-x-auto text-xs font-mono h-64 rounded-b-xl leading-relaxed">
                        <code>{analysisResult.optimizedLatex}</code>
                      </pre>
                    </div>
                  </Card>

                </motion.div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-border rounded-xl bg-secondary/10">
                  <div className="bg-secondary/50 p-6 rounded-full mb-4">
                    <Sparkles className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold">Ready to Optimize</h3>
                  <p className="text-muted-foreground max-w-xs mt-2">
                    Enter your resume and a job description on the left to generate AI-powered insights.
                  </p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function ScoreBar({ label, score }: { label: string, score: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-medium">
        <span>{label}</span>
        <span>{score}%</span>
      </div>
      <Progress value={score} className="h-2" />
    </div>
  );
}
