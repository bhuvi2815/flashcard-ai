// lib/api.ts
//
// WHAT THIS FILE DOES:
// Creates ONE shared axios instance that every page/component uses to
// talk to the FastAPI backend, instead of each component writing its
// own fetch() calls with the base URL and headers repeated everywhere.
//
// It also automatically attaches the JWT token (if the user is logged
// in) to every outgoing request, and automatically logs the user out
// if the backend ever responds with 401 Unauthorized (e.g. token expired).

import axios from "axios";

// NEXT_PUBLIC_ prefix is required for any env var that needs to be
// readable in the BROWSER (Next.js only exposes prefixed vars to
// client-side code, everything else stays server-only for security).
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: API_BASE_URL,
});

// ---- Request interceptor: attach the JWT token to every request ----
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ---- Response interceptor: handle expired/invalid sessions globally ----
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      // Token is invalid or expired -- clear it and bounce to login,
      // rather than leaving the user stuck on a broken page.
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);
