import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";

export function useResumes() {
  return useQuery({
    queryKey: [api.resumes.list.path],
    queryFn: async () => {
      const token = await auth.currentUser?.getIdToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(api.resumes.list.path, { headers });
      if (!res.ok) throw new Error("Failed to fetch resumes");
      return api.resumes.list.responses[200].parse(await res.json());
    },
    enabled: !!auth.currentUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useResume(id: string) {
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
    enabled: !!id,
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
    mutationFn: async (data: { resumeId: string; jobDescription: string }) => {
      const token = await auth.currentUser?.getIdToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(api.resumes.analyze.path, {
        method: api.resumes.analyze.method,
        headers,
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Analysis failed");
      return api.resumes.analyze.responses[200].parse(await res.json());
    },
    onError: (err) => {
      toast({ title: "Analysis Failed", description: err.message, variant: "destructive" });
    },
  });
}
