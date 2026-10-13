"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Loader from "@/components/Loader";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Pencil, Sparkles, ShieldCheck, Zap, Users } from "lucide-react";

function SigninContent() {
  const [clicked, setClicked] = useState(false);
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");

  const handleGoogleSignIn = () => {
    setClicked(true);
    signIn("google", { callbackUrl: "/dashboard" });
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
        <Link href="/" className="flex items-center justify-center gap-3 mb-8">
          <div className="w-11 h-11 bg-[#ffc531] rounded-xl border-[3px] border-[#17140d] memphis-shadow-sm flex items-center justify-center">
            <Pencil size={22} strokeWidth={2.5} className="text-[#17140d]" />
          </div>
          <span className="font-display font-black text-3xl tracking-tight text-[#17140d]">
            Sketio
          </span>
        </Link>

        {/* Memphis Google Auth Card */}
        <div className="memphis-card p-8 bg-white text-center">
          <div className="mb-6">
            <div className="w-12 h-12 bg-[#ff5b57]/15 border-2 border-[#17140d] rounded-2xl mx-auto flex items-center justify-center mb-3">
              <Sparkles size={22} className="text-[#ff5b57]" />
            </div>
            <h1 className="font-display font-black text-3xl text-[#17140d] mb-2">
              Welcome to Sketio
            </h1>
            <p className="text-xs text-[#17140d]/70 font-medium max-w-xs mx-auto">
              Real-time AI collaborative whiteboard. Sign in with your Google account to get started in seconds.
            </p>
          </div>

          {/* Error Notice */}
          {errorParam && (
            <div className="bg-[#ff5b57]/15 border-2 border-[#17140d] rounded-xl px-4 py-3 text-xs font-bold text-[#ff5b57] mb-5 text-left">
              Authentication failed. Please verify your Google account or try again.
            </div>
          )}

          {/* Primary Google Sign-In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={clicked}
            className="w-full py-4 px-5 rounded-2xl border-[3px] border-[#17140d] bg-white font-black text-base text-[#17140d] hover:bg-[#f5efe2] transition-all flex items-center justify-center gap-3 memphis-btn disabled:opacity-60 mb-6 cursor-pointer"
          >
            <svg width="22" height="22" viewBox="0 0 24 24">
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
            {clicked ? "Connecting to Google…" : "Continue with Google"}
          </button>

          {/* Features Checklist */}
          <div className="bg-[#f5efe2]/60 border-2 border-[#17140d]/10 rounded-xl p-4 text-left space-y-2.5 mb-6">
            <div className="flex items-center gap-2.5 text-xs font-bold text-[#17140d]">
              <div className="w-5 h-5 rounded-md bg-[#12b3a4] text-white flex items-center justify-center text-[10px]">
                ✓
              </div>
              <span>Infinite canvas with real-time multiplayer</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs font-bold text-[#17140d]">
              <div className="w-5 h-5 rounded-md bg-[#ffc531] text-[#17140d] flex items-center justify-center text-[10px]">
                ✓
              </div>
              <span>AI Diagram & System Architecture Generator</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs font-bold text-[#17140d]">
              <div className="w-5 h-5 rounded-md bg-[#6b5be6] text-white flex items-center justify-center text-[10px]">
                ✓
              </div>
              <span>End-to-end encrypted room sessions</span>
            </div>
          </div>

          <div className="pt-4 border-t-2 border-[#17140d]/10 flex items-center justify-center gap-2 text-xs font-medium text-[#17140d]/60">
            <ShieldCheck size={14} className="text-[#12b3a4]" /> Secured by Google Identity Services
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
