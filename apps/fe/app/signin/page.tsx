"use client";

import { BACKEND_URL } from "@/config";
import React, { useState, Suspense } from "react";
import axios from "axios";
import { useRouter, useSearchParams } from "next/navigation";
import Loader from "@/components/Loader";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Pencil, ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";

function SigninContent() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [clicked, setClicked] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const searchParams = useSearchParams();
  const success = searchParams.get("success");

  const handleSignin = async () => {
    setError("");
    if (!username.trim() || !password.trim()) {
      setError("Email and password are required.");
      return;
    }
    setClicked(true);

    try {
      // 1. NextAuth Credentials login
      const nextAuthRes = await signIn("credentials", {
        redirect: false,
        username: username.trim(),
        password: password.trim(),
      });

      // 2. Fetch JWT token from backend for local API & WS calls
      try {
        const response = await axios.post(`${BACKEND_URL}/signin`, {
          username: username.trim(),
          password: password.trim(),
        });
        if (response.status === 200 && response.data.token) {
          localStorage.setItem("Authorization", response.data.token);
        }
      } catch (err) {
        // If standalone or offline, fall back to NextAuth session
      }

      if (nextAuthRes?.error) {
        setClicked(false);
        setError(nextAuthRes.error || "Invalid email or password. Please try again.");
      } else {
        router.push("/dashboard");
      }
    } catch (e: any) {
      setClicked(false);
      setError("Invalid email or password. Please try again.");
    }
  };

  const handleOAuthSignIn = (provider: string) => {
    setClicked(true);
    signIn(provider, { callbackUrl: "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-[#f5efe2] text-[#17140d] flex items-center justify-center p-6 relative overflow-hidden select-none">
      {/* Background Animated Memphis Confetti */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
        <div className="absolute top-[10%] left-[5%] anim-drift">
          <svg width="44" height="44" viewBox="0 0 48 48" fill="none">
            <polygon points="24,4 44,42 4,42" fill="#ff5b57" stroke="#17140d" strokeWidth="3" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="absolute top-[15%] right-[8%] anim-spin">
          <svg width="56" height="56" viewBox="0 0 60 60" fill="none">
            <circle cx="30" cy="30" r="26" fill="#ffc531" stroke="#17140d" strokeWidth="3" strokeDasharray="4 4" />
          </svg>
        </div>
        <div className="absolute bottom-[12%] left-[8%] anim-bob">
          <svg width="50" height="30" viewBox="0 0 50 30" fill="none">
            <path d="M 5 25 A 20 20 0 0 1 45 25 Z" fill="#12b3a4" stroke="#17140d" strokeWidth="3" />
          </svg>
        </div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 bg-[#ffc531] rounded-xl border-[3px] border-[#17140d] memphis-shadow-sm flex items-center justify-center">
            <Pencil size={20} strokeWidth={2.5} className="text-[#17140d]" />
          </div>
          <span className="font-display font-extrabold text-2xl tracking-tight text-[#17140d]">
            Sketio
          </span>
        </Link>

        {/* Memphis Signin Card */}
        <div className="memphis-card p-8 bg-white">
          <div className="mb-6 text-center">
            <h1 className="font-display font-black text-3xl text-[#17140d] mb-1">
              Welcome back
            </h1>
            <p className="text-xs text-[#17140d]/70 font-medium">
              Don't have an account?{" "}
              <Link href="/signup" className="text-[#6b5be6] font-bold hover:underline">
                Sign up free
              </Link>
            </p>
          </div>

          {/* Account created success alert */}
          {success && (
            <div className="flex items-center gap-2 bg-[#12b3a4]/15 border-2 border-[#17140d] rounded-xl px-4 py-3 mb-5 text-xs font-bold text-[#17140d]">
              <CheckCircle2 size={16} className="text-[#12b3a4]" /> Account created! Sign in to continue.
            </div>
          )}

          {/* Social OAuth Providers */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <button
              type="button"
              onClick={() => handleOAuthSignIn("google")}
              className="py-2.5 px-3 rounded-xl border-2 border-[#17140d] bg-white font-bold text-xs text-[#17140d] hover:bg-[#f5efe2] transition-colors flex items-center justify-center gap-2 memphis-shadow-sm"
            >
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.43 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.16 0 9.98 0 12s.45 3.84 1.24 5.42l4.04-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.57 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              Google
            </button>

            <button
              type="button"
              onClick={() => handleOAuthSignIn("github")}
              className="py-2.5 px-3 rounded-xl border-2 border-[#17140d] bg-[#17140d] font-bold text-xs text-white hover:bg-[#2b271d] transition-colors flex items-center justify-center gap-2 memphis-shadow-sm"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                />
              </svg>
              GitHub
            </button>
          </div>

          <div className="relative flex items-center justify-center my-4">
            <div className="border-t border-[#17140d]/15 w-full" />
            <span className="bg-white px-3 text-[11px] font-bold uppercase tracking-wider text-[#17140d]/50 absolute">
              or with email
            </span>
          </div>

          <div className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#17140d] mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl border-[3px] border-[#17140d] text-sm font-medium bg-[#f5efe2]/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6b5be6] transition-all"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#17140d] mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-16 rounded-xl border-[3px] border-[#17140d] text-sm font-medium bg-[#f5efe2]/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6b5be6] transition-all"
                  required
                  onKeyDown={(e) => e.key === "Enter" && handleSignin()}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#17140d]/60 hover:text-[#17140d]"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Error notice */}
            {error && (
              <div className="bg-[#ff5b57]/15 border-2 border-[#17140d] rounded-xl px-4 py-2.5 text-xs font-bold text-[#ff5b57]">
                {error}
              </div>
            )}

            {/* Submit button */}
            <button
              onClick={handleSignin}
              disabled={clicked}
              className="memphis-btn bg-[#ff5b57] text-white font-black text-base w-full py-3.5 rounded-xl flex items-center justify-center gap-2 mt-2 disabled:opacity-60"
            >
              {clicked ? "Signing in…" : "Sign In with NextAuth"} <ArrowRight size={18} strokeWidth={3} />
            </button>
          </div>

          <div className="mt-6 pt-4 border-t-2 border-[#17140d]/10 flex items-center justify-center gap-2 text-xs font-medium text-[#17140d]/60">
            <ShieldCheck size={14} className="text-[#12b3a4]" /> Secure NextAuth & Encrypted Connection
          </div>
        </div>
      </div>

      {clicked && <Loader />}
    </div>
  );
}

export default function Signin() {
  return (
    <Suspense>
      <SigninContent />
    </Suspense>
  );
}
