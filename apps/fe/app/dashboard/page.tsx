"use client";

import { BACKEND_URL } from "@/config";
import axios from "axios";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Pencil, 
  Plus, 
  LogIn, 
  Search, 
  Copy, 
  Check, 
  LogOut, 
  User as UserIcon, 
  Sparkles, 
  Layout, 
  Palette, 
  ArrowRight 
} from "lucide-react";

type User = {
  id: number;
  name: string;
  email: string;
};

type Room = {
  id: number;
  slug: string;
  createAt: string;
};

function RoomCard({ room, onJoin }: { room: Room; onJoin: (slug: string) => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(room.slug);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const date = new Date(room.createAt);
  const relativeDate = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="bg-white border-[3px] border-[#17140d] memphis-shadow-sm rounded-2xl p-5 flex items-center justify-between gap-4 transition-transform hover:-translate-y-0.5">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="w-11 h-11 rounded-xl bg-[#ffc531] border-[3px] border-[#17140d] flex items-center justify-center text-xl flex-shrink-0">
          🎨
        </div>
        <div className="min-w-0">
          <div className="font-mono font-bold text-[#17140d] text-base truncate">{room.slug}</div>
          <div className="text-xs text-[#17140d]/60 font-medium mt-0.5">Created {relativeDate}</div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={handleCopy}
          title="Copy room ID"
          className="w-9 h-9 rounded-xl border-2 border-[#17140d] bg-[#f5efe2] flex items-center justify-center text-[#17140d] hover:bg-white transition-all text-xs font-bold"
        >
          {copied ? <Check size={16} className="text-[#12b3a4]" /> : <Copy size={15} />}
        </button>
        <button
          onClick={() => onJoin(room.slug)}
          className="memphis-btn-sm bg-[#6b5be6] text-white text-xs font-black px-4 py-2 rounded-xl flex items-center gap-1"
        >
          Join <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("Authorization");
    if (!token) { router.push("/signin"); return; }

    async function fetchData() {
      try {
        const userRes = await axios.get(`${BACKEND_URL}/user`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(userRes.data as User);

        const roomRes = await axios.get(`${BACKEND_URL}/get-rooms`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = roomRes.data;
        const safeRooms: Room[] = Array.isArray(data?.rooms)
          ? data.rooms
          : Array.isArray(data)
          ? data
          : [];
        setRooms(safeRooms);
      } catch (err) {
        router.push("/signin");
      } finally {
        setLoadingRooms(false);
      }
    }
    fetchData();
  }, [router]);

  const handleSignOut = () => {
    localStorage.removeItem("Authorization");
    router.push("/");
  };

  const handleJoin = (slug: string) => {
    router.push(`/joinroom/room/${slug}`);
  };

  const filteredRooms = rooms.filter((r) =>
    r.slug.toLowerCase().includes(search.toLowerCase())
  );

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f5efe2] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-[#17140d] border-t-[#6b5be6] rounded-full animate-spin mx-auto" />
          <p className="text-[#17140d]/60 font-bold text-sm">Loading your Sketchflow workspace…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5efe2] text-[#17140d] selection:bg-[#ffc531] relative overflow-x-hidden">
      
      {/* Background Animated Memphis Confetti */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0 select-none">
        <div className="absolute top-[8%] right-[5%] anim-drift">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <polygon points="24,4 44,42 4,42" fill="#ff5b57" stroke="#17140d" strokeWidth="3" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="absolute top-[35%] left-[3%] anim-spin">
          <svg width="50" height="50" viewBox="0 0 60 60" fill="none">
            <circle cx="30" cy="30" r="26" fill="#ffc531" stroke="#17140d" strokeWidth="3" strokeDasharray="4 4" />
          </svg>
        </div>
      </div>

      <div className="relative z-10 flex flex-col lg:flex-row min-h-screen">
        
        {/* ── Sidebar ───────────────────────────── */}
        <aside className="lg:w-80 flex-shrink-0 border-b lg:border-b-0 lg:border-r-[3px] border-[#17140d] bg-white p-6 flex flex-col justify-between gap-6">
          <div className="space-y-6">
            
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#ffc531] rounded-xl border-[3px] border-[#17140d] memphis-shadow-sm flex items-center justify-center">
                <Pencil size={20} strokeWidth={2.5} className="text-[#17140d]" />
              </div>
              <span className="font-display font-extrabold text-2xl tracking-tight text-[#17140d]">
                Sketchflow
              </span>
            </Link>

            {/* User Profile Card */}
            <div className="bg-[#f5efe2] border-[3px] border-[#17140d] rounded-2xl p-4 memphis-shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#ff5b57] border-[3px] border-[#17140d] flex items-center justify-center font-black text-white text-base flex-shrink-0">
                  {initials}
                </div>
                <div className="min-w-0 flex-1 flex items-center justify-between">
                  <div className="font-display font-bold text-[#17140d] text-base truncate">{user.name}</div>
                  <div className="flex items-center gap-1.5 text-[#12b3a4] text-xs font-bold flex-shrink-0">
                    <span className="w-2 h-2 rounded-full bg-[#12b3a4] animate-pulse" />
                    <span>Online</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Nav */}
            <nav className="space-y-2">
              <button
                onClick={() => router.push("/dashboard")}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-[3px] border-[#17140d] bg-[#ffc531] font-bold text-sm text-[#17140d] memphis-shadow-sm"
              >
                <Layout size={18} /> Dashboard
              </button>
              <button
                onClick={() => router.push("/createroom")}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-[#17140d] bg-white hover:bg-[#f5efe2] font-bold text-sm text-[#17140d] transition-all"
              >
                <Plus size={18} /> Create Room
              </button>
              <button
                onClick={() => router.push("/joinroom")}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-[#17140d] bg-white hover:bg-[#f5efe2] font-bold text-sm text-[#17140d] transition-all"
              >
                <LogIn size={18} /> Join Room
              </button>
            </nav>
          </div>

          {/* Sign out */}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-[3px] border-[#17140d] bg-[#ff5b57] text-white font-bold text-sm memphis-shadow-sm hover:translate-x-0.5"
          >
            <LogOut size={16} /> Sign Out
          </button>
        </aside>

        {/* ── Main content ──────────────────────── */}
        <main className="flex-1 p-6 lg:p-10 overflow-y-auto">
          
          {/* Header */}
          <div className="mb-10 text-left">
            <h1 className="font-display font-black text-3xl lg:text-4xl text-[#17140d] mb-1">
              Welcome back, <span className="marker-highlight" style={{ "--highlight-color": "#ffc531" } as React.CSSProperties}>{user.name.split(" ")[0]}</span> 👋
            </h1>
            <p className="text-[#17140d]/70 text-sm font-medium">Manage your collaborative rooms and jump right into drawing.</p>
          </div>

          {/* Quick action cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10 text-left">
            <button
              onClick={() => router.push("/createroom")}
              className="memphis-card p-6 bg-white hover:-translate-y-1 transition-transform cursor-pointer"
            >
              <div className="w-12 h-12 rounded-xl bg-[#6b5be6] border-[3px] border-[#17140d] flex items-center justify-center text-white mb-4">
                <Plus size={24} strokeWidth={3} />
              </div>
              <h3 className="font-display font-extrabold text-[#17140d] text-xl mb-1">Create a Room</h3>
              <p className="text-[#17140d]/70 text-xs font-medium">Start a new whiteboard canvas & share slug with your team.</p>
              <div className="mt-4 inline-flex items-center gap-1.5 text-[#6b5be6] text-xs font-black">
                Create now <ArrowRight size={14} />
              </div>
            </button>

            <button
              onClick={() => router.push("/joinroom")}
              className="memphis-card p-6 bg-white hover:-translate-y-1 transition-transform cursor-pointer"
            >
              <div className="w-12 h-12 rounded-xl bg-[#3aa0ff] border-[3px] border-[#17140d] flex items-center justify-center text-white mb-4">
                <LogIn size={24} strokeWidth={3} />
              </div>
              <h3 className="font-display font-extrabold text-[#17140d] text-xl mb-1">Join a Room</h3>
              <p className="text-[#17140d]/70 text-xs font-medium">Enter a room ID or slug to join an ongoing session.</p>
              <div className="mt-4 inline-flex items-center gap-1.5 text-[#3aa0ff] text-xs font-black">
                Enter ID <ArrowRight size={14} />
              </div>
            </button>
          </div>

          {/* Rooms section */}
          <div className="text-left">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="font-display font-black text-2xl text-[#17140d]">Your Sketch Rooms</h2>
                <p className="text-[#17140d]/60 text-xs font-semibold">{rooms.length} room{rooms.length !== 1 ? "s" : ""} total</p>
              </div>

              {rooms.length > 0 && (
                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search rooms…"
                    className="w-full pl-9 pr-4 py-2 rounded-xl border-[3px] border-[#17140d] bg-white text-xs font-bold text-[#17140d] placeholder-[#17140d]/40 outline-none"
                  />
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#17140d]/50" />
                </div>
              )}
            </div>

            <div className="space-y-4">
              {loadingRooms ? (
                <div className="p-8 text-center bg-white border-[3px] border-[#17140d] rounded-2xl">
                  <div className="w-8 h-8 border-4 border-[#17140d] border-t-[#6b5be6] rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-xs font-bold text-[#17140d]/60">Fetching your rooms…</p>
                </div>
              ) : filteredRooms.length === 0 ? (
                <div className="memphis-card p-12 text-center bg-white">
                  <div className="w-16 h-16 bg-[#ffc531] border-[3px] border-[#17140d] rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
                    🎨
                  </div>
                  <h3 className="font-display font-extrabold text-[#17140d] text-xl mb-2">No rooms found</h3>
                  <p className="text-[#17140d]/60 text-xs font-medium mb-6">
                    {search ? "No rooms match your search filter." : "Create your first room to start collaborating live."}
                  </p>
                  {!search && (
                    <button
                      onClick={() => router.push("/createroom")}
                      className="memphis-btn bg-[#6b5be6] text-white font-black text-xs px-6 py-3 rounded-xl"
                    >
                      Create a Room
                    </button>
                  )}
                </div>
              ) : (
                filteredRooms.map((room) => (
                  <RoomCard key={room.id} room={room} onJoin={handleJoin} />
                ))
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
