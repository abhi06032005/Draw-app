"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  Share2, 
  Check, 
  Sun, 
  Moon, 
  Users, 
  CloudCheck, 
  CloudUpload,
  Circle,
  Sparkles,
  Wand2
} from "lucide-react";

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

interface CollaboratorInfo {
  socketId: string;
  username: string;
  color?: { background: string; stroke: string };
}

interface WhiteboardHeaderProps {
  roomSlug: string;
  boardTitle?: string;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  connectionStatus: ConnectionStatus;
  collaborators: CollaboratorInfo[];
  isSaving: boolean;
  onShare: () => void;
  shareCopied: boolean;
  onOpenAI?: () => void;
}

export function WhiteboardHeader({
  roomSlug,
  boardTitle,
  theme,
  onToggleTheme,
  connectionStatus,
  collaborators,
  isSaving,
  onShare,
  shareCopied,
  onOpenAI,
}: WhiteboardHeaderProps) {
  const isDark = theme === "dark";

  return (
    <header 
      className={`h-14 border-b px-4 flex items-center justify-between select-none z-30 transition-colors duration-200 ${
        isDark 
          ? "bg-[#121212] border-[#2c2c2c] text-neutral-100" 
          : "bg-white border-[#e0e0e0] text-[#17140d]"
      }`}
    >
      {/* Left: Back & Room Title */}
      <div className="flex items-center gap-3 min-w-0">
        <Link
          href="/dashboard"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
            isDark
              ? "hover:bg-neutral-800 text-neutral-300"
              : "hover:bg-neutral-100 text-neutral-700"
          }`}
          title="Back to Dashboard"
        >
          <ArrowLeft size={16} />
          <span className="hidden sm:inline">Dashboard</span>
        </Link>

        <div className={`h-5 w-[1px] ${isDark ? "bg-neutral-800" : "bg-neutral-200"}`} />

        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg">🎨</span>
          <div className="min-w-0">
            <h1 className="text-sm font-extrabold truncate tracking-tight">
              {boardTitle || roomSlug}
            </h1>
            <span className="text-[11px] font-mono opacity-50 block sm:hidden">
              {roomSlug}
            </span>
          </div>
        </div>

        {/* Save indicator */}
        <div className={`hidden md:flex items-center gap-1.5 text-[11px] font-medium ml-3 px-2.5 py-1 rounded-full border transition-all duration-200 ${
          isDark ? "bg-neutral-900/60 border-neutral-800 text-neutral-400" : "bg-neutral-100/70 border-neutral-200 text-neutral-600"
        }`}>
          {isSaving ? (
            <span className="flex items-center gap-1.5 text-neutral-400">
              <span className="w-2 h-2 rounded-full border-2 border-neutral-400 border-t-transparent animate-spin" />
              <span>Saving changes…</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <Check size={12} strokeWidth={2.5} />
              <span>Saved to cloud</span>
            </span>
          )}
        </div>
      </div>

      {/* Right: Collaborators, Connection Status, Theme, Share */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Collaborators list / Avatars */}
        {collaborators.length > 0 && (
          <div className="flex items-center -space-x-2 mr-1">
            {collaborators.slice(0, 4).map((c, i) => (
              <div
                key={c.socketId}
                title={c.username || `Collaborator ${i + 1}`}
                style={{
                  backgroundColor: c.color?.background || "#6366f1",
                  borderColor: isDark ? "#121212" : "#ffffff",
                }}
                className="w-7 h-7 rounded-full border-2 flex items-center justify-center text-[10px] font-black text-neutral-800 shadow-sm uppercase"
              >
                {(c.username?.[0] || "C").toUpperCase()}
              </div>
            ))}
            {collaborators.length > 4 && (
              <div 
                className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${
                  isDark ? "bg-neutral-800 border-[#121212] text-neutral-300" : "bg-neutral-200 border-white text-neutral-700"
                }`}
              >
                +{collaborators.length - 4}
              </div>
            )}
          </div>
        )}

        {/* Connection Status Badge */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
            connectionStatus === "connected"
              ? isDark
                ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-400"
                : "bg-emerald-50 border-emerald-300 text-emerald-700"
              : connectionStatus === "connecting"
              ? isDark
                ? "bg-amber-950/40 border-amber-800/60 text-amber-400"
                : "bg-amber-50 border-amber-300 text-amber-700"
              : isDark
              ? "bg-rose-950/40 border-rose-800/60 text-rose-400"
              : "bg-rose-50 border-rose-300 text-rose-700"
          }`}
          title={`Status: ${connectionStatus}`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              connectionStatus === "connected"
                ? "bg-emerald-500 animate-pulse"
                : connectionStatus === "connecting"
                ? "bg-amber-500 animate-bounce"
                : "bg-rose-500"
            }`}
          />
          <span className="hidden sm:inline capitalize">
            {connectionStatus === "connected" ? `${collaborators.length + 1} Online` : connectionStatus}
          </span>
        </div>

        {/* Sketio AI Diagram Generator Button */}
        {onOpenAI && (
          <button
            onClick={onOpenAI}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-600 hover:opacity-90 text-white shadow-md transition-all active:scale-95"
            title="Generate diagrams with Sketio AI"
          >
            <Sparkles size={14} className="animate-spin-slow" />
            <span className="hidden sm:inline">Sketio AI</span>
          </button>
        )}

        {/* Theme Toggle Button */}
        <button
          onClick={onToggleTheme}
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors border ${
            isDark
              ? "bg-neutral-800 border-neutral-700 hover:bg-neutral-700 text-amber-300"
              : "bg-neutral-100 border-neutral-200 hover:bg-neutral-200 text-neutral-700"
          }`}
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Share Button */}
        <button
          onClick={onShare}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
            shareCopied
              ? "bg-emerald-600 text-white"
              : "bg-violet-600 hover:bg-violet-700 text-white"
          }`}
          title="Copy collaborative link"
        >
          {shareCopied ? (
            <>
              <Check size={14} />
              <span>Link Copied!</span>
            </>
          ) : (
            <>
              <Share2 size={14} />
              <span>Share</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
}
