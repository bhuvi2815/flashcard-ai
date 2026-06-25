"use client";

// components/Navbar.tsx
//
// Shared top navigation across all logged-in pages. Shows the app
// logo on the left, and the user's name + a logout button on the right.

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import Logo from "./Logo";

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="sticky top-0 z-30 bg-paper/90 backdrop-blur-sm border-b-2 border-ink/10">
      <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <Logo size={30} />
          <span className="font-display text-2xl font-semibold tracking-tight">
            Recall
          </span>
        </Link>

        {user && (
          <div className="flex items-center gap-4">
            <span className="hidden sm:block text-sm text-ink/60">
              Hey, <span className="font-medium text-ink">{user.name.split(" ")[0]}</span>
            </span>
            <button
              onClick={logout}
              className="text-sm font-medium px-4 py-2 rounded-full border-2 border-ink/15 hover:border-coral hover:text-coral transition-colors"
            >
              Log out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
