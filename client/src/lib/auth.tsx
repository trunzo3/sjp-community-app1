import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "./queryClient";

type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "client" | "alumni" | "staff" | "admin";
  stage: "client" | "alumni";
  graduationDate: string | null;
  bio: string | null;
  avatarColor: string;
  createdAt: string;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  demoLogin: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  refetchUser: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { data: user, isLoading, refetch } = useQuery<User | null>({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const login = useCallback(async (email: string, password: string) => {
    await apiRequest("POST", "/api/auth/login", { email, password });
    await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
  }, [queryClient]);

  const demoLogin = useCallback(async (email: string) => {
    await apiRequest("POST", "/api/auth/demo-login", { email });
    await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
  }, [queryClient]);

  const logout = useCallback(async () => {
    await apiRequest("POST", "/api/auth/logout");
    queryClient.setQueryData(["/api/auth/me"], null);
    queryClient.clear();
  }, [queryClient]);

  return (
    <AuthContext.Provider value={{ user: user ?? null, isLoading, login, demoLogin, logout, refetchUser: refetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
