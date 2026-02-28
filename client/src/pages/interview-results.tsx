import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, AlertCircle, XCircle, Trophy, Home } from "lucide-react";
import { useLocation } from "wouter";
import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    Legend
} from "recharts";

export default function InterviewResults() {
    const [, params] = useRoute("/mock/:id/results");
    const interviewId = params?.id;
    const [, setLocation] = useLocation();

    const { data, isLoading, error } = useQuery({
        queryKey: [`/api/interviews/${interviewId}/results`],
    });

    if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    if (error) return <div className="flex h-screen items-center justify-center text-red-500">Failed to load results</div>;

    const { interview, responses, aggregates } = data as any;

    // Chart Data
    const radarData = [
        { subject: 'Technical', A: aggregates?.technicalScore || 0, fullMark: 10 },
        { subject: 'Communication', A: aggregates?.communicationScore || 0, fullMark: 10 },
        { subject: 'Confidence', A: 7, fullMark: 10 }, // Mock confidence for now or extract from metrics
        { subject: 'Structure', A: 6, fullMark: 10 }, // Mock
        { subject: 'Vocabulary', A: 8, fullMark: 10 }, // Mock
    ];

    return (
        <div className="min-h-screen bg-background p-6 md:p-12">
            <div className="max-w-6xl mx-auto space-y-8">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600 mb-2">
                            Interview Analysis
                        </h1>
                        <p className="text-muted-foreground text-lg">
                            {interview.domain} • {interview.difficulty} • {new Date(interview.createdAt).toLocaleDateString()}
                        </p>
                    </div>
                    <Button onClick={() => setLocation("/")} variant="outline">
                        <Home className="mr-2 h-4 w-4" /> Back to Dashboard
                    </Button>
                </div>

                {/* Score Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <Card className="bg-primary/5 border-primary/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg font-medium">Overall Score</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-5xl font-bold text-primary">{aggregates?.overallScore}/10</div>
                            <Progress value={(aggregates?.overallScore || 0) * 10} className="mt-4 h-2" />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg font-medium">Technical</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-bold">{aggregates?.technicalScore}/10</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg font-medium">Communication</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-bold">{aggregates?.communicationScore}/10</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg font-medium">Questions</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-bold">{aggregates?.questionsAnswered}/{interview.questionCount}</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Charts & Graphs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Skill Breakdown</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                    <PolarGrid />
                                    <PolarAngleAxis dataKey="subject" />
                                    <PolarRadiusAxis />
                                    <Radar name="You" dataKey="A" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                                    <Tooltip />
                                </RadarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Key Strengths & Improvements</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />
                                    <div>
                                        <h4 className="font-semibold">Strong Technical Core</h4>
                                        <p className="text-sm text-muted-foreground">You demonstrated good understanding of base concepts.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="h-6 w-6 text-yellow-500 flex-shrink-0" />
                                    <div>
                                        <h4 className="font-semibold">Structure could be better</h4>
                                        <p className="text-sm text-muted-foreground">Try using the STAR method for behavioral questions.</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Detailed Feedback */}
                <h2 className="text-2xl font-bold pt-4">Detailed Question Feedback</h2>
                <Accordion type="single" collapsible className="w-full">
                    {responses.map((response: any, index: number) => {
                        const feedback = response.aiFeedbackJson;
                        return (
                            <AccordionItem key={response.id} value={response.id}>
                                <AccordionTrigger className="hover:no-underline">
                                    <div className="flex justify-between items-center w-full pr-4">
                                        <div className="bg-muted px-3 py-1 rounded text-sm font-medium mr-4">Q{index + 1}</div>
                                        <span className="text-left font-medium flex-1">
                                            {/* We need question text here, but response object might not have it unless joined. 
                           However, `getInterviewResponses` doesn't join. 
                           We can fetch questions separately or rely on frontend matching.
                           For now, we'll display "Question Analysis" if text missing.
                       */}
                                            Question Analysis
                                        </span>
                                        <div className={`px-3 py-1 rounded-full text-white text-sm font-bold ml-2 ${feedback.score >= 8 ? "bg-green-500" : feedback.score >= 5 ? "bg-yellow-500" : "bg-red-500"
                                            }`}>
                                            {feedback.score}/10
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="p-4 bg-muted/30 space-y-4">
                                    <div className="space-y-2">
                                        <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">You Said:</h4>
                                        <p className="bg-background p-3 rounded-md border text-sm italic">
                                            "{response.userTranscript || "No transcript available."}"
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Feedback:</h4>
                                        <p className="text-sm">{feedback.feedback}</p>
                                    </div>

                                    <div className="space-y-2">
                                        <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Better Answer:</h4>
                                        <p className="bg-primary/10 p-3 rounded-md text-sm border border-primary/20">
                                            {feedback.betterAnswer}
                                        </p>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        );
                    })}
                </Accordion>
            </div>
        </div>
    );
}
