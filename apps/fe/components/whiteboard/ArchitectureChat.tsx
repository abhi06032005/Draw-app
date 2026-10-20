"use client";

import { useState } from "react";
import { Bot, Loader2, Send, Sparkles, X } from "lucide-react";
import type { ArchitectureGraph } from "@/lib/architectureTypes";

interface ArchitectureChatProps {
  graph: ArchitectureGraph;
  theme: "light" | "dark";
  onClose: () => void;
  onHighlight: (nodeIds: string[]) => void;
}

const SUGGESTIONS = [
  "How does authentication work?",
  "Where are API requests handled?",
  "Explain the realtime flow",
  "Which components use the database?",
];

export function ArchitectureChat({
  graph,
  theme,
  onClose,
  onHighlight,
}: ArchitectureChatProps) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [references, setReferences] = useState<string[]>([]);
  const [flowPath, setFlowPath] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const isDark = theme === "dark";

  const ask = async (customQuestion?: string) => {
    const q = (customQuestion || question).trim();
    if (!q || loading) return;
    setLoading(true);
    try {
      const response = await fetch("/api/architecture/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, graph }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Chat request failed");
      setAnswer(data.answer || "No grounded answer was returned.");
      setReferences(data.references || []);
      setFlowPath(data.flowPath || []);
      if (data.flowPath && data.flowPath.length > 0) {
        onHighlight(data.flowPath);
      } else if (data.references && data.references.length > 0) {
        onHighlight(data.references);
      }
    } catch (error) {
      setAnswer(
        error instanceof Error ? error.message : "Chat request failed.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside
      className={`absolute bottom-3 left-3 z-40 flex max-h-[min(620px,calc(100vh-100px))] w-[min(410px,calc(100vw-24px))] flex-col overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-xl ${isDark ? "border-neutral-800 bg-[#151519]/95 text-white" : "border-neutral-200 bg-white/95 text-neutral-900"}`}
    >
      <div className="flex items-center justify-between border-b border-inherit px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-600 text-white">
            <Bot size={16} />
          </div>
          <div>
            <div className="text-xs font-bold">Architecture Guide</div>
            <div className="text-[10px] opacity-50">
              Grounded in {graph.repository.fullName}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1 opacity-60 hover:bg-black/10 hover:opacity-100"
        >
          <X size={15} />
        </button>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((item) => (
            <button
              key={item}
              onClick={() => {
                setQuestion(item);
                ask(item);
              }}
              className="rounded-full bg-violet-500/10 px-2.5 py-1.5 text-[10px] text-violet-300 hover:bg-violet-500/20"
            >
              {item}
            </button>
          ))}
        </div>
        {answer ? (
          <div
            className={`rounded-xl border p-3 text-xs leading-relaxed whitespace-pre-wrap ${isDark ? "border-neutral-800 bg-neutral-900/70" : "border-neutral-200 bg-neutral-50"}`}
          >
            {answer}

            {flowPath.length > 0 && (
              <div className="mt-3 p-2.5 rounded-lg border border-violet-500/30 bg-violet-500/10">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-violet-300">
                    Traced Flow Sequence ({flowPath.length} nodes)
                  </span>
                  <button
                    onClick={() => onHighlight(flowPath)}
                    className="rounded bg-violet-600 px-2 py-0.5 text-[10px] font-bold text-white shadow hover:bg-violet-500"
                  >
                    Highlight on Canvas
                  </button>
                </div>
              </div>
            )}

            <div className="mt-3 flex flex-wrap gap-1.5">
              {references.map((id) => (
                <button
                  key={id}
                  onClick={() => onHighlight([id])}
                  className="rounded-md bg-violet-500/15 px-2 py-1 text-[10px] text-violet-300 hover:bg-violet-500/25"
                >
                  Highlight{" "}
                  {graph.nodes.find((node) => node.id === id)?.name || id}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="py-8 text-center">
            <Sparkles size={22} className="mx-auto mb-2 text-violet-400" />
            <p className="text-xs opacity-55">
              Ask about flows, dependencies, auth, data, or change impact.
            </p>
          </div>
        )}
      </div>
      <div
        className={`border-t border-inherit p-3 ${isDark ? "bg-neutral-900/40" : "bg-neutral-50"}`}
      >
        <div
          className={`flex items-end gap-2 rounded-xl border p-2 ${isDark ? "border-neutral-700 bg-black/20" : "border-neutral-200 bg-white"}`}
        >
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                ask();
              }
            }}
            placeholder="Ask about this architecture…"
            rows={2}
            className="min-h-[44px] flex-1 resize-none bg-transparent px-1 py-1 text-xs outline-none"
          />
          <button
            onClick={() => ask()}
            disabled={loading || !question.trim()}
            className="rounded-lg bg-violet-600 p-2 text-white transition hover:bg-violet-500 disabled:opacity-40"
          >
            {loading ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Send size={15} />
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}
