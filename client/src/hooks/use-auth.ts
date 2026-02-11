import { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useAuth() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  const syncUserMutation = useMutation({
    mutationFn: async (userData: { firebaseUid: string; email: string; name?: string }) => {
      const res = await fetch(api.users.sync.path, {
        method: api.users.sync.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });
      if (!res.ok) throw new Error("Failed to sync user");
      return api.users.sync.responses[200].parse(await res.json());
    },
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      // Clear data from previous session/user to prevent staleness
      if (!currentUser || currentUser.uid !== user?.uid) {
        queryClient.clear();
      }

      setUser(currentUser);
      setIsLoading(false);

      if (currentUser && currentUser.email) {
        // Sync user with backend
        try {
          await syncUserMutation.mutateAsync({
            firebaseUid: currentUser.uid,
            email: currentUser.email,
            name: currentUser.displayName || undefined,
          });
        } catch (error) {
          console.error("Failed to sync user with backend:", error);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  return { user, isLoading };
}
