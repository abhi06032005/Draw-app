"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  ExternalLink,
  Github,
  GitBranch,
  Loader2,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import axios from "axios";

import { BACKEND_URL } from "@/config";
import { getAuthToken, getGitHubAccessToken } from "@/lib/auth";
import type { AnalysisDepth, ArchitectureGraph } from "@/lib/architectureTypes";

interface GitHubRepositoryModalProps {
  isOpen: boolean;
  roomSlug: string;
  theme: "light" | "dark";
  onClose: () => void;
  onAnalyzed: (
    graph: ArchitectureGraph,
    layoutMode?: import("@/lib/architectureElements").ArchitectureLayoutMode,
  ) => void;
}

const STAGES = [
  "Connecting to GitHub",
  "Fetching repository files",
  "Detecting project structure",
  "Analyzing dependencies",
  "Identifying services and APIs",
  "Building architecture",
  "Rendering interactive canvas",
];

const RECENT_KEY = "sketio-recent-github-repositories";

export function GitHubRepositoryModal({
  isOpen,
  roomSlug,
  theme,
  onClose,
  onAnalyzed,
}: GitHubRepositoryModalProps) {
  const [url, setUrl] = useState("");
  const [branch, setBranch] = useState("");
  const [depth, setDepth] = useState<AnalysisDepth>("standard");
  const [layoutMode, setLayoutMode] =
    useState<import("@/lib/architectureElements").ArchitectureLayoutMode>("high-level");
  const [forceRefresh, setForceRefresh] = useState(false);
  const [stage, setStage] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  const [jobId, setJobId] = useState<string | null>(null);
  const [gitHubStatus, setGitHubStatus] = useState<{
    connected: boolean;
    githubLogin: string | null;
  } | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (!isOpen || typeof window === "undefined") return;

    try {
      setRecent(JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"));
    } catch {
      setRecent([]);
    }

    async function checkStatus() {
      const token = await getAuthToken();
      if (!token) return;
      try {
        const res = await axios.get(`${BACKEND_URL}/github/connection/status`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (isMounted && res.data) {
          setGitHubStatus(res.data);
        }
      } catch {
        // Status check optional
      }
    }
    checkStatus();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  const repositoryName = useMemo(() => {
    try {
      const parsed = new URL(url.trim());
      return parsed.hostname === "github.com"
        ? parsed.pathname.split("/").filter(Boolean).slice(0, 2).join(" / ")
        : "";
    } catch {
      return "";
    }
  }, [url]);

  if (!isOpen) return null;
  const isDark = theme === "dark";
  const surface = isDark
    ? "bg-[#18181b] border-neutral-800 text-neutral-100"
    : "bg-white border-neutral-200 text-neutral-900";
  const input = isDark
    ? "bg-black/25 border-neutral-700 text-white placeholder-neutral-500"
    : "bg-white border-neutral-200 text-neutral-900 placeholder-neutral-400";

  const remember = (value: string) => {
    if (typeof window === "undefined") return;
    const next = [value, ...recent.filter((item) => item !== value)].slice(
      0,
      5,
    );
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    setRecent(next);
  };

  const disconnectGitHub = async () => {
    const token = await getAuthToken();
    if (!token) return;
    try {
      await axios.delete(`${BACKEND_URL}/github/connection`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setGitHubStatus({ connected: false, githubLogin: null });
    } catch {
      // Fallback
    }
  };

  const cancelJob = async () => {
    if (!jobId) return;
    const token = await getAuthToken();
    if (token) {
      await axios
        .post(
          `${BACKEND_URL}/architecture-jobs/${jobId}/cancel`,
          {},
          { headers: { Authorization: `Bearer ${token}` } },
        )
        .catch(() => undefined);
    }
    setJobId(null);
    setIsAnalyzing(false);
  };

  const analyze = async () => {
    const trimmed = url.trim();
    if (!/^https:\/\/github\.com\/[^/]+\/[^/]+(?:\.git)?\/?$/.test(trimmed)) {
      setError(
        "Use a valid GitHub URL like https://github.com/owner/repository.",
      );
      return;
    }
    setError(null);
    setIsAnalyzing(true);
    setStage(0);
    try {
      const token = await getAuthToken();
      if (!token)
        throw new Error(
          "Your session expired. Sign in again to import a repository.",
        );
      setStage(1);
      const githubToken = await getGitHubAccessToken();
      const response = await axios.post(
        `${BACKEND_URL}/room/${encodeURIComponent(roomSlug)}/github-architecture/jobs`,
        {
          url: trimmed,
          branch: branch.trim() || undefined,
          depth,
          forceRefresh,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            ...(githubToken ? { "X-GitHub-Token": githubToken } : {}),
          },
          timeout: 120000,
        },
      );
      const queuedJobId = response.data.jobId as string;
      const cached = Boolean(response.data.cached);
      setJobId(queuedJobId);

      for (let attempt = 0; attempt < 180; attempt++) {
        if (!isOpen) break;
        await new Promise((resolve) => setTimeout(resolve, cached ? 300 : 700));
        const statusResponse = await axios.get(
          `${BACKEND_URL}/architecture-jobs/${queuedJobId}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const job = statusResponse.data.job;
        if (job.stage === "connecting") setStage(0);
        if (job.stage === "fetching") setStage(1);
        if (job.stage === "structure") setStage(2);
        if (job.stage === "dependencies") setStage(3);
        if (job.stage === "services") setStage(4);
        if (job.stage === "building") setStage(5);
        if (job.status === "completed") {
          setStage(6);
          remember(trimmed);
          onAnalyzed(statusResponse.data.graph as ArchitectureGraph, layoutMode);
          onClose();
          break;
        }
        if (job.status === "failed" || job.status === "cancelled") {
          throw new Error(job.error || `Analysis ${job.status}.`);
        }
      }
    } catch (requestError: any) {
      setError(
        requestError?.response?.data?.message ||
          requestError?.message ||
          "Repository analysis failed.",
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`w-full max-w-2xl overflow-hidden rounded-3xl border shadow-2xl ${surface}`}
      >
        <div
          className={`relative overflow-hidden border-b px-6 py-5 ${isDark ? "border-neutral-800 bg-[#202024]" : "border-neutral-100 bg-[#f7f7fb]"}`}
        >
          <div className="absolute -right-12 -top-16 h-40 w-40 rounded-full bg-violet-500/20 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black text-white shadow-lg">
                <Github size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-lg font-bold">
                    Repository → Architecture
                  </h2>
                  <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-400">
                    Live graph
                  </span>
                </div>
                <p className="mt-1 max-w-lg text-xs opacity-60">
                  Turn real files, imports, routes, and infrastructure into an
                  editable architecture map.
                </p>
              </div>
            </div>
            <button
              onClick={isAnalyzing ? cancelJob : onClose}
              className="rounded-lg p-1.5 opacity-60 transition hover:bg-black/10 hover:opacity-100"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="max-h-[70vh] space-y-5 overflow-y-auto p-6">
          <div className="space-y-2">
            <label className="flex items-center justify-between text-xs font-bold uppercase tracking-wider opacity-60">
              <span>Public repository URL</span>
              {repositoryName && (
                <span className="normal-case text-violet-400">
                  {repositoryName}
                </span>
              )}
            </label>
            <div className="relative">
              <Github
                className="absolute left-3 top-3.5 opacity-40"
                size={16}
              />
              <input
                autoFocus
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://github.com/owner/repository"
                className={`w-full rounded-xl border py-3 pl-10 pr-3 text-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 ${input}`}
              />
            </div>
          </div>

          {recent.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {recent.map((item) => (
                <button
                  key={item}
                  onClick={() => setUrl(item)}
                  className="max-w-full truncate rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1.5 text-[11px] text-violet-300 transition hover:bg-violet-500/20"
                >
                  {item.replace("https://github.com/", "")}
                </button>
              ))}
            </div>
          )}

          {/* GitHub Connection Status */}
          <div
            className={`flex items-center justify-between rounded-xl border p-3 ${isDark ? "border-neutral-800 bg-neutral-900/60" : "border-neutral-200 bg-neutral-50"}`}
          >
            <div className="flex items-center gap-2.5">
              <Github
                size={16}
                className={gitHubStatus?.connected ? "text-emerald-400" : "opacity-40"}
              />
              <div className="text-xs">
                {gitHubStatus?.connected ? (
                  <span className="font-semibold text-emerald-400">
                    Connected as {gitHubStatus.githubLogin || "GitHub User"} (private repositories supported)
                  </span>
                ) : (
                  <span className="opacity-70">
                    Public repositories supported. Sign in with GitHub to access private repositories.
                  </span>
                )}
              </div>
            </div>
            {gitHubStatus?.connected && (
              <button
                onClick={disconnectGitHub}
                type="button"
                className="text-[11px] font-medium text-rose-400 hover:underline"
              >
                Disconnect
              </button>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_1.35fr]">
            <label className="space-y-2 text-xs font-bold uppercase tracking-wider opacity-60">
              <span className="flex items-center gap-1">
                <GitBranch size={13} />
                Branch{" "}
                <span className="font-normal normal-case opacity-60">
                  optional
                </span>
              </span>
              <input
                value={branch}
                onChange={(event) => setBranch(event.target.value)}
                placeholder="default branch"
                className={`w-full rounded-xl border px-3 py-3 text-sm font-normal normal-case outline-none focus:border-violet-500 ${input}`}
              />
            </label>
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider opacity-60">
                Analysis depth
              </span>
              <div className="grid grid-cols-3 gap-2">
                {(["quick", "standard", "deep"] as AnalysisDepth[]).map(
                  (value) => (
                    <button
                      key={value}
                      onClick={() => setDepth(value)}
                      className={`rounded-xl border px-3 py-3 text-left transition ${depth === value ? "border-violet-500 bg-violet-500/15 text-violet-300" : isDark ? "border-neutral-800 bg-neutral-900/50 hover:border-neutral-700" : "border-neutral-200 bg-neutral-50 hover:border-neutral-300"}`}
                    >
                      <div className="text-xs font-bold capitalize">
                        {value}
                      </div>
                      <div className="mt-1 text-[10px] opacity-55">
                        {value === "quick"
                          ? "Fast overview"
                          : value === "standard"
                            ? "Best balance"
                            : "Deep evidence"}
                      </div>
                    </button>
                  ),
                )}
              </div>
            </div>
          </div>

          {/* Layout Mode Selection */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider opacity-60">
              Canvas Layout Mode
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { id: "high-level", label: "High-Level", desc: "Tiered system" },
                { id: "dependency", label: "Dependencies", desc: "Directed graph" },
                { id: "backend", label: "Backend", desc: "API to storage" },
                { id: "database", label: "Database", desc: "Data centered" },
                { id: "api-flow", label: "API Flow", desc: "Request pipeline" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setLayoutMode(item.id as any)}
                  className={`rounded-xl border p-2.5 text-left transition ${
                    layoutMode === item.id
                      ? "border-violet-500 bg-violet-500/15 text-violet-300 shadow-sm"
                      : isDark
                        ? "border-neutral-800 bg-neutral-900/50 hover:border-neutral-700"
                        : "border-neutral-200 bg-neutral-50 hover:border-neutral-300"
                  }`}
                >
                  <div className="text-[11px] font-bold">{item.label}</div>
                  <div className="text-[9px] opacity-55">{item.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs opacity-75 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={forceRefresh}
              onChange={(e) => setForceRefresh(e.target.checked)}
              className="rounded border-neutral-700 accent-violet-600"
            />
            <span>Bypass commit cache & force fresh analysis</span>
          </label>

          <div
            className={`rounded-2xl border p-4 ${isDark ? "border-neutral-800 bg-neutral-900/50" : "border-neutral-200 bg-neutral-50"}`}
          >
            <div className="flex items-center gap-2 text-xs font-semibold">
              <Sparkles size={14} className="text-violet-400" />
              Evidence-first analysis
            </div>
            <p className="mt-2 text-[11px] leading-relaxed opacity-60">
              Generated nodes link back to the analyzed commit. Secret files,
              dependencies, binaries, and build output are excluded. Repository
              code is never executed.
            </p>
          </div>

          {isAnalyzing && (
            <div className="space-y-3 rounded-2xl border border-violet-500/25 bg-violet-500/10 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Loader2 size={16} className="animate-spin text-violet-400" />
                {STAGES[stage]}
              </div>
              <div className="space-y-1.5">
                {STAGES.slice(0, stage + 1).map((item, index) => (
                  <div
                    key={item}
                    className="flex items-center gap-2 text-[11px] opacity-70"
                  >
                    <Check size={12} className="text-emerald-400" />
                    {item}
                    {index === stage && (
                      <span className="ml-auto text-violet-300">working</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {error && (
            <div className="flex gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div
          className={`flex items-center justify-between gap-3 border-t px-6 py-4 ${isDark ? "border-neutral-800 bg-neutral-900/40" : "border-neutral-100 bg-neutral-50"}`}
        >
          <span className="text-[11px] opacity-50">
            {depth === "deep"
              ? "Up to 220 source files"
              : depth === "standard"
                ? "Up to 100 source files"
                : "Up to 30 source files"}
          </span>
          <div className="flex gap-2">
            <button
              onClick={isAnalyzing ? cancelJob : onClose}
              className="rounded-xl px-4 py-2 text-xs font-semibold opacity-60 transition hover:bg-black/10 hover:opacity-100"
            >
              {isAnalyzing ? "Cancel analysis" : "Cancel"}
            </button>
            <button
              onClick={analyze}
              disabled={isAnalyzing || !url.trim()}
              className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-violet-600/20 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Search size={14} />
              {isAnalyzing ? "Analyzing…" : "Generate architecture"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
