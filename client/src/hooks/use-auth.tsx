import { createContext, ReactNode, useContext } from "react";
import { useQuery, useMutation, UseMutationResult } from "@tanstack/react-query";
import { queryClient, apiRequest } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type User = {
  id: string | number;
  email: string;
  tier?: string;
  membership_tier?: string;
  is_premium?: boolean;
  isAdmin?: boolean;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<User, Error, any>;
  logoutMutation: UseMutationResult<void, Error, void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();

  // 1. Check current session status
  const { data: user, error, isLoading } = useQuery<User | null, Error>({
    queryKey: ["/api/user"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/user");
        return await res.json();
      } catch (e) {
        return null;
      }
    },
    retry: false,
  });

  // 2. Login Logic
  const loginMutation = useMutation({
    mutationFn: async (credentials: any) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({ title: "Welcome Back", description: `Accessing Sentinel Command Center...` });
    },
    onError: (error: Error) => {
      toast({ title: "Login Failed", description: error.message, variant: "destructive" });
    },
  });

  // 3. Logout Logic
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      window.location.href = "/auth";
    },
  });

  return (
    <AuthContext.Provider value={{ user: user ?? null, isLoading, error, loginMutation, logoutMutation }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
