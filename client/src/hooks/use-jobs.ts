import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { InsertJob } from "@shared/schema";
import { auth } from "@/lib/firebase";

export function useJobs() {
  return useQuery({
    queryKey: [api.jobs.list.path],
    queryFn: async () => {
      const token = await auth.currentUser?.getIdToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(api.jobs.list.path, { headers });
      if (!res.ok) throw new Error("Failed to fetch jobs");
      return api.jobs.list.responses[200].parse(await res.json());
    },
    enabled: !!auth.currentUser, // Only fetch when logged in
  });
}

export function useCreateJob() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertJob) => {
      const token = await auth.currentUser?.getIdToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(api.jobs.create.path, {
        method: api.jobs.create.method,
        headers,
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create job");
      return api.jobs.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.jobs.list.path] });
      toast({ title: "Job Added", description: "Job saved to your tracker." });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}

export function useRecommendJobs() {
  return useMutation({
    mutationFn: async (data: { resumeId: number }) => {
      const token = await auth.currentUser?.getIdToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(api.jobs.recommend.path, {
        method: api.jobs.recommend.method,
        headers,
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to fetch recommendations");
      return api.jobs.recommend.responses[200].parse(await res.json());
    },
  });
}

export function useUpdateJob() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertJob> }) => {
      const res = await fetch(api.jobs.update.path.replace(":id", id), {
        method: api.jobs.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update job");
      return api.jobs.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.jobs.list.path] });
      toast({ title: "Job Updated", description: "Job details have been updated." });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}

export function useDeleteJob() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const token = await auth.currentUser?.getIdToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(api.jobs.delete.path.replace(":id", id), {
        method: api.jobs.delete.method,
        headers,
      });
      if (!res.ok) throw new Error("Failed to delete job");
      return api.jobs.delete.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.jobs.list.path] });
      toast({ title: "Job Deleted", description: "Job removed from your tracker." });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}
