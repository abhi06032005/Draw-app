"use client";

import { useRouter } from "next/navigation";

export default function CreatePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen animated-bg flex flex-col items-center justify-center px-4 py-12">
      {/* Blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="mesh-blob" style={{ width: 500, height: 500, background: "radial-gradient(circle, #7c3aed 0%, transparent 70%)", top: "-150px", left: "-150px" }} />
        <div className="mesh-blob" style={{ width: 400, height: 400, background: "radial-gradient(circle, #0891b2 0%, transparent 70%)", bottom: "-100px", right: "-100px", animationDelay: "-8s", opacity: 0.1 }} />
      </div>

      <div className="relative z-10 text-center max-w-xl w-full">
        {/* Logo */}
        <button
          onClick={() => router.push("/dashboard")}
          className="inline-flex items-center gap-2 mb-10 text-white/40 hover:text-white/70 transition-colors text-sm"
        >
          <span>←</span> Back to dashboard
        </button>

        <div className="text-5xl mb-5 float">🎨</div>
        <h1 className="text-4xl sm:text-5xl font-black text-white mb-4">
          Start <span className="gradient-text">Collaborating</span>
        </h1>
        <p className="text-white/40 text-lg mb-10 leading-relaxed">
          Create a new canvas room or jump into an existing one with a room ID.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Create */}
          <button
            onClick={() => router.push("/createroom")}
            className="feature-card glass-card rounded-2xl border border-white/7 p-7 text-left group"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/30 to-indigo-500/20 flex items-center justify-center text-3xl mb-5 float border border-violet-500/20">
              ➕
            </div>
            <h3 className="font-black text-white text-xl mb-2">Create New Room</h3>
            <p className="text-white/40 text-sm leading-relaxed">
              Set up a fresh canvas with a unique room ID. Invite anyone to join instantly.
            </p>
            <div className="mt-5 inline-flex items-center gap-1.5 text-violet-400 font-bold text-sm">
              Create room <span className="group-hover:translate-x-1 transition-transform inline-block">→</span>
            </div>
          </button>

          {/* Join */}
          <button
            onClick={() => router.push("/joinroom")}
            className="feature-card glass-card rounded-2xl border border-white/7 p-7 text-left group"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500/30 to-blue-500/20 flex items-center justify-center text-3xl mb-5 float border border-sky-500/20" style={{ animationDelay: "1.5s" }}>
              🚪
            </div>
            <h3 className="font-black text-white text-xl mb-2">Join Existing Room</h3>
            <p className="text-white/40 text-sm leading-relaxed">
              Have a room ID? Enter it to join your team's collaborative canvas.
            </p>
            <div className="mt-5 inline-flex items-center gap-1.5 text-sky-400 font-bold text-sm">
              Enter room ID <span className="group-hover:translate-x-1 transition-transform inline-block">→</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
