"use client";

import { BACKEND_URL } from "@/config";
import React, { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import Loader from "@/components/Loader";
import Link from "next/link";
import { Pencil, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";

export default function Signup() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [clicked, setClicked] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSignup = async () => {
    setError("");
    if (!name.trim() || !username.trim() || !password.trim()) {
      setError("All fields are required.");
      return;
    }
    if (password.length < 5) {
      setError("Password must be at least 5 characters.");
      return;
    }
    setClicked(true);
    try {
      const response = await axios.post(`${BACKEND_URL}/signup`, {
        username,
        password,
        name,
      });
      if (response.status === 201) {
        router.push("/signin?success=1");
      }
    } catch (e) {
      setClicked(false);
      setError("Signup failed. Email may already be in use.");
    }
  };

  return (
    <div className="min-h-screen bg-[#f5efe2] text-[#17140d] flex items-center justify-center p-6 relative overflow-hidden select-none">
      
      {/* Background Animated Memphis Confetti */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
        <div className="absolute top-[8%] right-[6%] anim-drift">
          <svg width="44" height="44" viewBox="0 0 48 48" fill="none">
            <polygon points="24,4 44,42 4,42" fill="#12b3a4" stroke="#17140d" strokeWidth="3" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="absolute top-[18%] left-[6%] anim-spin">
          <svg width="56" height="56" viewBox="0 0 60 60" fill="none">
            <circle cx="30" cy="30" r="26" fill="#ffc531" stroke="#17140d" strokeWidth="3" strokeDasharray="4 4" />
          </svg>
        </div>
        <div className="absolute bottom-[10%] right-[8%] anim-bob">
          <svg width="50" height="30" viewBox="0 0 50 30" fill="none">
            <path d="M 5 25 A 20 20 0 0 1 45 25 Z" fill="#6b5be6" stroke="#17140d" strokeWidth="3" />
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

        {/* Memphis Signup Card */}
        <div className="memphis-card p-8 bg-white">
          <div className="mb-6 text-center">
            <h1 className="font-display font-black text-3xl text-[#17140d] mb-1">
              Create free account
            </h1>
            <p className="text-xs text-[#17140d]/70 font-medium">
              Already have an account?{" "}
              <Link href="/signin" className="text-[#6b5be6] font-bold hover:underline">
                Sign in
              </Link>
            </p>
          </div>

          <div className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#17140d] mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-4 py-3 rounded-xl border-[3px] border-[#17140d] text-sm font-medium bg-[#f5efe2]/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#12b3a4] transition-all"
                required
              />
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#17140d] mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl border-[3px] border-[#17140d] text-sm font-medium bg-[#f5efe2]/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#12b3a4] transition-all"
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
                  placeholder="Minimum 5 characters"
                  className="w-full px-4 py-3 pr-16 rounded-xl border-[3px] border-[#17140d] text-sm font-medium bg-[#f5efe2]/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#12b3a4] transition-all"
                  minLength={5}
                  required
                  onKeyDown={(e) => e.key === "Enter" && handleSignup()}
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
              onClick={handleSignup}
              disabled={clicked}
              className="memphis-btn bg-[#12b3a4] text-white font-black text-base w-full py-3.5 rounded-xl flex items-center justify-center gap-2 mt-2 disabled:opacity-60"
            >
              {clicked ? "Creating account…" : "Create Account"} <ArrowRight size={18} strokeWidth={3} />
            </button>
          </div>

          <div className="mt-6 pt-4 border-t-2 border-[#17140d]/10 flex items-center justify-center gap-2 text-xs font-medium text-[#17140d]/60">
            <Sparkles size={14} className="text-[#ffc531]" /> Instant Access · Free Forever
          </div>
        </div>

      </div>

      {clicked && <Loader />}
    </div>
  );
}
