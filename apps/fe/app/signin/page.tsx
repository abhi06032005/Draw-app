"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Loader from "@/components/Loader";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { BACKEND_URL } from "@/config";
import axios from "axios";
import { getLocalAuthToken, setLocalAuthToken } from "@/lib/auth";
import { Pencil, Sparkles, ShieldCheck, Mail, Lock, User as UserIcon, ArrowRight } from "lucide-react";

function SigninContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  const initialMode = searchParams.get("mode") === "signup" ? "signup" : "signin";
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(searchParams.get("error"));

  // If already authenticated, redirect to /dashboard immediately
  useEffect(() => {
    if (status === "authenticated" || Boolean(getLocalAuthToken())) {
      router.replace("/dashboard");
    }
  }, [status, router]);

  const handleGoogleSignIn = () => {
    setGoogleLoading(true);
    signIn("google", { callbackUrl: "/dashboard" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      setError("Please fill in both email and password.");
      return;
    }

    if (cleanPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      if (mode === "signup") {
        const cleanName = name.trim() || cleanEmail.split("@")[0];
        // 1. Create account on backend
        await axios.post(`${BACKEND_URL}/signup`, {
          username: cleanEmail,
          password: cleanPassword,
          name: cleanName,
        });

        // 2. Sign in with NextAuth Credentials
        const res = await signIn("credentials", {
          email: cleanEmail,
          password: cleanPassword,
          redirect: false,
        });

        if (res?.error) {
          setError(res.error);
          setLoading(false);
          return;
        }

        // 3. Fallback direct backend signin to cache token immediately
        try {
          const loginRes = await axios.post(`${BACKEND_URL}/signin`, {
            username: cleanEmail,
            password: cleanPassword,
          });
          if (loginRes.data?.token) {
            setLocalAuthToken(loginRes.data.token);
          }
        } catch {}

        router.replace("/dashboard");
      } else {
        // Sign In Flow
        const res = await signIn("credentials", {
          email: cleanEmail,
          password: cleanPassword,
          redirect: false,
        });

        if (res?.error) {
          setError("Invalid email or password. Please try again.");
          setLoading(false);
          return;
        }

        // Cache token directly from backend to avoid any session delay
        try {
          const loginRes = await axios.post(`${BACKEND_URL}/signin`, {
            username: cleanEmail,
            password: cleanPassword,
          });
          if (loginRes.data?.token) {
            setLocalAuthToken(loginRes.data.token);
          }
        } catch {}

        router.replace("/dashboard");
      }
    } catch (err: any) {
      setLoading(false);
      const msg = err.response?.data?.message || err.message || "Authentication failed";
      setError(msg);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5efe2] text-[#17140d] flex items-center justify-center p-6 relative overflow-hidden select-none">
      {/* Background Animated Memphis Confetti */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
        <div className="absolute top-[10%] left-[5%] anim-drift">
          <svg width="44" height="44" viewBox="0 0 48 48" fill="none">
            <polygon
              points="24,4 44,42 4,42"
              fill="#ff5b57"
              stroke="#17140d"
              strokeWidth="3"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="absolute top-[15%] right-[8%] anim-spin">
          <svg width="56" height="56" viewBox="0 0 60 60" fill="none">
            <circle
              cx="30"
              cy="30"
              r="26"
              fill="#ffc531"
              stroke="#17140d"
              strokeWidth="3"
              strokeDasharray="4 4"
            />
          </svg>
        </div>
        <div className="absolute bottom-[12%] left-[8%] anim-bob">
          <svg width="50" height="30" viewBox="0 0 50 30" fill="none">
            <path
              d="M 5 25 A 20 20 0 0 1 45 25 Z"
              fill="#12b3a4"
              stroke="#17140d"
              strokeWidth="3"
            />
          </svg>
        </div>
        <div className="absolute bottom-[15%] right-[10%] anim-sway">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <rect
              x="6"
              y="6"
              width="28"
              height="28"
              fill="#6b5be6"
              stroke="#17140d"
              strokeWidth="3"
            />
          </svg>
        </div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center justify-center gap-3 mb-6">
          <div className="w-11 h-11 bg-[#ffc531] rounded-xl border-[3px] border-[#17140d] memphis-shadow-sm flex items-center justify-center">
            <Pencil size={22} strokeWidth={2.5} className="text-[#17140d]" />
          </div>
          <span className="font-display font-black text-3xl tracking-tight text-[#17140d]">
            Sketio
          </span>
        </Link>

        {/* Memphis Auth Card */}
        <div className="memphis-card p-7 bg-white text-center">
          <div className="mb-5">
            <div className="w-11 h-11 bg-[#ff5b57]/15 border-2 border-[#17140d] rounded-2xl mx-auto flex items-center justify-center mb-2.5">
              <Sparkles size={20} className="text-[#ff5b57]" />
            </div>
            <h1 className="font-display font-black text-2xl text-[#17140d] mb-1">
              {mode === "signin" ? "Welcome Back!" : "Create an Account"}
            </h1>
            <p className="text-xs text-[#17140d]/70 font-medium max-w-xs mx-auto">
              Real-time collaborative whiteboard & AI architecture generator.
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 bg-[#f5efe2] border-2 border-[#17140d] rounded-xl mb-5">
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setError(null);
              }}
              className={`py-2 text-xs font-black rounded-lg transition-all cursor-pointer ${
                mode === "signin"
                  ? "bg-white text-[#17140d] border border-[#17140d] shadow-sm"
                  : "text-[#17140d]/60 hover:text-[#17140d]"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setError(null);
              }}
              className={`py-2 text-xs font-black rounded-lg transition-all cursor-pointer ${
                mode === "signup"
                  ? "bg-white text-[#17140d] border border-[#17140d] shadow-sm"
                  : "text-[#17140d]/60 hover:text-[#17140d]"
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Error Notice */}
          {error && (
            <div className="bg-[#ff5b57]/15 border-2 border-[#17140d] rounded-xl px-4 py-2.5 text-xs font-bold text-[#ff5b57] mb-4 text-left">
              {error}
            </div>
          )}

          {/* Primary Google Sign-In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
            className="w-full py-3 px-4 rounded-xl border-[2.5px] border-[#17140d] bg-white font-black text-sm text-[#17140d] hover:bg-[#f5efe2] transition-all flex items-center justify-center gap-2.5 memphis-btn disabled:opacity-60 mb-4 cursor-pointer"
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
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
            {googleLoading ? "Connecting to Google…" : "Continue with Google"}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-[2px] bg-[#17140d]/15" />
            <span className="text-[11px] font-black uppercase text-[#17140d]/40 tracking-wider">
              Or with email
            </span>
            <div className="flex-1 h-[2px] bg-[#17140d]/15" />
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleSubmit} className="space-y-3 text-left">
            {mode === "signup" && (
              <div>
                <label className="block text-xs font-black text-[#17140d] mb-1">
                  Name
                </label>
                <div className="relative">
                  <UserIcon
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#17140d]/40"
                  />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Morgan"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-[#17140d] text-xs font-bold text-[#17140d] placeholder-[#17140d]/40 focus:outline-none focus:ring-2 focus:ring-[#6b5be6] bg-white"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-black text-[#17140d] mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#17140d]/40"
                />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-[#17140d] text-xs font-bold text-[#17140d] placeholder-[#17140d]/40 focus:outline-none focus:ring-2 focus:ring-[#6b5be6] bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-[#17140d] mb-1">
                Password
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#17140d]/40"
                />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-[#17140d] text-xs font-bold text-[#17140d] placeholder-[#17140d]/40 focus:outline-none focus:ring-2 focus:ring-[#6b5be6] bg-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full mt-2 py-3.5 px-4 rounded-xl border-[2.5px] border-[#17140d] bg-[#6b5be6] text-white font-black text-sm hover:bg-[#5b4bd6] transition-all flex items-center justify-center gap-2 memphis-btn disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                "Please wait…"
              ) : mode === "signin" ? (
                <>
                  Sign In <ArrowRight size={15} />
                </>
              ) : (
                <>
                  Create Account <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          {/* Trust Badge */}
          <div className="pt-4 mt-5 border-t-2 border-[#17140d]/10 flex items-center justify-center gap-2 text-[11px] font-bold text-[#17140d]/60">
            <ShieldCheck size={14} className="text-[#12b3a4]" /> Fast, encrypted JWT session authentication
          </div>
        </div>
      </div>

      {(googleLoading || loading) && <Loader />}
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
