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
  Wand2,
  Github,
  MessageCircle,
  Lightbulb,
  Maximize2,
  Search,
} from "lucide-react";

export type ConnectionStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

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
  onOpenGitHub?: () => void;
  onOpenArchitectureChat?: () => void;
  onOpenArchitectureImprovements?: () => void;
  currentLayoutMode?: import("@/lib/architectureElements").ArchitectureLayoutMode;
  onChangeLayoutMode?: (
    mode: import("@/lib/architectureElements").ArchitectureLayoutMode,
  ) => void;
  onFitToArchitecture?: () => void;
  graphStats?: {
    nodeCount: number;
    edgeCount: number;
    repositoryName?: string;
  };
  nodes?: Array<{ id: string; name: string; type: string }>;
  onSearchSelectNode?: (nodeId: string) => void;
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
  onOpenGitHub,
  onOpenArchitectureChat,
  onOpenArchitectureImprovements,
  currentLayoutMode,
  onChangeLayoutMode,
  onFitToArchitecture,
  graphStats,
  nodes,
  onSearchSelectNode,
}: WhiteboardHeaderProps) {
  const isDark = theme === "dark";
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const filteredNodes =
    nodes && searchQuery.trim()
      ? nodes
          .filter(
            (n) =>
              n.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              n.type.toLowerCase().includes(searchQuery.toLowerCase()),
          )
          .slice(0, 8)
      : [];

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

        <div
          className={`h-5 w-[1px] ${isDark ? "bg-neutral-800" : "bg-neutral-200"}`}
        />

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
        <div
          className={`hidden md:flex items-center gap-1.5 text-[11px] font-medium ml-3 px-2.5 py-1 rounded-full border transition-all duration-200 ${
            isDark
              ? "bg-neutral-900/60 border-neutral-800 text-neutral-400"
              : "bg-neutral-100/70 border-neutral-200 text-neutral-600"
          }`}
        >
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

      {/* Center: Graph Stats & Node Quick-Search (Inspired by GitNexus graph visualizer) */}
      {graphStats && (
        <div className="hidden xl:flex items-center gap-2.5">
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border ${
              isDark
                ? "bg-neutral-900/80 border-neutral-800 text-neutral-300"
                : "bg-neutral-100 border-neutral-200 text-neutral-700"
            }`}
            title={
              graphStats.repositoryName
                ? `Repository: ${graphStats.repositoryName}`
                : "Architecture Elements"
            }
          >
            <Sparkles size={11} className="text-violet-400" />
            <span className="font-semibold text-violet-400 dark:text-violet-300">
              {graphStats.nodeCount} nodes
            </span>
            <span className="text-neutral-500">·</span>
            <span className="font-semibold text-cyan-500 dark:text-cyan-300">
              {graphStats.edgeCount} edges
            </span>
          </div>

          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
              isDark
                ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-400"
                : "bg-emerald-50 border-emerald-300 text-emerald-700"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Architecture Ready</span>
          </div>

          {nodes && onSearchSelectNode && (
            <div className="relative">
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs transition-all ${
                  isDark
                    ? "bg-neutral-900 border-neutral-700 focus-within:border-cyan-500 text-neutral-200"
                    : "bg-neutral-50 border-neutral-300 focus-within:border-cyan-600 text-neutral-800"
                }`}
              >
                <Search size={12} className="text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search nodes..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsSearchFocused(true);
                  }}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() =>
                    setTimeout(() => setIsSearchFocused(false), 200)
                  }
                  className="bg-transparent outline-none text-xs w-28 focus:w-44 transition-all placeholder:text-neutral-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="text-neutral-400 hover:text-neutral-200 text-[10px]"
                  >
                    ✕
                  </button>
                )}
              </div>

              {isSearchFocused && filteredNodes.length > 0 && (
                <div
                  className={`absolute left-0 mt-1 w-56 rounded-xl border p-1 shadow-2xl z-50 ${
                    isDark
                      ? "bg-neutral-900 border-neutral-800 text-neutral-200"
                      : "bg-white border-neutral-200 text-neutral-800"
                  }`}
                >
                  <div className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 text-neutral-400">
                    Matching Nodes ({filteredNodes.length})
                  </div>
                  {filteredNodes.map((n) => (
                    <button
                      key={n.id}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        onSearchSelectNode(n.id);
                        setSearchQuery("");
                        setIsSearchFocused(false);
                      }}
                      className={`w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center justify-between transition ${
                        isDark ? "hover:bg-neutral-800" : "hover:bg-neutral-100"
                      }`}
                    >
                      <span className="font-medium truncate">{n.name}</span>
                      <span className="text-[10px] font-mono opacity-60 uppercase ml-2 px-1 rounded bg-neutral-800 text-neutral-300">
                        {n.type}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

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
                  isDark
                    ? "bg-neutral-800 border-[#121212] text-neutral-300"
                    : "bg-neutral-200 border-white text-neutral-700"
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
            {connectionStatus === "connected"
              ? `${collaborators.length + 1} Online`
              : connectionStatus}
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

        {onOpenGitHub && (
          <button
            onClick={onOpenGitHub}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-xs font-black text-white shadow-md transition-all hover:border-violet-500 hover:bg-neutral-800 active:scale-95"
            title="Import a GitHub repository architecture"
          >
            <Github size={14} />
            <span className="hidden lg:inline">Import repo</span>
          </button>
        )}

        {onOpenArchitectureChat && (
          <button
            onClick={onOpenArchitectureChat}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-700 bg-neutral-900 text-neutral-200 transition hover:border-violet-500 hover:bg-neutral-800"
            title="Ask about imported architecture"
          >
            <MessageCircle size={15} />
          </button>
        )}

        {onOpenArchitectureImprovements && (
          <button
            onClick={onOpenArchitectureImprovements}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-700 bg-neutral-900 text-amber-300 transition hover:border-amber-500 hover:bg-neutral-800"
            title="Analyze architecture"
          >
            <Lightbulb size={15} />
          </button>
        )}

        {onChangeLayoutMode && (
          <div className="flex items-center gap-1.5 ml-1">
            <select
              value={currentLayoutMode || "high-level"}
              onChange={(e) => onChangeLayoutMode(e.target.value as any)}
              className={`rounded-lg border px-2 py-1 text-xs font-semibold outline-none transition cursor-pointer ${
                isDark
                  ? "border-neutral-700 bg-neutral-900 text-neutral-200 hover:border-violet-500"
                  : "border-neutral-300 bg-neutral-50 text-neutral-800 hover:border-violet-400"
              }`}
              title="Switch Architecture Layout Mode"
            >
              <option value="high-level">Tiered Architecture</option>
              <option value="dependency">Dependency Graph</option>
              <option value="backend">Backend Focus</option>
              <option value="database">Database Centered</option>
              <option value="api-flow">API Request Flow</option>
            </select>
            {onFitToArchitecture && (
              <button
                onClick={onFitToArchitecture}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-700 bg-neutral-900 text-neutral-200 hover:border-violet-500 hover:bg-neutral-800 transition"
                title="Fit Architecture Graph to Screen"
              >
                <Maximize2 size={14} />
              </button>
            )}
          </div>
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
