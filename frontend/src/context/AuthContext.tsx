"use client";

// context/AuthContext.tsx
//
// WHAT THIS FILE DOES:
// Provides a single source of truth for "who is logged in right now"
// across the WHOLE app, using React Context -- so any component can
// call `useAuth()` to read the current user or trigger login/logout,
// instead of passing user data down through props manually at every level.
//
// JAVA/SPRING ANALOGY:
// Think of this like a `SecurityContextHolder` -- a globally accessible
// place to ask "who is the current authenticated principal?", except
// scoped to the React component tree instead of a thread.

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { User } from "@/types";

interface AuthContextType {
  user: User | null;
  isLoading: boolean; // true while we check localStorage on first page load
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // On first mount, check if a user/token were already saved in
  // localStorage from a previous session, and restore them -- this is
  // what makes the user stay "logged in" after refreshing the page.
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("access_token");
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  async function login(email: string, password: string) {
    const response = await api.post("/auth/login", { email, password });
    const { access_token, user: loggedInUser } = response.data;

    localStorage.setItem("access_token", access_token);
    localStorage.setItem("user", JSON.stringify(loggedInUser));
    setUser(loggedInUser);

    router.push("/dashboard");
  }

  async function signup(name: string, email: string, password: string) {
    // Signup only CREATES the account on the backend -- it doesn't log
    // the user in automatically (the backend's /auth/signup route
    // intentionally doesn't return a token, only the new user's public
    // info). So right after signup, we immediately call login() with
    // the same credentials to get a token and complete the flow in
    // one smooth step for the user.
    await api.post("/auth/signup", { name, email, password });
    await login(email, password);
  }

  function logout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    setUser(null);
    router.push("/login");
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook -- lets any component just write:
//   const { user, logout } = useAuth();
// instead of importing useContext + AuthContext every time.
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
