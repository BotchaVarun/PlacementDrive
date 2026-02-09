import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useResumes } from "@/hooks/use-resumes";
import { useJobs } from "@/hooks/use-jobs";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  FileText, 
  Briefcase, 
  TrendingUp, 
  Calendar,
  AlertCircle
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { CreateJobDialog } from "@/components/CreateJobDialog";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: resumes, isLoading: resumesLoading } = useResumes();
  const { data: jobs, isLoading: jobsLoading } = useJobs();

  // Calculate simple stats
  const totalJobs = jobs?.length || 0;
  const activeApplications = jobs?.filter(j => j.status !== 'rejected').length || 0;
  const recentResumes = resumes?.slice(0, 3) || [];
  const latestResume = resumes?.[0];
  
  // Calculate average ATS score (mock logic if field is null)
  const avgScore = resumes?.reduce((acc, r) => acc + (r.atsScore || 0), 0) / (resumes?.length || 1);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold font-display text-foreground">
              Hello, {user?.displayName?.split(" ")[0]}! 👋
            </h1>
            <p className="text-muted-foreground mt-1">
              Here's what's happening with your job search today.
            </p>
          </div>
          <div className="flex gap-3">
             <CreateJobDialog />
             <Link href="/enhance">
               <Button variant="outline">Optimize Resume</Button>
             </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="Active Applications" 
            value={activeApplications.toString()} 
            icon={Briefcase} 
            trend="+2 this week"
            trendUp={true}
          />
          <StatCard 
            title="Resumes Optimized" 
            value={resumes?.length.toString() || "0"} 
            icon={FileText} 
            trend="Last used 2d ago"
          />
          <StatCard 
            title="Average ATS Score" 
            value={Math.round(avgScore).toString() || "N/A"} 
            icon={TrendingUp} 
            trend={avgScore > 70 ? "Good standing" : "Needs improvement"}
            trendUp={avgScore > 70}
          />
          <StatCard 
            title="Interviews" 
            value={jobs?.filter(j => j.status === 'interview').length.toString() || "0"} 
            icon={Calendar} 
            trend="Upcoming"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Resumes */}
          <Card className="lg:col-span-2 shadow-sm">
            <CardHeader>
              <CardTitle>Recent Optimizations</CardTitle>
              <CardDescription>Your latest resume analysis results.</CardDescription>
            </CardHeader>
            <CardContent>
              {resumesLoading ? (
                 <div className="space-y-3">
                   {[1,2,3].map(i => <div key={i} className="h-12 bg-muted rounded animate-pulse" />)}
                 </div>
              ) : recentResumes.length > 0 ? (
                <div className="space-y-4">
                  {recentResumes.map(resume => (
                    <div key={resume.id} className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl border border-border/50 hover:border-primary/30 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                           {resume.atsScore || "?"}
                        </div>
                        <div>
                          <h4 className="font-semibold text-foreground">{resume.title}</h4>
                          <p className="text-xs text-muted-foreground">
                            {new Date(resume.createdAt!).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Link href={`/enhance?id=${resume.id}`}>
                        <Button variant="ghost" size="sm">View Analysis</Button>
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground bg-secondary/20 rounded-xl border border-dashed border-border">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No resumes optimized yet.</p>
                  <Link href="/enhance">
                    <Button variant="link" className="mt-2">Start Optimization</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Job Pipeline Snapshot */}
          <Card className="shadow-sm">
             <CardHeader>
              <CardTitle>Job Pipeline</CardTitle>
              <CardDescription>Status overview.</CardDescription>
            </CardHeader>
            <CardContent>
              {jobsLoading ? (
                 <div className="h-40 bg-muted rounded animate-pulse" />
              ) : totalJobs > 0 ? (
                <div className="space-y-4">
                  <PipelineRow label="To Apply" count={jobs?.filter(j => j.status === 'new').length || 0} color="bg-blue-500" />
                  <PipelineRow label="Applied" count={jobs?.filter(j => j.status === 'applied').length || 0} color="bg-yellow-500" />
                  <PipelineRow label="Interviewing" count={jobs?.filter(j => j.status === 'interview').length || 0} color="bg-purple-500" />
                  <PipelineRow label="Offers" count={jobs?.filter(j => j.status === 'offer').length || 0} color="bg-green-500" />
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground bg-secondary/20 rounded-xl border border-dashed border-border">
                  <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No jobs tracked yet.</p>
                  <CreateJobDialog />
                </div>
              )}
              
              {/* Alert box */}
              {latestResume && (latestResume.atsScore || 0) < 70 && (
                <div className="mt-6 p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl flex gap-3 items-start">
                   <AlertCircle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
                   <div>
                     <p className="text-sm font-semibold text-orange-800 dark:text-orange-200">Resume Needs Work</p>
                     <p className="text-xs text-orange-700/80 dark:text-orange-300/80 mt-1">
                       Your latest ATS score is low. Try optimizing keywords for better matches.
                     </p>
                   </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

function StatCard({ title, value, icon: Icon, trend, trendUp }: any) {
  return (
    <Card className="shadow-sm border-border/60">
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <h3 className="text-3xl font-bold font-display mt-2">{value}</h3>
          </div>
          <div className="p-3 bg-primary/10 rounded-xl text-primary">
            <Icon className="h-5 w-5" />
          </div>
        </div>
        {trend && (
          <div className={`mt-4 text-xs font-medium flex items-center ${trendUp === true ? 'text-green-600' : trendUp === false ? 'text-red-600' : 'text-muted-foreground'}`}>
            {trend}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PipelineRow({ label, count, color }: { label: string, count: number, color: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className={`h-2.5 w-2.5 rounded-full ${color}`} />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <span className="text-sm font-bold bg-secondary px-2 py-0.5 rounded text-secondary-foreground">
        {count}
      </span>
    </div>
  );
}
