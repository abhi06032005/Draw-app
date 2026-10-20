"use client";

import { useState } from "react";
import { ExternalLink, FileCode2, GitBranch, Search, X } from "lucide-react";
import type {
  ArchitectureGraph,
  ArchitectureNode,
  ArchitectureNodeType,
} from "@/lib/architectureTypes";

interface ArchitectureInspectorProps {
  graph: ArchitectureGraph | null;
  selectedNode: ArchitectureNode | null;
  theme: "light" | "dark";
  onClose: () => void;
  onSelectNode: (node: ArchitectureNode | null) => void;
}

const FILTERS: Array<{ id: ArchitectureNodeType | "all"; label: string }> = [
  { id: "all", label: "All" },
  { id: "frontend", label: "Frontend" },
  { id: "api", label: "API" },
  { id: "service", label: "Services" },
  { id: "database", label: "Data" },
  { id: "infrastructure", label: "Infra" },
];

export function ArchitectureInspector({
  graph,
  selectedNode,
  theme,
  onClose,
  onSelectNode,
}: ArchitectureInspectorProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ArchitectureNodeType | "all">("all");
  if (!graph) return null;
  const isDark = theme === "dark";
  const visibleNodes = graph.nodes.filter(
    (node) =>
      (filter === "all" || node.type === filter) &&
      `${node.name} ${node.description} ${node.files.join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const connected = selectedNode
    ? (graph.edges
        .filter(
          (edge) =>
            edge.source === selectedNode.id || edge.target === selectedNode.id,
        )
        .map((edge) =>
          edge.source === selectedNode.id ? edge.target : edge.source,
        )
        .map((id) => graph.nodes.find((node) => node.id === id))
        .filter(Boolean) as ArchitectureNode[])
    : [];

  const [activeTab, setActiveTab] = useState<"explorer" | "metadata">("explorer");
  const [expandedSnippets, setExpandedSnippets] = useState<Record<string, boolean>>({});

  const toggleSnippet = (key: string) => {
    setExpandedSnippets((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <aside
      className={`absolute right-3 top-3 bottom-3 z-40 flex w-[min(420px,calc(100vw-24px))] flex-col overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-xl ${isDark ? "border-neutral-800 bg-[#151519]/95 text-white" : "border-neutral-200 bg-white/95 text-neutral-900"}`}
    >
      <div className="flex items-start justify-between border-b border-inherit px-4 py-3.5">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold">
            <GitBranch size={15} className="text-violet-400" />
            <a
              href={graph.repository.htmlUrl}
              target="_blank"
              rel="noreferrer"
              className="hover:underline flex items-center gap-1"
            >
              {graph.repository.fullName}
              <ExternalLink size={12} className="opacity-50" />
            </a>
          </div>
          <div className="mt-1 text-[11px] opacity-55">
            {graph.nodes.length} nodes · {graph.edges.length} edges ·{" "}
            <span className="font-mono">{graph.repository.commitSha.slice(0, 7)}</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1 opacity-60 hover:bg-black/10 hover:opacity-100"
        >
          <X size={16} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-inherit bg-black/10 px-4 text-xs font-semibold">
        <button
          onClick={() => {
            setActiveTab("explorer");
          }}
          className={`py-2 px-3 border-b-2 transition ${
            activeTab === "explorer"
              ? "border-violet-500 text-violet-400"
              : "border-transparent opacity-60 hover:opacity-100"
          }`}
        >
          {selectedNode ? "Component" : "Explorer"}
        </button>
        <button
          onClick={() => setActiveTab("metadata")}
          className={`py-2 px-3 border-b-2 transition ${
            activeTab === "metadata"
              ? "border-violet-500 text-violet-400"
              : "border-transparent opacity-60 hover:opacity-100"
          }`}
        >
          Repo & Stats
        </button>
      </div>

      {activeTab === "metadata" ? (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-wider opacity-50 mb-1">
              Repository Overview
            </h4>
            <p className="opacity-80 leading-relaxed">
              {graph.repository.description || "No description provided."}
            </p>
          </div>

          <div className="rounded-xl border border-inherit p-3 space-y-2 bg-black/10">
            <div className="flex justify-between">
              <span className="opacity-60">Default Branch:</span>
              <span className="font-semibold font-mono">{graph.repository.defaultBranch}</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-60">Commit SHA:</span>
              <span className="font-semibold font-mono text-violet-400">{graph.repository.commitSha.slice(0, 10)}</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-60">Analysis Depth:</span>
              <span className="font-semibold capitalize text-amber-400">{graph.depth}</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-60">Files Analyzed:</span>
              <span className="font-semibold">{graph.stats.filesAnalyzed} of {graph.stats.filesConsidered}</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-60">Architectural Nodes:</span>
              <span className="font-semibold">{graph.nodes.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-60">Connections:</span>
              <span className="font-semibold">{graph.edges.length}</span>
            </div>
          </div>

          {Object.keys(graph.repository.languages || {}).length > 0 && (
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-wider opacity-50 mb-2">
                Languages Detected
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(graph.repository.languages).map(([lang, bytes]) => (
                  <span
                    key={lang}
                    className="rounded-lg bg-violet-500/10 px-2 py-1 text-[11px] text-violet-300 font-medium"
                  >
                    {lang} ({Math.round((bytes as number) / 1024)} KB)
                  </span>
                ))}
              </div>
            </div>
          )}

          {graph.warnings.length > 0 && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-[11px] text-amber-300">
              <div className="font-bold mb-1">Analysis Notices</div>
              <ul className="list-disc pl-4 space-y-1">
                {graph.warnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : !selectedNode ? (
        <>
          <div className="space-y-3 border-b border-inherit p-4">
            <div
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${isDark ? "border-neutral-800 bg-black/20" : "border-neutral-200 bg-neutral-50"}`}
            >
              <Search size={14} className="opacity-45" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search components or files"
                className="min-w-0 flex-1 bg-transparent text-xs outline-none"
              />
            </div>
            <div className="flex gap-1 overflow-x-auto no-scrollbar">
              {FILTERS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setFilter(item.id)}
                  className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold ${filter === item.id ? "bg-violet-600 text-white" : isDark ? "bg-neutral-900 text-neutral-400" : "bg-neutral-100 text-neutral-600"}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {visibleNodes.map((node) => (
              <button
                key={node.id}
                onClick={() => onSelectNode(node)}
                className={`mb-2 w-full rounded-xl border p-3 text-left transition hover:-translate-y-0.5 ${isDark ? "border-neutral-800 bg-neutral-900/60 hover:border-violet-500/50" : "border-neutral-200 bg-white hover:border-violet-300"}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-xs font-bold">
                    {node.name}
                  </span>
                  <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[9px] font-bold uppercase text-violet-400">
                    {node.type}
                  </span>
                </div>
                <div className="mt-1 line-clamp-2 text-[11px] opacity-55">
                  {node.description}
                </div>
                <div className="mt-2 flex items-center gap-1 text-[10px] opacity-45">
                  <FileCode2 size={11} />
                  {node.files.length} evidence file
                  {node.files.length === 1 ? "" : "s"}
                </div>
              </button>
            ))}
            {visibleNodes.length === 0 && (
              <div className="p-8 text-center text-xs opacity-50">
                No architecture components match that search.
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex-1 overflow-y-auto p-4">
          <button
            onClick={() => onSelectNode(null)}
            className="mb-4 text-[11px] font-semibold text-violet-400 hover:underline"
          >
            ← Back to components list
          </button>
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold">{selectedNode.name}</h3>
              <span className="rounded-full bg-violet-500/10 px-2 py-1 text-[9px] font-bold uppercase text-violet-400">
                {selectedNode.type}
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed opacity-65">
              {selectedNode.description}
            </p>
            {selectedNode.technology && (
              <p className="mt-2 text-[11px] font-semibold text-violet-300">
                {selectedNode.technology}
              </p>
            )}
          </div>
          <section className="mb-5">
            <h4 className="mb-2 text-[10px] font-bold uppercase tracking-wider opacity-45">
              Confidence
            </h4>
            <div className="flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-800">
                <div
                  className="h-full rounded-full bg-violet-500"
                  style={{
                    width: `${Math.round(selectedNode.confidence * 100)}%`,
                  }}
                />
              </div>
              <span className="text-[10px] font-bold">
                {Math.round(selectedNode.confidence * 100)}%{" "}
                {selectedNode.inferred ? "inferred" : "confirmed"}
              </span>
            </div>
          </section>
          {connected.length > 0 && (
            <section className="mb-5">
              <h4 className="mb-2 text-[10px] font-bold uppercase tracking-wider opacity-45">
                Connected components ({connected.length})
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {connected.map((node) => (
                  <button
                    key={node.id}
                    onClick={() => onSelectNode(node)}
                    className="rounded-lg bg-violet-500/10 px-2 py-1 text-[10px] text-violet-300 hover:bg-violet-500/20"
                  >
                    {node.name}
                  </button>
                ))}
              </div>
            </section>
          )}
          <section>
            <h4 className="mb-2 text-[10px] font-bold uppercase tracking-wider opacity-45">
              Source evidence ({selectedNode.evidence.length})
            </h4>
            <div className="space-y-3">
              {selectedNode.evidence.map((item, index) => {
                const snippetKey = `${item.path}-${index}`;
                const isSnippetExpanded = Boolean(expandedSnippets[snippetKey]);
                return (
                  <div
                    key={snippetKey}
                    className={`rounded-xl border p-3 ${isDark ? "border-neutral-800 bg-neutral-900/60" : "border-neutral-200 bg-neutral-50"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 min-w-0">
                        <FileCode2
                          size={14}
                          className="mt-0.5 shrink-0 text-violet-400"
                        />
                        <div className="min-w-0">
                          <a
                            href={item.githubUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="truncate text-[11px] font-bold hover:underline text-violet-300 block"
                          >
                            {item.path}
                          </a>
                          <div className="mt-0.5 text-[10px] opacity-50 flex items-center gap-1.5">
                            <span>
                              {item.lineStart
                                ? `Lines ${item.lineStart}${item.lineEnd && item.lineEnd !== item.lineStart ? `–${item.lineEnd}` : ""}`
                                : "File-level evidence"}
                            </span>
                            {item.symbol && (
                              <span className="font-mono bg-violet-500/15 text-violet-300 px-1 py-0.2 rounded text-[9px]">
                                {item.symbol}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <a
                        href={item.githubUrl}
                        target="_blank"
                        rel="noreferrer"
                        title="View on GitHub"
                        className="opacity-50 hover:opacity-100 p-1"
                      >
                        <ExternalLink size={12} />
                      </a>
                    </div>
                    <div className="mt-2 text-[10px] leading-relaxed opacity-70">
                      {item.reason}
                    </div>

                    {item.snippet && (
                      <div className="mt-2.5">
                        <button
                          type="button"
                          onClick={() => toggleSnippet(snippetKey)}
                          className="text-[10px] font-semibold text-violet-400 hover:underline mb-1.5"
                        >
                          {isSnippetExpanded ? "Hide source snippet" : "Show source snippet"}
                        </button>
                        {isSnippetExpanded && (
                          <pre
                            className={`p-2.5 rounded-lg text-[10px] font-mono overflow-x-auto border ${
                              isDark
                                ? "bg-black/60 border-neutral-800 text-neutral-300"
                                : "bg-neutral-100 border-neutral-200 text-neutral-800"
                            }`}
                          >
                            <code>{item.snippet}</code>
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </aside>
  );
}
