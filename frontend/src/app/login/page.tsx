"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import axios from "axios";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import AuthSplitLayout from "@/components/AuthSplitLayout";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await login(email, password);
      toast.success("Welcome back!");
    } catch (err) {
      const message =
        axios.isAxiosError(err) && err.response?.data?.detail
          ? err.response.data.detail
          : "Something went wrong. Please try again.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthSplitLayout headline="Pick up your review streak right where you left off.">
      <h1 className="font-display text-2xl font-semibold mb-1">Welcome back</h1>
      <p className="text-sm text-ink/60 mb-7">Log in to continue reviewing.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="block text-sm font-medium text-ink/80 mb-1.5">Email</span>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/35 pointer-events-none">
              <Mail size={17} />
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="login-input"
            />
          </div>
        </label>

        <label className="block">
          <span className="block text-sm font-medium text-ink/80 mb-1.5">Password</span>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/35 pointer-events-none">
              <Lock size={17} />
            </span>
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="login-input pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink/70"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </label>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full mt-2 py-3 rounded-full bg-coral text-paper font-medium shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {isSubmitting ? "Logging in..." : "Log in"}
        </button>
      </form>

      <p className="text-center text-sm text-ink/60 mt-6">
        New here?{" "}
        <Link href="/signup" className="text-coral font-medium underline underline-offset-2">
          Create an account
        </Link>
      </p>

      <style jsx global>{`
        .login-input {
          width: 100%;
          padding: 0.7rem 1rem 0.7rem 2.5rem;
          border-radius: 0.9rem;
          border: 2px solid rgba(36, 31, 26, 0.12);
          background: #ffffff;
          font-size: 0.95rem;
          transition: border-color 0.15s;
        }
        .login-input:focus {
          outline: none;
          border-color: #ff6b5b;
        }
      `}</style>
    </AuthSplitLayout>
  );
}
