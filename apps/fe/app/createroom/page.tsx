"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { BACKEND_URL } from "@/config";
import Link from "next/link";
import { Pencil, Plus, ArrowLeft, ArrowRight, Sparkles } from "lucide-react";

export default function CreateRoom() {
  const [loading, setLoading] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("Authorization");
    if (!token) {
      router.push("/signin");
    }
  }, [router]);

  const handleCreate = async () => {
    const trimmedId = roomId.trim();
    if (!trimmedId) {
      setError("Please enter a room name.");
      return;
    }
    if (trimmedId.length < 3) {
      setError("Room name must be at least 3 characters.");
      return;
    }
    setError("");
    setLoading(true);

    const token = localStorage.getItem("Authorization");
    try {
      const response = await axios.post(
        `${BACKEND_URL}/room`,
        { name: trimmedId },
        { headers: { authorization: `Bearer ${token}` } }
      );
      if (response.status === 201) {
        router.push("/joinroom");
      }
    } catch (e: any) {
      setLoading(false);
      if (e.response?.status === 409) {
        setError("A room with this name already exists. Try a different name.");
      } else {
        setError("Failed to create room. Please try again.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#f5efe2] text-[#17140d] flex flex-col items-center justify-center p-6 relative overflow-hidden select-none">
      
      {/* Background Animated Memphis Confetti */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
        <div className="absolute top-[10%] left-[5%] anim-drift">
          <svg width="44" height="44" viewBox="0 0 48 48" fill="none">
            <polygon points="24,4 44,42 4,42" fill="#6b5be6" stroke="#17140d" strokeWidth="3" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="absolute bottom-[12%] right-[8%] anim-spin">
          <svg width="56" height="56" viewBox="0 0 60 60" fill="none">
            <circle cx="30" cy="30" r="26" fill="#ffc531" stroke="#17140d" strokeWidth="3" strokeDasharray="4 4" />
          </svg>
        </div>
      </div>

      <div className="w-full max-w-md relative z-10">
        
        {/* Back Link */}
        <button
          onClick={() => router.push("/dashboard")}
          className="inline-flex items-center gap-2 mb-6 font-bold text-xs text-[#17140d]/70 hover:text-[#17140d] transition-colors"
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </button>

        {/* Memphis Card */}
        <div className="memphis-card p-8 bg-white text-left">
          
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-[#6b5be6] border-[3px] border-[#17140d] memphis-shadow-sm rounded-2xl flex items-center justify-center text-white mx-auto mb-3">
              <Plus size={28} strokeWidth={3} />
            </div>
            <h1 className="font-display font-black text-3xl text-[#17140d] mb-1">
              Create Room
            </h1>
            <p className="text-xs font-medium text-[#17140d]/70">
              Give your room a unique slug name to start collaborating.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#17140d] mb-1.5">
                Room Name / Slug
              </label>
              <input
                type="text"
                value={roomId}
                onChange={(e) => { setRoomId(e.target.value); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                placeholder="e.g. design-sprint-2026"
                className="w-full px-4 py-3 rounded-xl border-[3px] border-[#17140d] text-sm font-mono font-bold bg-[#f5efe2]/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6b5be6]"
                disabled={loading}
                autoFocus
              />
              <p className="text-[11px] font-medium text-[#17140d]/50 mt-1">
                Use lowercase letters, numbers, and hyphens.
              </p>
            </div>

            {error && (
              <div className="bg-[#ff5b57]/15 border-2 border-[#17140d] rounded-xl px-4 py-2.5 text-xs font-bold text-[#ff5b57]">
                {error}
              </div>
            )}

            <button
              onClick={handleCreate}
              disabled={loading}
              className="memphis-btn bg-[#6b5be6] text-white font-black text-base w-full py-3.5 rounded-xl flex items-center justify-center gap-2 mt-2 disabled:opacity-60"
            >
              {loading ? "Creating room…" : "Create Room"} <ArrowRight size={18} strokeWidth={3} />
            </button>
          </div>

          <div className="mt-6 pt-4 border-t-2 border-[#17140d]/10 text-center">
            <span className="text-xs font-medium text-[#17140d]/60">Want to join an existing room? </span>
            <button
              onClick={() => router.push("/joinroom")}
              className="text-xs font-bold text-[#6b5be6] hover:underline"
            >
              Join a room →
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}