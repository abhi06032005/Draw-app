"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  X,
  ArrowRight,
  Key,
  ExternalLink,
  ChevronDown,
  Layers,
  Cpu,
  Database,
  Cloud,
  Lock,
  GitBranch,
  Sliders,
  Check,
  RefreshCw,
  LayoutGrid
} from "lucide-react";
import axios from "axios";
import {
  parsePromptToSpec,
  specToExcalidrawElements,
  type ThemeStyle,
} from "@/lib/aiDiagramGenerator";

interface AIDiagramModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertElements: (elements: any[], mode: "append" | "replace") => void;
  theme: "light" | "dark";
}

interface TemplatePrompt {
  id: string;
  category: "Architecture" | "AI & ML" | "Data & Storage" | "Cloud & DevOps" | "Auth & Flows";
  title: string;
  desc: string;
  prompt: string;
  icon: string;
}

const CATEGORIES = [
  { id: "all", label: "All Templates", icon: LayoutGrid },
  { id: "Architecture", label: "Architecture", icon: Layers },
  { id: "AI & ML", label: "AI & ML", icon: Cpu },
  { id: "Data & Storage", label: "Data & Storage", icon: Database },
  { id: "Cloud & DevOps", label: "Cloud & DevOps", icon: Cloud },
  { id: "Auth & Flows", label: "Auth & Flows", icon: Lock },
] as const;

const TEMPLATE_PROMPTS: TemplatePrompt[] = [
  {
    id: "microservices",
    category: "Architecture",
    title: "Microservices Backend",
    desc: "API Gateway, Auth, User/Order Services, Kafka, Redis, and Multi-AZ DB",
    prompt: "Scalable microservices backend: React Clients, Cloudflare CDN & WAF, API Gateway, Clerk Auth, User Service, Order Service, Kafka Event Streaming, Async Worker, Redis Cluster, and PostgreSQL Multi-AZ",
    icon: "🏗️",
  },
  {
    id: "uber-system",
    category: "Architecture",
    title: "Ride-Sharing System Design",
    desc: "Rider/Driver apps, Geospatial Service, Dispatch Engine, and Trip DB",
    prompt: "Uber system architecture: Rider & Driver Apps, WebSocket Gateway, Location Ingestion Service (H3 Hexagonal Index), Redis Geospatial Store, Dispatch & Matching Engine, Dynamic Pricing Engine, Trip DB, and Kafka Event Hub",
    icon: "🚗",
  },
  {
    id: "rag-llm",
    category: "AI & ML",
    title: "RAG & LLM Inference Pipeline",
    desc: "Prompt Guard, Embeddings, Vector DB, Reranker, Foundation LLM, and Cache",
    prompt: "RAG architecture: User Prompt, Prompt Guard & Router, Embedding Generator, Vector DB (Pinecone/Qdrant), Cross-Encoder Reranker, Foundation LLM Engine (Gemini/GPT-4o), Semantic Cache, Streaming Response Handler, and Telemetry DB",
    icon: "🧠",
  },
  {
    id: "multi-agent",
    category: "AI & ML",
    title: "Multi-Agent Collaboration Network",
    desc: "Supervisor, Research Agent, Code Synthesis, Critic, and Vector Memory",
    prompt: "Autonomous multi-agent system: User Goal Input, Orchestration Supervisor, Code Researcher Agent, Sandbox Execution Worker, Critic & Verification Agent, Shared Vector Memory, and Output Synthesizer",
    icon: "🤖",
  },
  {
    id: "kafka-event",
    category: "Data & Storage",
    title: "Event-Driven Streaming Architecture",
    desc: "Event producers, Kafka topics, Schema Registry, Consumers, and TimescaleDB",
    prompt: "Event-driven data pipeline: IoT Sensors & Webhooks, Event Gateway, Apache Kafka Broker with Schema Registry, Flink Stream Processing, TimescaleDB Time-Series Store, and Real-Time Grafana Analytics",
    icon: "⚡",
  },
  {
    id: "cqrs-events",
    category: "Data & Storage",
    title: "CQRS & Event Sourcing Flow",
    desc: "Command Bus, Event Store, Projection Engine, and Read Model Cache",
    prompt: "CQRS & Event Sourcing architecture: API Client, Command Handler, Event Store Write DB, Event Bus Dispatcher, Read Projection Workers, Elasticsearch Read Model, and Redis Read Cache",
    icon: "🔄",
  },
  {
    id: "k8s-infra",
    category: "Cloud & DevOps",
    title: "Production Kubernetes (EKS)",
    desc: "AWS ALB, Ingress Controller, Pods (HPA), Aurora PostgreSQL, and Redis",
    prompt: "Production Kubernetes cloud infrastructure: Route 53 DNS, AWS ALB Load Balancer, Nginx Ingress Controller, Web Pods (HPA), API Pods, Async Worker Pods, Aurora PostgreSQL, ElastiCache Redis, and Amazon S3",
    icon: "☸️",
  },
  {
    id: "gitops-cicd",
    category: "Cloud & DevOps",
    title: "GitOps CI/CD Pipeline",
    desc: "GitHub PR, Automated Tests, Trivy Scanner, Docker Build, and ArgoCD",
    prompt: "Enterprise GitOps pipeline: GitHub Push / PR, GitHub Actions Runner, Automated Linter & Tests, Trivy Security Scanner, Docker Multi-Arch Build, Amazon ECR Registry, ArgoCD Operator, and Production K8s Cluster",
    icon: "🚀",
  },
  {
    id: "oauth-pkce",
    category: "Auth & Flows",
    title: "OAuth 2.0 & OIDC PKCE Flow",
    desc: "Browser client, PKCE challenge, Auth Server, Token Exchange, and JWT",
    prompt: "OAuth 2.0 & OIDC authentication flow: User Browser, Frontend App with PKCE Verifier, Identity Provider (Clerk/Google), Consent Check, Callback with Auth Code, Token Exchange Endpoint, RS256 JWT Issuance, and Verified Session",
    icon: "🔐",
  },
  {
    id: "stripe-checkout",
    category: "Auth & Flows",
    title: "Stripe Payment & Webhook Lifecycle",
    desc: "PaymentIntent, 3D Secure, Capture, Webhook Signature, and Receipt DB",
    prompt: "Stripe checkout and payment lifecycle: Shopper Checkout, Create PaymentIntent, Stripe Elements, 3D Secure Challenge, Stripe Capture, Webhook Signature Verification, Order DB, and Receipt Email",
    icon: "💳",
  },
];

const AVAILABLE_MODELS = [
  {
    id: "gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    provider: "Google AI",
    badge: "Recommended",
    desc: "Frontier reasoning & fastest structured diagrams",
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "OpenAI",
    badge: "Fast & Smart",
    desc: "OpenAI compact reasoning model",
  },
  {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "OpenAI",
    badge: "Flagship",
    desc: "OpenAI flagship technical illustrator",
  },
  {
    id: "llama-3.3-70b-versatile",
    name: "Llama 3.3 70B",
    provider: "Groq",
    badge: "Ultra Fast",
    desc: "Sub-400ms inference on Groq hardware",
  },
  {
    id: "sketio-neural-v3",
    name: "Offline Engine",
    provider: "Built-in",
    badge: "Zero-Config",
    desc: "Deterministic DAG layout & 20+ architectures",
  },
];

const STYLES: { id: ThemeStyle; name: string }[] = [
  { id: "modern", name: "Modern" },
  { id: "sketch", name: "Hand-Drawn" },
  { id: "enterprise", name: "Enterprise" },
  { id: "neon", name: "Neon" },
];

export function AIDiagramModal({
  isOpen,
  onClose,
  onInsertElements,
  theme,
}: AIDiagramModalProps) {
  const [prompt, setPrompt] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedModel, setSelectedModel] = useState("gemini-2.0-flash");
  const [style, setStyle] = useState<ThemeStyle>("modern");
  const [direction, setDirection] = useState<"horizontal" | "vertical">("horizontal");
  const [insertMode, setInsertMode] = useState<"append" | "replace">("replace");
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showApiKeyDrawer, setShowApiKeyDrawer] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);

  // Load API key from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedKey = localStorage.getItem("sketio_ai_api_key");
      if (savedKey) setApiKey(savedKey);
    }

    axios
      .get("/api/ai/generate-diagram")
      .then((res) => {
        if (res.data?.defaultModel) {
          setSelectedModel(res.data.defaultModel);
        }
      })
      .catch(() => {});
  }, []);

  const handleApiKeyChange = (val: string) => {
    setApiKey(val);
    if (typeof window !== "undefined") {
      if (val.trim()) {
        localStorage.setItem("sketio_ai_api_key", val.trim());
      } else {
        localStorage.removeItem("sketio_ai_api_key");
      }
    }
  };

  if (!isOpen) return null;

  const isDark = theme === "dark";

  const handleGenerate = async () => {
    const trimmed = prompt.trim();
    if (!trimmed) return;

    setIsGenerating(true);
    const activeModelObj = AVAILABLE_MODELS.find((m) => m.id === selectedModel);
    setStatusMessage(`Synthesizing diagram with ${activeModelObj?.name || selectedModel}…`);

    try {
      const res = await axios.post("/api/ai/generate-diagram", {
        prompt: trimmed,
        model: selectedModel,
        apiKey: apiKey.trim(),
        theme,
        style,
        direction,
        includeContainers: false,
      });

      if (res.data?.elements && res.data.elements.length > 0) {
        onInsertElements(res.data.elements, insertMode);
        onClose();
        return;
      }

      // Fallback to local engine
      const spec = parsePromptToSpec(trimmed);
      spec.direction = direction;
      const elements = specToExcalidrawElements(spec, theme, style, 100, 120, false);
      onInsertElements(elements, insertMode);
      onClose();
    } catch (e: any) {
      console.warn("AI Generation fallback to local engine:", e);
      const spec = parsePromptToSpec(trimmed);
      spec.direction = direction;
      const elements = specToExcalidrawElements(spec, theme, style, 100, 120, false);
      onInsertElements(elements, insertMode);
      onClose();
    } finally {
      setIsGenerating(false);
      setStatusMessage("");
    }
  };

  const filteredTemplates =
    selectedCategory === "all"
      ? TEMPLATE_PROMPTS
      : TEMPLATE_PROMPTS.filter((t) => t.category === selectedCategory);

  const activeModelMeta = AVAILABLE_MODELS.find((m) => m.id === selectedModel) || AVAILABLE_MODELS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className={`w-full max-w-2xl max-h-[90vh] rounded-2xl border shadow-2xl flex flex-col transition-all overflow-hidden ${
          isDark
            ? "bg-[#18181b] border-neutral-800 text-neutral-100"
            : "bg-white border-neutral-200 text-neutral-900"
        }`}
      >
        {/* ── 1. Top Header ───────────────────────────────────────────── */}
        <div className={`px-5 py-3.5 border-b flex items-center justify-between gap-4 ${
          isDark ? "border-neutral-800/80 bg-neutral-900/40" : "border-neutral-100 bg-neutral-50/50"
        }`}>
          {/* Title & Badge */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              isDark ? "bg-violet-600/20 text-violet-400 border border-violet-500/30" : "bg-violet-50 text-violet-600 border border-violet-200"
            }`}>
              <Sparkles size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold tracking-tight">AI Diagram Architect</h2>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-neutral-200/50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                  Clean Vector
                </span>
              </div>
              <p className="text-[11px] opacity-60">Turn natural language into clean, structured architecture diagrams.</p>
            </div>
          </div>

          {/* Model Selector & Close */}
          <div className="flex items-center gap-2 flex-shrink-0 relative">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowModelDropdown(!showModelDropdown)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  isDark
                    ? "bg-neutral-900 border-neutral-800 hover:border-neutral-700 text-neutral-300"
                    : "bg-white border-neutral-200 hover:border-neutral-300 text-neutral-700 shadow-sm"
                }`}
              >
                <span>{activeModelMeta?.name}</span>
                <ChevronDown size={13} className="opacity-50" />
              </button>

              {/* Model Picker Popover */}
              {showModelDropdown && (
                <div
                  className={`absolute right-0 top-full mt-1.5 w-60 rounded-xl border shadow-xl p-1 z-30 space-y-0.5 ${
                    isDark ? "bg-[#1f1f23] border-neutral-800 text-white" : "bg-white border-neutral-200 text-neutral-900"
                  }`}
                >
                  {AVAILABLE_MODELS.map((m) => {
                    const isSelected = selectedModel === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setSelectedModel(m.id);
                          setShowModelDropdown(false);
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                          isSelected
                            ? isDark
                              ? "bg-violet-600/20 text-violet-300 font-semibold"
                              : "bg-violet-50 text-violet-700 font-semibold"
                            : isDark
                            ? "hover:bg-neutral-800/60 text-neutral-300"
                            : "hover:bg-neutral-100 text-neutral-700"
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="font-medium truncate">{m.name}</div>
                          <div className="text-[10px] opacity-50 truncate">{m.provider}</div>
                        </div>
                        {isSelected && <Check size={14} className="text-violet-500" />}
                      </button>
                    );
                  })}
                  <div className={`pt-1 border-t mt-1 ${isDark ? "border-neutral-800" : "border-neutral-100"}`}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowModelDropdown(false);
                        setShowApiKeyDrawer(!showApiKeyDrawer);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] text-violet-500 hover:underline flex items-center gap-1.5"
                    >
                      <Key size={11} />
                      <span>{apiKey ? "Update Custom API Key" : "Add Custom API Key"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                isDark ? "hover:bg-neutral-800 text-neutral-400" : "hover:bg-neutral-100 text-neutral-500"
              }`}
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Optional API Key Drawer */}
        {showApiKeyDrawer && (
          <div className={`px-5 py-3 border-b text-xs space-y-2 ${
            isDark ? "bg-neutral-900/80 border-neutral-800" : "bg-neutral-50 border-neutral-200"
          }`}>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                Custom API Key ({activeModelMeta?.provider})
              </span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-violet-500 hover:underline flex items-center gap-1"
              >
                <span>Get free Gemini key</span>
                <ExternalLink size={10} />
              </a>
            </div>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => handleApiKeyChange(e.target.value)}
              placeholder="Paste Gemini (AIza...) or OpenAI (sk-...) key..."
              className={`w-full px-3 py-1.5 rounded-lg border font-mono text-xs focus:outline-none focus:ring-1 focus:ring-violet-500 transition-all ${
                isDark ? "bg-black/40 border-neutral-700 text-white" : "bg-white border-neutral-300 text-neutral-900"
              }`}
            />
            <p className="text-[10px] opacity-50">
              Key is stored securely in your browser. Leave blank to use server environment keys or the offline neural engine.
            </p>
          </div>
        )}

        {/* ── 2. Scrollable Body ───────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
          {/* Prompt Area (OpenAI ChatGPT style) */}
          <div className="space-y-1.5">
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your diagram in plain English (e.g. Scalable microservices with API Gateway, Clerk Auth, Kafka, Redis, and Postgres DB)..."
                rows={3}
                className={`w-full px-3.5 py-3 rounded-xl border text-sm font-normal focus:outline-none focus:ring-1 focus:ring-violet-500/80 transition-all resize-none ${
                  isDark
                    ? "bg-[#131316] border-neutral-800 text-white placeholder-neutral-500"
                    : "bg-white border-neutral-200 text-neutral-900 placeholder-neutral-400 shadow-sm"
                }`}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    handleGenerate();
                  }
                }}
              />
            </div>
          </div>

          {/* Categorized Template Tabs */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                Instant Diagram Categories
              </span>
              <span className="text-[11px] opacity-40">Click any preset to load prompt</span>
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                const IconComponent = cat.icon;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                      isSelected
                        ? isDark
                          ? "bg-violet-600 text-white shadow-sm"
                          : "bg-neutral-900 text-white shadow-sm"
                        : isDark
                        ? "bg-neutral-800/80 hover:bg-neutral-700/80 text-neutral-300"
                        : "bg-neutral-100 hover:bg-neutral-200 text-neutral-700"
                    }`}
                  >
                    <IconComponent size={12} />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Categorized Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filteredTemplates.map((t) => {
                const isCurrent = prompt === t.prompt;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setPrompt(t.prompt)}
                    className={`text-left p-3 rounded-xl border transition-all flex items-start gap-2.5 group ${
                      isCurrent
                        ? isDark
                          ? "border-violet-500 bg-violet-600/10 ring-1 ring-violet-500/40"
                          : "border-neutral-900 bg-neutral-50 ring-1 ring-neutral-900/20"
                        : isDark
                        ? "bg-[#141417] border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800/40"
                        : "bg-white border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 shadow-sm"
                    }`}
                  >
                    <span className="text-base flex-shrink-0 mt-0.5">{t.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold tracking-tight text-neutral-900 dark:text-neutral-100 line-clamp-1">
                        {t.title}
                      </div>
                      <div className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-1 mt-0.5">
                        {t.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Clean Controls (Direction, Style, Insertion Mode) */}
          <div className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs ${
            isDark ? "bg-neutral-900/50 border-neutral-800" : "bg-neutral-50 border-neutral-200"
          }`}>
            {/* Direction */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] opacity-60 font-medium">Flow:</span>
              <div className="inline-flex rounded-lg border p-0.5 bg-neutral-200/50 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700">
                <button
                  type="button"
                  onClick={() => setDirection("horizontal")}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                    direction === "horizontal"
                      ? isDark
                        ? "bg-neutral-700 text-white shadow-xs"
                        : "bg-white text-neutral-900 shadow-xs"
                      : "opacity-60 hover:opacity-100"
                  }`}
                >
                  Horizontal ➔
                </button>
                <button
                  type="button"
                  onClick={() => setDirection("vertical")}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                    direction === "vertical"
                      ? isDark
                        ? "bg-neutral-700 text-white shadow-xs"
                        : "bg-white text-neutral-900 shadow-xs"
                      : "opacity-60 hover:opacity-100"
                  }`}
                >
                  Vertical ⬇
                </button>
              </div>
            </div>

            {/* Style */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] opacity-60 font-medium">Style:</span>
              <div className="inline-flex rounded-lg border p-0.5 bg-neutral-200/50 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700">
                {STYLES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStyle(s.id)}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                      style === s.id
                        ? isDark
                          ? "bg-neutral-700 text-white shadow-xs"
                          : "bg-white text-neutral-900 shadow-xs"
                        : "opacity-60 hover:opacity-100"
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Placement */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer text-[11px]">
                <input
                  type="radio"
                  name="modalInsertMode"
                  value="replace"
                  checked={insertMode === "replace"}
                  onChange={() => setInsertMode("replace")}
                  className="accent-violet-600"
                />
                <span>Replace</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-[11px]">
                <input
                  type="radio"
                  name="modalInsertMode"
                  value="append"
                  checked={insertMode === "append"}
                  onChange={() => setInsertMode("append")}
                  className="accent-violet-600"
                />
                <span>Append</span>
              </label>
            </div>
          </div>
        </div>

        {/* ── 3. Footer ────────────────────────────────────────────────── */}
        <div className={`px-5 py-3 border-t flex items-center justify-between gap-3 ${
          isDark ? "border-neutral-800 bg-neutral-900/40" : "border-neutral-100 bg-neutral-50/50"
        }`}>
          <div className="text-xs">
            {isGenerating ? (
              <div className="flex items-center gap-2 text-violet-500 font-medium">
                <span className="w-2 h-2 rounded-full bg-violet-500 animate-ping" />
                <span>{statusMessage}</span>
              </div>
            ) : (
              <span className="text-[11px] opacity-50">
                Powered by <strong>{activeModelMeta?.name}</strong> &middot; Press <kbd className="font-mono bg-neutral-200 dark:bg-neutral-800 px-1 py-0.5 rounded text-[10px]">Ctrl+Enter</kbd> to generate
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isGenerating}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                isDark ? "hover:bg-neutral-800 text-neutral-400 hover:text-white" : "hover:bg-neutral-100 text-neutral-600"
              }`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 dark:text-neutral-900 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40 shadow-sm transition-all active:scale-98"
            >
              {isGenerating ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Generating…</span>
                </>
              ) : (
                <>
                  <Sparkles size={13} />
                  <span>Generate Diagram</span>
                  <ArrowRight size={13} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AIDiagramModal;
