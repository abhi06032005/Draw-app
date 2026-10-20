"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
  Lightbulb,
  Loader2,
  Network,
  ShieldAlert,
  X,
} from "lucide-react";
import type {
  ArchitectureGraph,
  ArchitectureImprovement,
} from "@/lib/architectureTypes";

interface ArchitectureImprovementsProps {
  graph: ArchitectureGraph;
  theme: "light" | "dark";
  onClose: () => void;
  onPreview: (graph: ArchitectureGraph) => void;
  onHighlight: (nodeIds: string[]) => void;
}

const categoryIcon = (category: ArchitectureImprovement["category"]) => {
  if (category === "security") return ShieldAlert;
  if (category === "coupling") return Network;
  if (category === "scalability") return AlertTriangle;
  return Lightbulb;
};

export function ArchitectureImprovements({
  graph,
  theme,
  onClose,
  onPreview,
  onHighlight,
}: ArchitectureImprovementsProps) {
  const [items, setItems] = useState<ArchitectureImprovement[] | null>(null);
  const [proposedGraph, setProposedGraph] = useState<ArchitectureGraph | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isDark = theme === "dark";

  const review = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/architecture/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ graph }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Architecture review failed.");
      setItems(data.improvements || []);
      setProposedGraph(data.proposedGraph || null);
    } catch (reviewError) {
      setError(
        reviewError instanceof Error
          ? reviewError.message
          : "Architecture review failed.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside
      className={`absolute bottom-3 left-3 z-50 flex max-h-[min(700px,calc(100vh-100px))] w-[min(460px,calc(100vw-24px))] flex-col overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-xl ${isDark ? "border-neutral-800 bg-[#151519]/95 text-white" : "border-neutral-200 bg-white/95 text-neutral-900"}`}
    >
      <div className="flex items-center justify-between border-b border-inherit px-4 py-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold">
            <Lightbulb size={16} className="text-amber-400" />
            Architecture review
          </div>
          <div className="mt-1 text-[10px] opacity-50">
            Hypotheses grounded in {graph.repository.fullName}
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1 opacity-60 hover:bg-black/10 hover:opacity-100"
        >
          <X size={15} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {!items && !loading && (
          <div className="py-10 text-center">
            <Lightbulb size={28} className="mx-auto mb-3 text-amber-400" />
            <h3 className="text-sm font-bold">
              Find useful places to investigate
            </h3>
            <p className="mx-auto mt-2 max-w-xs text-xs leading-relaxed opacity-55">
              This review identifies coupling, unclear boundaries, and scale
              hypotheses from repository evidence. It does not claim verified
              vulnerabilities or benchmarked bottlenecks.
            </p>
            <button
              onClick={review}
              className="mt-5 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-black transition hover:bg-amber-400"
            >
              Analyze architecture
            </button>
          </div>
        )}
        {loading && (
          <div className="flex items-center justify-center gap-2 py-12 text-xs opacity-70">
            <Loader2 size={16} className="animate-spin text-amber-400" />
            Reviewing graph evidence…
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
            {error}
          </div>
        )}
        {items && (
          <div className="space-y-3">
            {items.length === 0 && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-300">
                No high-confidence review hypotheses were found in the analyzed
                graph.
              </div>
            )}
            {items.map((item) => {
              const Icon = categoryIcon(item.category);
              return (
                <article
                  key={item.id}
                  className={`rounded-xl border p-3 ${isDark ? "border-neutral-800 bg-neutral-900/65" : "border-neutral-200 bg-neutral-50"}`}
                >
                  <div className="flex items-start gap-2">
                    <Icon
                      size={15}
                      className="mt-0.5 shrink-0 text-amber-400"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-xs font-bold">{item.title}</h3>
                        <span className="shrink-0 text-[10px] font-bold text-amber-400">
                          {Math.round(item.confidence * 100)}%
                        </span>
                      </div>
                      <div className="mt-2 space-y-1.5 text-[11px] leading-relaxed">
                        <p>
                          <strong>Observation:</strong> {item.observation}
                        </p>
                        <p>
                          <strong>Potential impact:</strong> {item.impact}
                        </p>
                        <p className="text-violet-300">
                          <strong>Suggested investigation:</strong>{" "}
                          {item.suggestion}
                        </p>
                        <p className="opacity-50">
                          <strong>Limitations:</strong> {item.limitations}
                        </p>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <button
                          onClick={() => onHighlight(item.nodeIds)}
                          className="rounded-lg bg-violet-500/15 px-2 py-1 text-[10px] text-violet-300"
                        >
                          Highlight evidence
                        </button>
                        {item.evidence.slice(0, 2).map((evidence) => (
                          <a
                            key={`${item.id}-${evidence.path}`}
                            href={evidence.githubUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 rounded-lg bg-neutral-500/10 px-2 py-1 text-[10px] opacity-70 hover:opacity-100"
                          >
                            <ExternalLink size={10} />
                            {evidence.path}
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-inherit p-3">
        {proposedGraph ? (
          <>
            <button
              onClick={() => setProposedGraph(null)}
              className="flex items-center gap-1 text-[11px] font-semibold opacity-60 hover:opacity-100"
            >
              <ArrowLeft size={13} />
              Keep original
            </button>
            <button
              onClick={() => onPreview(proposedGraph)}
              className="rounded-xl bg-violet-600 px-3 py-2 text-[11px] font-bold text-white hover:bg-violet-500"
            >
              Preview proposed branch
            </button>
          </>
        ) : (
          <span className="text-[10px] opacity-45">
            Original architecture stays unchanged.
          </span>
        )}
        <button
          onClick={onClose}
          className="rounded-xl px-3 py-2 text-[11px] font-semibold opacity-60 hover:bg-black/10 hover:opacity-100"
        >
          Close
        </button>
      </div>
    </aside>
  );
}
