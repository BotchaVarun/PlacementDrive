import * as z from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { Resume } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";

export function useResumes(limit?: number, summary: boolean = false) {
  const { user } = useAuth();
  return useQuery({
    queryKey: [api.resumes.list.path, limit, summary],
    queryFn: async () => {
      const token = await auth.currentUser?.getIdToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const params = new URLSearchParams();
      if (limit) params.append("limit", limit.toString());
      if (summary) params.append("summary", "true");
      const url = `${api.resumes.list.path}${params.toString() ? `?${params.toString()}` : ""}`;

      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error("Failed to fetch resumes");
      return api.resumes.list.responses[200].parse(await res.json());
    },
    enabled: !!user,
    staleTime: 30000,
  });
}

export type DashboardStats = z.infer<typeof api.dashboard.stats.responses[200]>;

export function useDashboardStats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [api.dashboard.stats.path],
    queryFn: async () => {
      const token = await auth.currentUser?.getIdToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(api.dashboard.stats.path, { headers });
      if (!res.ok) throw new Error("Failed to fetch dashboard stats");
      const data = await res.json();
      return api.dashboard.stats.responses[200].parse(data);
    },
    enabled: !!user,
    staleTime: 30000,
  });
}

export function useResume(id: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: [api.resumes.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.resumes.get.path, { id });
      // We didn't enforce auth on GET /:id yet, but good practice to send token if we have it
      const token = await auth.currentUser?.getIdToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(url, { headers });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch resume");
      return api.resumes.get.responses[200].parse(await res.json());
    },
    enabled: !!id && !!user,
  });
}

export function useCreateResume() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { title: string; content: string }) => {
      const token = await auth.currentUser?.getIdToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(api.resumes.create.path, {
        method: api.resumes.create.method,
        headers,
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        if (res.status === 400) {
          const error = api.resumes.create.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to create resume");
      }
      return api.resumes.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.resumes.list.path] });
      toast({ title: "Resume Created", description: "Resume saved successfully." });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}

export function useAnalyzeResume() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { resumeId?: string; resumeContent?: string; jobDescription: string }) => {
      const token = await auth.currentUser?.getIdToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(api.resumes.analyze.path, {
        method: api.resumes.analyze.method,
        headers,
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Analysis failed");
      return await res.json(); // Use raw json because shared schema might not be updated here yet or is too strict
    },
    onError: (err) => {
      toast({ title: "Analysis Failed", description: err.message, variant: "destructive" });
    },
  });
}
