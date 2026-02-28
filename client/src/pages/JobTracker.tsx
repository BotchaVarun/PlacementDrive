import { memo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useJobs, useUpdateJob, useDeleteJob } from "@/hooks/use-jobs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreateJobDialog } from "@/components/CreateJobDialog";
import { MoreHorizontal, ExternalLink, Calendar, Building2, SearchX } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent
} from "@/components/ui/dropdown-menu";
import { EditJobDialog } from "@/components/EditJobDialog";
import { Job } from "@shared/schema";
import { useState } from "react";

/**
 * Normalize a potentially null/undefined status to a safe string.
 * Jobs with no status default to "new" (Wishlist column).
 */
const normalizeStatus = (status?: string | null): string => status?.toLowerCase() ?? "new";

export default function JobTracker() {
  const { data: jobs, isLoading, error } = useJobs(undefined, true);
  const updateJob = useUpdateJob();
  const deleteJob = useDeleteJob();
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const handleEdit = (job: Job) => {
    setEditingJob(job);
    setEditOpen(true);
  };

  const handleMove = async (job: Job, newStatus: string) => {
    await updateJob.mutateAsync({ id: job.id, data: { status: newStatus } });
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this job?")) {
      await deleteJob.mutateAsync(id);
    }
  };

  const StatusColumn = ({ title, status }: { title: string, status: string | string[] }) => {
    const filteredJobs = jobs?.filter(j => {
      const normalized = normalizeStatus(j.status);
      return Array.isArray(status) ? status.includes(normalized) : normalized === status;
    }) || [];

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
              <JobItem
                key={job.id}
                job={job}
                onEdit={handleEdit}
                onMove={handleMove}
                onDelete={handleDelete}
              />
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

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-lg mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold">Error loading jobs:</span>
            <span>{(error as Error).message || "Something went wrong."}</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      )}

      <div className="flex gap-6 overflow-x-auto pb-6">
        {isLoading ? (
          [1, 2, 3, 4].map(i => <div key={i} className="min-w-[300px] h-96 bg-muted/20 rounded-xl animate-pulse" />)
        ) : (
          <>
            <StatusColumn title="Wishlist" status={["new", "to apply"]} />
            <StatusColumn title="Applied" status="applied" />
            <StatusColumn title="Interview" status="interview" />
            <StatusColumn title="Offer / Rejected" status={['offer', 'rejected']} />
          </>
        )}
      </div>

      <EditJobDialog
        job={editingJob}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </DashboardLayout>
  );
}

const JobItem = memo(({ job, onEdit, onMove, onDelete }: {
  job: Job,
  onEdit: (job: Job) => void,
  onMove: (job: Job, status: string) => void,
  onDelete: (id: string) => void
}) => {
  // Graceful null fallbacks for all displayed fields
  const title = job.title || "Untitled Position";
  const company = job.company || "Unknown Company";
  const appliedDate = (job as any).appliedDate as string | null | undefined;
  const displayDate = appliedDate
    ? `Applied ${new Date(appliedDate).toLocaleDateString()}`
    : job.createdAt
      ? `Added ${new Date(job.createdAt).toLocaleDateString()}`
      : "Recently added";

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer group">
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-between items-start">
          <div>
            <h4 className="font-bold text-foreground line-clamp-1">{title}</h4>
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
              <Building2 className="h-3 w-3" />
              <span>{company}</span>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(job)}>Edit Details</DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Move to...</DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => onMove(job, 'new')}>Wishlist</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onMove(job, 'applied')}>Applied</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onMove(job, 'interview')}>Interview</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onMove(job, 'offer')}>Offer</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onMove(job, 'rejected')}>Rejected</DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuItem className="text-destructive" onClick={() => onDelete(job.id)}>
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {displayDate}
          </div>
          {job.url ? (
            <a href={job.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs flex items-center gap-1">
              Link <ExternalLink className="h-3 w-3" />
            </a>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
});
