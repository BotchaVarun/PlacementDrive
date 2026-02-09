import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useJobs } from "@/hooks/use-jobs";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreateJobDialog } from "@/components/CreateJobDialog";
import { MoreHorizontal, ExternalLink, Calendar, MapPin, Building2, SearchX } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function JobTracker() {
  const { data: jobs, isLoading } = useJobs();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return "bg-blue-100 text-blue-700 border-blue-200";
      case 'applied': return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case 'interview': return "bg-purple-100 text-purple-700 border-purple-200";
      case 'rejected': return "bg-red-100 text-red-700 border-red-200";
      case 'offer': return "bg-green-100 text-green-700 border-green-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const StatusColumn = ({ title, status }: { title: string, status: string }) => {
    const filteredJobs = jobs?.filter(j => j.status === status) || [];
    
    return (
      <div className="flex flex-col gap-4 min-w-[300px] flex-1">
        <div className="flex items-center justify-between pb-2 border-b-2 border-primary/10">
           <h3 className="font-semibold text-lg">{title}</h3>
           <span className="text-xs font-medium bg-secondary px-2 py-1 rounded-full text-muted-foreground">{filteredJobs.length}</span>
        </div>
        
        <div className="flex flex-col gap-3">
          {filteredJobs.length === 0 ? (
             <div className="p-4 border border-dashed border-border rounded-lg text-center text-sm text-muted-foreground bg-secondary/20 h-32 flex flex-col items-center justify-center">
               <SearchX className="h-6 w-6 mb-2 opacity-50" />
               No jobs here
             </div>
          ) : (
             filteredJobs.map(job => (
               <Card key={job.id} className="hover:shadow-md transition-shadow cursor-pointer group">
                 <CardContent className="p-4 space-y-3">
                   <div className="flex justify-between items-start">
                     <div>
                       <h4 className="font-bold text-foreground line-clamp-1">{job.title}</h4>
                       <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                         <Building2 className="h-3 w-3" />
                         <span>{job.company}</span>
                       </div>
                     </div>
                     <DropdownMenu>
                       <DropdownMenuTrigger asChild>
                         <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                           <MoreHorizontal className="h-4 w-4" />
                         </Button>
                       </DropdownMenuTrigger>
                       <DropdownMenuContent align="end">
                         <DropdownMenuItem>Edit Details</DropdownMenuItem>
                         <DropdownMenuItem>Move to...</DropdownMenuItem>
                         <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                       </DropdownMenuContent>
                     </DropdownMenu>
                   </div>
                   
                   <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(job.createdAt!).toLocaleDateString()}
                      </div>
                      {job.url && (
                        <a href={job.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs flex items-center gap-1">
                          Link <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                   </div>
                 </CardContent>
               </Card>
             ))
          )}
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold font-display">Job Tracker</h1>
          <p className="text-muted-foreground">Manage your applications and interviews.</p>
        </div>
        <CreateJobDialog />
      </div>

      <div className="flex gap-6 overflow-x-auto pb-6">
        {isLoading ? (
          [1,2,3,4].map(i => <div key={i} className="min-w-[300px] h-96 bg-muted/20 rounded-xl animate-pulse" />)
        ) : (
          <>
            <StatusColumn title="Wishlist" status="new" />
            <StatusColumn title="Applied" status="applied" />
            <StatusColumn title="Interview" status="interview" />
            <StatusColumn title="Offer / Rejected" status="rejected" />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
