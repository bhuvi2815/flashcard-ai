"use client";

// components/ProtectedRoute.tsx
//
// WHAT THIS FILE DOES:
// Wraps any page that REQUIRES login (dashboard, review pages, etc.).
// If the auth check finishes and there's no user, it redirects to /login
// instead of letting the page render with missing data.
//
// JAVA ANALOGY: like a route guard / interceptor on the frontend side,
// mirroring what get_current_user does on the backend -- except this
// one is just for UX (redirecting nicely); the REAL security check
// always happens on the backend regardless of what the frontend does.

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <div className="animate-spin h-10 w-10 rounded-full border-4 border-coral border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    // Briefly renders nothing while the redirect above kicks in.
    return null;
  }

  return <>{children}</>;
}
