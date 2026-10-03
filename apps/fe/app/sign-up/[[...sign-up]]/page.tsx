import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";

export default function SignUpPage() {
  const isKeyConfigured =
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("placeholder");

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-violet-600/10 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 w-full max-w-md flex flex-col items-center">
        {/* Top Logo / Back Link */}
        <div className="w-full flex items-center justify-between mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-medium text-neutral-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={14} /> Back to Home
          </Link>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-violet-600 rounded-lg flex items-center justify-center">
              <Sparkles size={14} className="text-white" />
            </div>
            <span className="font-bold text-sm tracking-tight text-white">
              Sketio
            </span>
          </div>
        </div>

        {!isKeyConfigured ? (
          <div className="w-full bg-neutral-900/80 border border-neutral-800 backdrop-blur-xl rounded-2xl p-7 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-2xl mx-auto">
              🚀
            </div>
            <h2 className="font-bold text-lg text-white">Create an Account</h2>
            <p className="text-xs text-neutral-400 leading-relaxed font-normal">
              Clerk authentication is fully integrated. To enable registration with Google, GitHub, or Email, add your Clerk Publishable Key in:
            </p>
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-left font-mono text-[11px] text-neutral-300 space-y-1">
              <div className="font-semibold text-violet-400">apps/fe/.env.local</div>
              <div>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...</div>
              <div>CLERK_SECRET_KEY=sk_test_...</div>
            </div>
            <p className="text-[11px] text-neutral-500">
              Get free keys at{" "}
              <a
                href="https://dashboard.clerk.com"
                target="_blank"
                rel="noreferrer"
                className="text-violet-400 hover:underline font-semibold"
              >
                dashboard.clerk.com
              </a>
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center w-full py-2.5 px-4 bg-violet-600 hover:bg-violet-500 rounded-xl font-semibold text-xs text-white transition-all shadow-md shadow-violet-600/20"
            >
              Continue to Dashboard Demo →
            </Link>
          </div>
        ) : (
          <SignUp
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "border border-neutral-800 rounded-2xl bg-neutral-900/90 text-white shadow-2xl",
              },
            }}
          />
        )}
      </div>
    </div>
  );
}
