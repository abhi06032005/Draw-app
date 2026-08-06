"use client";

import React from "react";
import Link from "next/link";
import { 
  ArrowRight, 
  Play, 
  Check, 
  Pencil, 
  MousePointer, 
  MessageSquare, 
  Sparkles, 
  ChevronRight,
  Download,
  Eraser,
  Palette,
  ShieldCheck,
  Zap,
  Users
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f5efe2] text-[#17140d] selection:bg-[#ffc531] selection:text-[#17140d] relative overflow-x-hidden">
      
      {/* ─── ANIMATED MEMPHIS CONFETTI BACKGROUND (CSS KEYFRAMES ONLY, NO JS) ─── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0 select-none">
        
        {/* 1. Coral Triangle (top-left) */}
        <div className="absolute top-[7%] left-[4%] anim-drift">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <polygon points="24,4 44,42 4,42" fill="#ff5b57" stroke="#17140d" strokeWidth="3" strokeLinejoin="round" />
          </svg>
        </div>

        {/* 2. Teal Quarter-Arc (top-center-left) */}
        <div className="absolute top-[13%] left-[26%] anim-sway">
          <svg width="54" height="54" viewBox="0 0 54 54" fill="none">
            <path d="M4 50 A 46 46 0 0 1 50 4 L 50 50 Z" fill="#12b3a4" stroke="#17140d" strokeWidth="3" />
          </svg>
        </div>

        {/* 3. Mustard Dotted Circle (top-right) */}
        <div className="absolute top-[5%] right-[7%] anim-spin">
          <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
            <circle cx="30" cy="30" r="26" fill="#ffc531" stroke="#17140d" strokeWidth="3" strokeDasharray="4 4" />
          </svg>
        </div>

        {/* 4. Violet Plus-Sign (mid-left) */}
        <div className="absolute top-[40%] left-[2%] anim-spin">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <path d="M14 4 H26 V14 H36 V26 H26 V36 H14 V26 H4 V14 H14 Z" fill="#6b5be6" stroke="#17140d" strokeWidth="3" strokeLinejoin="round" />
          </svg>
        </div>

        {/* 5. Black Squiggle Bacteria Line (center-right) */}
        <div className="absolute top-[36%] right-[3%] anim-sway">
          <svg width="70" height="40" viewBox="0 0 70 40" fill="none">
            <path d="M5 20 Q 20 5, 35 20 T 65 20" fill="none" stroke="#17140d" strokeWidth="4" strokeLinecap="round" />
          </svg>
        </div>

        {/* 6. Mustard Half-Circle (mid-right) */}
        <div className="absolute top-[55%] right-[11%] anim-bob">
          <svg width="50" height="30" viewBox="0 0 50 30" fill="none">
            <path d="M 5 25 A 20 20 0 0 1 45 25 Z" fill="#ffc531" stroke="#17140d" strokeWidth="3" />
          </svg>
        </div>

        {/* 7. Teal Solid Dot (bottom-left) */}
        <div className="absolute top-[72%] left-[5%] anim-bob">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" fill="#12b3a4" stroke="#17140d" strokeWidth="3" />
          </svg>
        </div>

        {/* 8. Sky Blue Zigzag (hero bottom center) */}
        <div className="absolute top-[48%] left-[44%] anim-bob">
          <svg width="60" height="30" viewBox="0 0 60 30" fill="none">
            <path d="M 5 20 L 18 5 L 31 20 L 44 5 L 55 20" fill="none" stroke="#3aa0ff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* 9. Coral Terrazzo / Striped Circle (hero bottom right) */}
        <div className="absolute top-[66%] right-[4%] anim-spin">
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
            <circle cx="28" cy="28" r="24" fill="#ff5b57" stroke="#17140d" strokeWidth="3" />
            <line x1="12" y1="18" x2="44" y2="18" stroke="#17140d" strokeWidth="3" />
            <line x1="8" y1="28" x2="48" y2="28" stroke="#17140d" strokeWidth="3" />
            <line x1="12" y1="38" x2="44" y2="38" stroke="#17140d" strokeWidth="3" />
          </svg>
        </div>

      </div>

      {/* ─── 1. TOP MINIMAL NAVIGATION ─── */}
      <header className="relative z-20 max-w-[1360px] mx-auto px-6 pt-6 pb-4">
        <nav className="flex items-center justify-between">
          
          {/* Logo Tile + Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-[42px] h-[42px] bg-[#ffc531] rounded-xl border-[3px] border-[#17140d] memphis-shadow-sm flex items-center justify-center transition-transform group-hover:rotate-6">
              <Pencil size={20} strokeWidth={2.5} className="text-[#17140d]" />
            </div>
            <span className="font-display font-extrabold text-2xl tracking-tight text-[#17140d]">
              Sketchflow
            </span>
          </Link>

          {/* Center Links */}
          <div className="hidden md:flex items-center gap-8 text-[15px] font-medium">
            <a href="#features" className="hover:text-[#ff5b57] transition-colors">Features</a>
            <a href="#canvas" className="hover:text-[#ff5b57] transition-colors">Live Tools</a>
            <a href="#teams" className="hover:text-[#ff5b57] transition-colors">Use Cases</a>
            <a href="#faq" className="hover:text-[#ff5b57] transition-colors">FAQ</a>
          </div>

          {/* Right Action CTA */}
          <div className="flex items-center gap-3">
            <Link
              href="/signin"
              className="hidden sm:inline-block font-bold text-sm text-[#17140d] px-4 py-2 hover:underline"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="memphis-btn bg-[#12b3a4] text-white font-bold text-sm px-5 py-2.5 rounded-full flex items-center gap-1.5"
            >
              Start sketching free
            </Link>
          </div>

        </nav>
      </header>

      {/* ─── 2. ASYMMETRIC HERO SECTION ─── */}
      <section className="relative z-10 max-w-[1360px] mx-auto px-6 pt-10 pb-20 md:pt-14 md:pb-28">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Hero Copy */}
          <div className="lg:col-span-7 space-y-7 text-left">
            
            {/* Eyebrow Pill */}
            <div className="inline-flex items-center gap-2.5 bg-[#6b5be6] text-white px-4 py-1.5 rounded-full border-[3px] border-[#17140d] memphis-shadow-sm text-xs font-bold uppercase tracking-wider">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ffc531] animate-pulse" />
              Real-Time Collaborative Whiteboard
            </div>

            {/* Huge Headline with Marker Highlights */}
            <h1 className="font-display font-black text-5xl sm:text-6xl md:text-[76px] leading-[0.98] tracking-tight text-[#17140d]">
              Draw,{" "}
              <span className="marker-highlight" style={{ "--highlight-color": "#ffc531", "--highlight-rot": "-1.8deg" } as React.CSSProperties}>
                collaborate
              </span>{" "}
              & ship in{" "}
              <span className="marker-highlight text-white" style={{ "--highlight-color": "#12b3a4", "--highlight-rot": "1.5deg" } as React.CSSProperties}>
                real-time.
              </span>
            </h1>

            {/* Muted Lead Paragraph */}
            <p className="text-[#17140d]/75 text-lg md:text-[19px] leading-relaxed max-w-xl font-normal">
              Sketchflow brings your entire team onto a shared infinite canvas. Freehand draw, drop shapes, select & move elements, erase objects, and chat live in sub-50ms sync.
            </p>

            {/* Dual CTA Row */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                href="/signup"
                className="memphis-btn bg-[#ff5b57] text-white font-black text-base px-8 py-4 rounded-full flex items-center gap-2.5 text-lg"
              >
                Create room now <ArrowRight size={20} strokeWidth={3} />
              </Link>
              <Link
                href="/dashboard"
                className="memphis-btn bg-white text-[#17140d] font-bold text-base px-7 py-4 rounded-full flex items-center gap-2 text-lg hover:bg-slate-50"
              >
                <MousePointer size={18} strokeWidth={2.5} /> Go to Dashboard
              </Link>
            </div>

            {/* Trust Proof Row */}
            <div className="flex items-center gap-4 pt-4 border-t-2 border-[#17140d]/10">
              <div className="flex -space-x-3">
                <div className="w-10 h-10 rounded-full bg-[#ff5b57] border-[3px] border-[#17140d] flex items-center justify-center font-black text-white text-sm">
                  A
                </div>
                <div className="w-10 h-10 rounded-full bg-[#12b3a4] border-[3px] border-[#17140d] flex items-center justify-center font-black text-white text-sm">
                  S
                </div>
                <div className="w-10 h-10 rounded-full bg-[#6b5be6] border-[3px] border-[#17140d] flex items-center justify-center font-black text-white text-sm">
                  M
                </div>
                <div className="w-10 h-10 rounded-full bg-[#ffc531] border-[3px] border-[#17140d] flex items-center justify-center font-black text-[#17140d] text-sm">
                  K
                </div>
              </div>
              <div className="text-xs md:text-sm text-[#17140d]/80 font-medium leading-snug">
                <span className="font-bold text-[#17140d]">12,000+ teams</span> sketch together on Sketchflow.<br />
                Instant rooms, sub-50ms WebSockets, zero installation required.
              </div>
            </div>

          </div>

          {/* Right Hero: Tilted Product Canvas Mockup Card */}
          <div className="lg:col-span-5 relative">
            <div className="memphis-card transform -rotate-2 hover:rotate-0 transition-transform duration-300 overflow-hidden">
              
              {/* Browser Chrome Header */}
              <div className="bg-[#f5efe2] border-b-[3px] border-[#17140d] px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded-full bg-[#ff5b57] border-2 border-[#17140d]" />
                  <div className="w-3.5 h-3.5 rounded-full bg-[#ffc531] border-2 border-[#17140d]" />
                  <div className="w-3.5 h-3.5 rounded-full bg-[#12b3a4] border-2 border-[#17140d]" />
                </div>
                <div className="text-xs font-bold text-[#17140d] bg-white px-3 py-1 rounded-md border-2 border-[#17140d] font-mono">
                  Room: design-sprint-v2
                </div>
              </div>

              {/* Canvas Board Mockup Body */}
              <div className="p-6 space-y-6 bg-[#0c0d14] text-white">
                
                {/* Header title + status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#34d399] animate-pulse" />
                    <span className="text-xs font-bold text-white/80">3 Collaborators Active</span>
                  </div>
                  <div className="bg-[#12b3a4] text-white text-xs font-bold px-3 py-1 rounded-full border-2 border-white/20">
                    Live Syncing
                  </div>
                </div>

                {/* Simulated Interactive Whiteboard Tools & Canvas Area */}
                <div className="bg-[#171926] border-2 border-white/15 rounded-xl p-4 relative min-h-[220px] flex flex-col justify-between">
                  
                  {/* Floating Canvas Toolbar Mockup */}
                  <div className="mx-auto bg-black/60 border border-white/20 rounded-xl px-3 py-1.5 flex items-center gap-2 shadow-lg">
                    <div className="w-7 h-7 rounded-lg bg-violet-600/50 border border-violet-400 flex items-center justify-center text-white">
                      <MousePointer size={14} />
                    </div>
                    <div className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/60">
                      <Pencil size={14} />
                    </div>
                    <div className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/60">
                      <Eraser size={14} />
                    </div>
                    <div className="w-3 h-3 rounded-full bg-[#ffc531] border border-white/40" />
                  </div>

                  {/* Canvas Drawn Vectors Mockup */}
                  <div className="relative h-32 w-full my-2">
                    {/* Rectangle Shape */}
                    <div className="absolute top-2 left-4 w-28 h-16 border-2 border-[#a78bfa] rounded-lg border-dashed flex items-center justify-center text-[10px] font-bold text-[#a78bfa] bg-violet-500/10">
                      Onboarding Frame
                    </div>
                    {/* Arrow Path */}
                    <svg className="absolute top-8 left-36 w-24 h-12" viewBox="0 0 96 48">
                      <path d="M 4 24 Q 48 4, 88 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeDasharray="4 4" />
                      <polygon points="88,24 80,18 82,28" fill="#34d399" />
                    </svg>
                    {/* User Avatar Badge on Canvas */}
                    <div className="absolute bottom-2 right-6 bg-[#ff5b57] text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-white shadow-md">
                      Alex is drawing…
                    </div>
                  </div>

                </div>

                {/* Integrated Live Chat Preview Bar */}
                <div className="bg-[#171926] border border-white/10 rounded-xl p-3 flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-[#6b5be6] flex items-center justify-center text-white text-xs font-bold">
                    <MessageSquare size={13} />
                  </div>
                  <div className="flex-1 text-xs text-white/70 truncate">
                    <span className="font-bold text-white">Sarah:</span> "Let me add the user feedback shapes here!"
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ─── 3. FULL-BLEED BLACK LOGO STRIP ─── */}
      <section className="bg-[#17140d] text-white border-y-[3px] border-[#17140d] py-7 px-6 relative z-10">
        <div className="max-w-[1360px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-[#ffc531] text-xs font-bold tracking-widest uppercase">
            TRUSTED BY TEAMS AT
          </div>
          <div className="flex flex-wrap items-center justify-center md:justify-end gap-8 md:gap-14 opacity-85">
            <span className="font-display font-bold text-xl tracking-tight">NORTHWIND</span>
            <span className="font-display font-bold text-xl tracking-tight">FIG & CO</span>
            <span className="font-display font-bold text-xl tracking-tight">SUPERBLOOM</span>
            <span className="font-display font-bold text-xl tracking-tight">KETTLE</span>
            <span className="font-display font-bold text-xl tracking-tight">HALCYON</span>
          </div>
        </div>
      </section>

      {/* ─── 4. FEATURES SECTION (TAILORED TO CANVAS TOOLS) ─── */}
      <section id="features" className="relative z-10 max-w-[1360px] mx-auto px-6 py-24 text-center">
        
        {/* Eyebrow + Heading */}
        <div className="max-w-2xl mx-auto space-y-4 mb-16">
          <div className="inline-block bg-[#6b5be6] text-white text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full border-[3px] border-[#17140d] memphis-shadow-sm">
            THE SKETCHFLOW ADVANTAGE
          </div>
          <h2 className="font-display font-black text-4xl sm:text-5xl leading-tight text-[#17140d]">
            Boring tools kill momentum.<br />
            Sketchflow keeps it loud.
          </h2>
        </div>

        {/* 3-Up Card Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          
          {/* Card 1: Real-time Canvas & Shapes */}
          <div className="memphis-card p-8 relative overflow-hidden group hover:-translate-y-1 transition-transform">
            <div className="w-[62px] h-[62px] bg-[#ff5b57] rounded-2xl border-[3px] border-[#17140d] memphis-shadow-sm flex items-center justify-center text-white mb-6">
              <Pencil size={28} strokeWidth={2.5} />
            </div>
            <h3 className="font-display font-extrabold text-2xl text-[#17140d] mb-3">
              Infinite Canvas & Vector Tools
            </h3>
            <p className="text-[#17140d]/70 text-base leading-relaxed">
              Freehand pencil, clean rectangles, circles, straight lines, directional arrows, and text notes with custom colors & stroke weights.
            </p>
            {/* Translucent Corner Accent */}
            <div className="absolute -bottom-10 -right-10 w-36 h-36 rounded-full bg-[#ff5b57]/15 pointer-events-none" />
          </div>

          {/* Card 2: Move & Smart Eraser */}
          <div className="memphis-card p-8 relative overflow-hidden group hover:-translate-y-1 transition-transform">
            <div className="w-[62px] h-[62px] bg-[#12b3a4] rounded-2xl border-[3px] border-[#17140d] memphis-shadow-sm flex items-center justify-center text-white mb-6">
              <MousePointer size={28} strokeWidth={2.5} />
            </div>
            <h3 className="font-display font-extrabold text-2xl text-[#17140d] mb-3">
              Select, Move & Object Eraser
            </h3>
            <p className="text-[#17140d]/70 text-base leading-relaxed">
              Select any drawn element with a violet bounding box, move it around freely, or wipe away shapes instantly with the Excalidraw object eraser.
            </p>
            {/* Translucent Corner Accent */}
            <div className="absolute -bottom-10 -right-10 w-36 h-36 rounded-full bg-[#12b3a4]/15 pointer-events-none" />
          </div>

          {/* Card 3: Real-Time Sync & Live Chat */}
          <div className="memphis-card p-8 relative overflow-hidden group hover:-translate-y-1 transition-transform">
            <div className="w-[62px] h-[62px] bg-[#6b5be6] rounded-2xl border-[3px] border-[#17140d] memphis-shadow-sm flex items-center justify-center text-white mb-6">
              <MessageSquare size={28} strokeWidth={2.5} />
            </div>
            <h3 className="font-display font-extrabold text-2xl text-[#17140d] mb-3">
              Sub-50ms Sync & Built-in Chat
            </h3>
            <p className="text-[#17140d]/70 text-base leading-relaxed">
              Powered by persistent WebSockets and PostgreSQL. Share a room link to sketch live and message your collaborators in the side panel.
            </p>
            {/* Translucent Corner Accent */}
            <div className="absolute -bottom-10 -right-10 w-36 h-36 rounded-full bg-[#6b5be6]/15 pointer-events-none" />
          </div>

        </div>

      </section>

      {/* ─── 5. LIVE SKETCHFLOW APP DEMO BANNER ─── */}
      <section className="relative z-10 max-w-[1360px] mx-auto px-6 py-12">
        <div className="bg-[#ffc531] border-[3px] border-[#17140d] memphis-shadow-lg rounded-[28px] p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 text-left max-w-xl">
            <div className="inline-flex items-center gap-2 bg-white px-3.5 py-1 rounded-full border-2 border-[#17140d] text-xs font-bold uppercase">
              <Sparkles size={14} className="text-[#ff5b57]" /> Ready To Draw?
            </div>
            <h3 className="font-display font-black text-3xl md:text-4xl text-[#17140d] leading-tight">
              Create a room and start sketching right now
            </h3>
            <p className="text-[#17140d]/80 text-base font-medium">
              Jump straight into your workspace dashboard to create new room slugs or join your team's live session.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/dashboard"
              className="memphis-btn bg-[#6b5be6] text-white font-black text-base px-7 py-3.5 rounded-full flex items-center gap-2"
            >
              Go to Dashboard <ChevronRight size={18} />
            </Link>
            <Link
              href="/signup"
              className="memphis-btn bg-white text-[#17140d] font-bold text-base px-6 py-3.5 rounded-full"
            >
              Sign up free
            </Link>
          </div>
        </div>
      </section>

      {/* ─── 6. FOOTER ─── */}
      <footer className="relative z-10 border-t-[3px] border-[#17140d] bg-[#f5efe2] pt-16 pb-12 px-6">
        <div className="max-w-[1360px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#ffc531] rounded-xl border-[3px] border-[#17140d] flex items-center justify-center font-black text-[#17140d]">
                S
              </div>
              <span className="font-display font-extrabold text-xl">Sketchflow</span>
            </div>
            <p className="text-xs text-[#17140d]/70 leading-relaxed max-w-xs">
              The loud, playful collaborative canvas for high-velocity teams.
            </p>
          </div>

          <div>
            <h4 className="font-display font-bold text-sm text-[#17140d] uppercase tracking-wider mb-4">Canvas Tools</h4>
            <ul className="space-y-2 text-xs font-medium text-[#17140d]/70">
              <li><a href="#features" className="hover:underline">Freehand Pencil</a></li>
              <li><a href="#features" className="hover:underline">Shapes & Arrows</a></li>
              <li><a href="#features" className="hover:underline">Move & Select</a></li>
              <li><a href="#features" className="hover:underline">Object Eraser</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-bold text-sm text-[#17140d] uppercase tracking-wider mb-4">Collaboration</h4>
            <ul className="space-y-2 text-xs font-medium text-[#17140d]/70">
              <li><a href="#features" className="hover:underline">Sub-50ms Sync</a></li>
              <li><a href="#features" className="hover:underline">Live Side Chat</a></li>
              <li><a href="#features" className="hover:underline">PNG Image Export</a></li>
              <li><a href="#features" className="hover:underline">Room Slugs</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-bold text-sm text-[#17140d] uppercase tracking-wider mb-4">Account</h4>
            <ul className="space-y-2 text-xs font-medium text-[#17140d]/70">
              <li><Link href="/signin" className="hover:underline">Sign In</Link></li>
              <li><Link href="/signup" className="hover:underline">Create Account</Link></li>
              <li><Link href="/dashboard" className="hover:underline">Dashboard</Link></li>
            </ul>
          </div>
        </div>

        <div className="max-w-[1360px] mx-auto mt-12 pt-6 border-t-2 border-[#17140d]/10 flex flex-col sm:flex-row items-center justify-between text-xs text-[#17140d]/50 font-medium">
          <div>© {new Date().getFullYear()} Sketchflow. All rights reserved.</div>
          <div className="mt-2 sm:mt-0">Memphis Design System</div>
        </div>
      </footer>

    </div>
  );
}
