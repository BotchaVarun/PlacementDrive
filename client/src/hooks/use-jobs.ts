import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { InsertJob } from "@shared/schema";
import { auth } from "@/lib/firebase";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

export function useJobs(limit?: number, summary: boolean = false) {
  const { user } = useAuth();
  return useQuery({
    queryKey: [api.jobs.list.path, limit, summary],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (limit) params.append("limit", limit.toString());
      if (summary) params.append("summary", "true");
      const url = `${api.jobs.list.path}${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await apiRequest("GET", url);
      return api.jobs.list.responses[200].parse(await res.json());
    },
    staleTime: 30000, // 30 seconds
    enabled: !!user,
  });
}

export function useCreateJob() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertJob) => {
      const res = await apiRequest("POST", api.jobs.create.path, data);
      return api.jobs.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.jobs.list.path] });
      toast({ title: "Job Added", description: "Job saved to your tracker." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}

export function useRecommendJobs() {
  return useMutation({
    mutationFn: async (data: { resumeId: number }) => {
      const res = await apiRequest("POST", api.jobs.recommend.path, data);
      return api.jobs.recommend.responses[200].parse(await res.json());
    },
  });
}

export function useUpdateJob() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertJob> }) => {
      const res = await apiRequest("PATCH", api.jobs.update.path.replace(":id", id), data);
      return api.jobs.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.jobs.list.path] });
      toast({ title: "Job Updated", description: "Job details have been updated." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}

export function useDeleteJob() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", api.jobs.delete.path.replace(":id", id));
      return api.jobs.delete.responses[200].parse(await res.json());
    },
    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: [api.jobs.list.path] });

      // Snapshot previous value
      const previousJobs = queryClient.getQueryData([api.jobs.list.path]);

      // Optimistically update to new value
      queryClient.setQueryData([api.jobs.list.path], (old: any) =>
        old?.filter((job: any) => job.id !== id)
      );

      return { previousJobs };
    },
    onError: (err: any, id: any, context: any) => {
      // Rollback on error
      if (context?.previousJobs) {
        queryClient.setQueryData([api.jobs.list.path], context.previousJobs);
      }
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: [api.jobs.list.path] });
    },
    onSuccess: () => {
      toast({ title: "Job Deleted", description: "Job removed from your tracker." });
    },
  });
}
