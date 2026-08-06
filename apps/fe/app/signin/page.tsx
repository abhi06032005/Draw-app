"use client";

import { BACKEND_URL } from "@/config";
import React, { useState, Suspense } from "react";
import axios from "axios";
import { useRouter, useSearchParams } from "next/navigation";
import Loader from "@/components/Loader";
import Link from "next/link";
import { Pencil, ArrowRight, Lock, Sparkles, CheckCircle2, ShieldCheck } from "lucide-react";

function SigninContent() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [clicked, setClicked] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
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
      const response = await axios.post(`${BACKEND_URL}/signin`, {
        username: username.trim(),
        password: password.trim(),
      });
      if (response.status === 201) {
        localStorage.setItem("Authorization", response.data.token);
        router.push("/dashboard");
      }
    } catch (e) {
      setClicked(false);
      setError("Invalid email or password. Please try again.");
    }
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
            Sketchflow
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
              {clicked ? "Signing in…" : "Sign In"} <ArrowRight size={18} strokeWidth={3} />
            </button>
          </div>

          <div className="mt-6 pt-4 border-t-2 border-[#17140d]/10 flex items-center justify-center gap-2 text-xs font-medium text-[#17140d]/60">
            <ShieldCheck size={14} className="text-[#12b3a4]" /> Secure & Encrypted Connection
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
