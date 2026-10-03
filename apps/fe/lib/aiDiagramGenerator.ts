/**
 * Sketio Ultra-Neural AI Diagram Generator Engine v3.1
 * Converts natural language prompts and architectures into high-fidelity,
 * beautifully interconnected Sketio / Excalidraw whiteboards with clean
 * straight arrows, zero overlapping, and NO background grey container boxes.
 */

export type NodeType =
  | "client"
  | "service"
  | "database"
  | "cache"
  | "queue"
  | "decision"
  | "cloud"
  | "security"
  | "worker"
  | "storage"
  | "ai"
  | "process";

export interface DiagramNode {
  id: string;
  label: string;
  subtext?: string;
  type: NodeType;
  tier: number;
  row?: number;
  col?: number;
}

export interface DiagramEdge {
  from: string;
  to: string;
  label?: string;
  style?: "solid" | "dashed";
  bidirectional?: boolean;
}

export interface ParsedDiagramSpec {
  title: string;
  type: "architecture" | "flowchart" | "pipeline" | "mindmap" | "cloud" | "erd" | "network";
  direction?: "horizontal" | "vertical";
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

export type ThemeStyle = "modern" | "neon" | "sketch" | "enterprise";

export interface PaletteColors {
  bg: string;
  stroke: string;
  text: string;
  subtext: string;
}

export interface ThemePalette {
  client: PaletteColors;
  service: PaletteColors;
  database: PaletteColors;
  cache: PaletteColors;
  queue: PaletteColors;
  decision: PaletteColors;
  cloud: PaletteColors;
  security: PaletteColors;
  worker: PaletteColors;
  storage: PaletteColors;
  ai: PaletteColors;
  process: PaletteColors;
  edge: string;
  edgeLabelBg: string;
  edgeLabelText: string;
}

export const THEME_PALETTES: Record<ThemeStyle, { dark: ThemePalette; light: ThemePalette }> = {
  modern: {
    dark: {
      client: { bg: "#1e293b", stroke: "#38bdf8", text: "#f0f9ff", subtext: "#7dd3fc" },
      service: { bg: "#1e1b4b", stroke: "#818cf8", text: "#e0e7ff", subtext: "#a5b4fc" },
      database: { bg: "#022c22", stroke: "#34d399", text: "#ecfdf5", subtext: "#6ee7b7" },
      cache: { bg: "#134e4a", stroke: "#2dd4bf", text: "#f0fdfa", subtext: "#5eead4" },
      queue: { bg: "#451a03", stroke: "#fbbf24", text: "#fffbeb", subtext: "#fde68a" },
      decision: { bg: "#500724", stroke: "#f472b6", text: "#fdf2f8", subtext: "#fbcfe8" },
      cloud: { bg: "#083344", stroke: "#22d3ee", text: "#ecfeff", subtext: "#67e8f9" },
      security: { bg: "#3b0764", stroke: "#c084fc", text: "#faf5ff", subtext: "#d8b4fe" },
      worker: { bg: "#1c1917", stroke: "#a8a29e", text: "#fafaf9", subtext: "#d6d3d1" },
      storage: { bg: "#14532d", stroke: "#4ade80", text: "#f0fdf4", subtext: "#86efac" },
      ai: { bg: "#4a044e", stroke: "#e879f9", text: "#fdf4ff", subtext: "#f0abfc" },
      process: { bg: "#172554", stroke: "#60a5fa", text: "#eff6ff", subtext: "#93c5fd" },
      edge: "#94a3b8",
      edgeLabelBg: "#0f172a",
      edgeLabelText: "#38bdf8",
    },
    light: {
      client: { bg: "#e0f2fe", stroke: "#0284c7", text: "#0369a1", subtext: "#075985" },
      service: { bg: "#e0e7ff", stroke: "#4f46e5", text: "#3730a3", subtext: "#312e81" },
      database: { bg: "#d1fae5", stroke: "#059669", text: "#065f46", subtext: "#064e3b" },
      cache: { bg: "#ccfbf1", stroke: "#0d9488", text: "#115e59", subtext: "#134e4a" },
      queue: { bg: "#fef3c7", stroke: "#d97706", text: "#92400e", subtext: "#78350f" },
      decision: { bg: "#fce7f3", stroke: "#db2777", text: "#9d174d", subtext: "#831843" },
      cloud: { bg: "#cffafe", stroke: "#0891b2", text: "#155e75", subtext: "#164e63" },
      security: { bg: "#f3e8ff", stroke: "#9333ea", text: "#6b21a8", subtext: "#581c87" },
      worker: { bg: "#f5f5f4", stroke: "#78716c", text: "#44403c", subtext: "#292524" },
      storage: { bg: "#dcfce7", stroke: "#16a34a", text: "#166534", subtext: "#14532d" },
      ai: { bg: "#fae8ff", stroke: "#c026d3", text: "#86198f", subtext: "#701a75" },
      process: { bg: "#dbeafe", stroke: "#2563eb", text: "#1e40af", subtext: "#1e3a8a" },
      edge: "#475569",
      edgeLabelBg: "#ffffff",
      edgeLabelText: "#0284c7",
    },
  },
  neon: {
    dark: {
      client: { bg: "#001b3a", stroke: "#00f0ff", text: "#e0ffff", subtext: "#00f0ff" },
      service: { bg: "#1f003b", stroke: "#ff007f", text: "#ffe0f0", subtext: "#ff70b8" },
      database: { bg: "#003020", stroke: "#00ff88", text: "#e0ffef", subtext: "#00ff88" },
      cache: { bg: "#003333", stroke: "#00ffd5", text: "#e0ffff", subtext: "#00ffd5" },
      queue: { bg: "#3a2500", stroke: "#ffb703", text: "#fff8e7", subtext: "#ffb703" },
      decision: { bg: "#360017", stroke: "#ff0055", text: "#ffe6ee", subtext: "#ff0055" },
      cloud: { bg: "#002b3d", stroke: "#00e5ff", text: "#e0f7fa", subtext: "#00e5ff" },
      security: { bg: "#28004d", stroke: "#bf00ff", text: "#f6e6ff", subtext: "#bf00ff" },
      worker: { bg: "#1c1c24", stroke: "#9d9df0", text: "#ffffff", subtext: "#9d9df0" },
      storage: { bg: "#003b22", stroke: "#25f479", text: "#eafff2", subtext: "#25f479" },
      ai: { bg: "#36003b", stroke: "#f700ff", text: "#ffeaff", subtext: "#f700ff" },
      process: { bg: "#081033", stroke: "#3d7eff", text: "#eaf0ff", subtext: "#3d7eff" },
      edge: "#00e5ff",
      edgeLabelBg: "#0a0a14",
      edgeLabelText: "#00f0ff",
    },
    light: {
      client: { bg: "#e0f7ff", stroke: "#0099cc", text: "#004d66", subtext: "#007399" },
      service: { bg: "#ffe6f2", stroke: "#d9006c", text: "#660033", subtext: "#99004d" },
      database: { bg: "#e6fffa", stroke: "#00b36b", text: "#004d2e", subtext: "#00804d" },
      cache: { bg: "#e6ffff", stroke: "#00b3a4", text: "#004d46", subtext: "#008077" },
      queue: { bg: "#fff7e6", stroke: "#cc8800", text: "#664400", subtext: "#996600" },
      decision: { bg: "#ffe6ec", stroke: "#cc0044", text: "#660022", subtext: "#990033" },
      cloud: { bg: "#e6f9ff", stroke: "#00a3cc", text: "#004759", subtext: "#006b80" },
      security: { bg: "#fae6ff", stroke: "#9900cc", text: "#440066", subtext: "#660080" },
      worker: { bg: "#f0f0f5", stroke: "#666699", text: "#2e2e42", subtext: "#4d4d73" },
      storage: { bg: "#e6fff0", stroke: "#00b34d", text: "#004d21", subtext: "#008037" },
      ai: { bg: "#ffe6ff", stroke: "#b300b3", text: "#4d004d", subtext: "#800080" },
      process: { bg: "#e6efff", stroke: "#0055ff", text: "#002b80", subtext: "#0040bf" },
      edge: "#0055ff",
      edgeLabelBg: "#ffffff",
      edgeLabelText: "#0040bf",
    },
  },
  sketch: {
    dark: {
      client: { bg: "#2d3748", stroke: "#cbd5e0", text: "#f7fafc", subtext: "#a0aec0" },
      service: { bg: "#2c3e50", stroke: "#e2e8f0", text: "#ffffff", subtext: "#cbd5e0" },
      database: { bg: "#234e52", stroke: "#81e6d9", text: "#e6fffa", subtext: "#b2f5ea" },
      cache: { bg: "#285e61", stroke: "#4fd1c5", text: "#e6fffa", subtext: "#81e6d9" },
      queue: { bg: "#744210", stroke: "#f6ad55", text: "#fffaf0", subtext: "#fbd38d" },
      decision: { bg: "#702459", stroke: "#f687b3", text: "#fff5f7", subtext: "#fbb6ce" },
      cloud: { bg: "#2a4365", stroke: "#63b3ed", text: "#ebf8ff", subtext: "#90cdf4" },
      security: { bg: "#44337a", stroke: "#b794f4", text: "#faf5ff", subtext: "#d6bcfa" },
      worker: { bg: "#1a202c", stroke: "#a0aec0", text: "#edf2f7", subtext: "#cbd5e0" },
      storage: { bg: "#22543d", stroke: "#68d391", text: "#f0fff4", subtext: "#9ae6b4" },
      ai: { bg: "#553c9a", stroke: "#d6bcfa", text: "#faf5ff", subtext: "#e9d8fd" },
      process: { bg: "#2b6cb0", stroke: "#90cdf4", text: "#ebf8ff", subtext: "#bee3f8" },
      edge: "#cbd5e0",
      edgeLabelBg: "#1a202c",
      edgeLabelText: "#f7fafc",
    },
    light: {
      client: { bg: "#edf2f7", stroke: "#4a5568", text: "#1a202c", subtext: "#4a5568" },
      service: { bg: "#ebf8ff", stroke: "#2b6cb0", text: "#1a365d", subtext: "#2c5282" },
      database: { bg: "#e6fffa", stroke: "#234e52", text: "#1d4044", subtext: "#285e61" },
      cache: { bg: "#e6fffa", stroke: "#285e61", text: "#234e52", subtext: "#319795" },
      queue: { bg: "#fffaf0", stroke: "#744210", text: "#5f370e", subtext: "#975a16" },
      decision: { bg: "#fff5f7", stroke: "#702459", text: "#521b41", subtext: "#97266d" },
      cloud: { bg: "#ebf8ff", stroke: "#2a4365", text: "#1a2b42", subtext: "#2b6cb0" },
      security: { bg: "#faf5ff", stroke: "#44337a", text: "#2f2254", subtext: "#553c9a" },
      worker: { bg: "#f7fafc", stroke: "#4a5568", text: "#2d3748", subtext: "#718096" },
      storage: { bg: "#f0fff4", stroke: "#22543d", text: "#1c4532", subtext: "#276749" },
      ai: { bg: "#faf5ff", stroke: "#553c9a", text: "#32235c", subtext: "#6b46c1" },
      process: { bg: "#ebf8ff", stroke: "#3182ce", text: "#2a4365", subtext: "#2b6cb0" },
      edge: "#4a5568",
      edgeLabelBg: "#ffffff",
      edgeLabelText: "#2d3748",
    },
  },
  enterprise: {
    dark: {
      client: { bg: "#0f172a", stroke: "#38bdf8", text: "#f8fafc", subtext: "#94a3b8" },
      service: { bg: "#1e293b", stroke: "#60a5fa", text: "#f8fafc", subtext: "#94a3b8" },
      database: { bg: "#0f231e", stroke: "#34d399", text: "#f0fdf4", subtext: "#86efac" },
      cache: { bg: "#112a2a", stroke: "#2dd4bf", text: "#f0fdfa", subtext: "#5eead4" },
      queue: { bg: "#2a1c0d", stroke: "#fbbf24", text: "#fffbeb", subtext: "#fde68a" },
      decision: { bg: "#2b101c", stroke: "#f472b6", text: "#fdf2f8", subtext: "#fbcfe8" },
      cloud: { bg: "#082636", stroke: "#22d3ee", text: "#ecfeff", subtext: "#67e8f9" },
      security: { bg: "#221338", stroke: "#c084fc", text: "#faf5ff", subtext: "#d8b4fe" },
      worker: { bg: "#18181b", stroke: "#a1a1aa", text: "#fafafa", subtext: "#71717a" },
      storage: { bg: "#0f271a", stroke: "#4ade80", text: "#f0fdf4", subtext: "#86efac" },
      ai: { bg: "#280f2d", stroke: "#e879f9", text: "#fdf4ff", subtext: "#f0abfc" },
      process: { bg: "#172554", stroke: "#3b82f6", text: "#eff6ff", subtext: "#93c5fd" },
      edge: "#64748b",
      edgeLabelBg: "#0f172a",
      edgeLabelText: "#38bdf8",
    },
    light: {
      client: { bg: "#f8fafc", stroke: "#0284c7", text: "#0f172a", subtext: "#475569" },
      service: { bg: "#f1f5f9", stroke: "#2563eb", text: "#0f172a", subtext: "#475569" },
      database: { bg: "#f0fdf4", stroke: "#16a34a", text: "#14532d", subtext: "#166534" },
      cache: { bg: "#f0fdfa", stroke: "#0d9488", text: "#115e59", subtext: "#134e4a" },
      queue: { bg: "#fffbeb", stroke: "#d97706", text: "#78350f", subtext: "#92400e" },
      decision: { bg: "#fdf2f8", stroke: "#db2777", text: "#831843", subtext: "#9d174d" },
      cloud: { bg: "#ecfeff", stroke: "#0891b2", text: "#164e63", subtext: "#155e75" },
      security: { bg: "#faf5ff", stroke: "#9333ea", text: "#581c87", subtext: "#6b21a8" },
      worker: { bg: "#fafafa", stroke: "#52525b", text: "#27272a", subtext: "#52525b" },
      storage: { bg: "#f0fdf4", stroke: "#15803d", text: "#14532d", subtext: "#166534" },
      ai: { bg: "#fdf4ff", stroke: "#c026d3", text: "#701a75", subtext: "#86198f" },
      process: { bg: "#eff6ff", stroke: "#2563eb", text: "#1e3a8a", subtext: "#1e40af" },
      edge: "#475569",
      edgeLabelBg: "#ffffff",
      edgeLabelText: "#0284c7",
    },
  },
};

function generateId(): string {
  return "el_" + Math.random().toString(36).substring(2, 11);
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SKETIO ARCHITECTURES (Clean linear DAG layouts, zero cross-overs)
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function getCuratedArchitectures(): Record<string, ParsedDiagramSpec> {
  return {
    // 1. RAG & LLM Pipeline
    rag_ai: {
      title: "RAG & LLM Inference Pipeline",
      type: "architecture",
      direction: "horizontal",
      nodes: [
        { id: "user", label: "User Prompt / Query", subtext: "Web & Mobile Client", type: "client", tier: 0, row: 1 },
        { id: "guard", label: "Prompt Guard & Router", subtext: "Moderation & Filter", type: "security", tier: 1, row: 1 },
        { id: "cache", label: "Semantic Cache", subtext: "Redis / GPTCache", type: "cache", tier: 2, row: 0 },
        { id: "embed", label: "Embedding Generator", subtext: "text-embedding-3 / BGE", type: "ai", tier: 2, row: 1 },
        { id: "vector_db", label: "Vector DB (Qdrant/Pinecone)", subtext: "HNSW Top-K Search", type: "database", tier: 3, row: 1 },
        { id: "rerank", label: "Cross-Encoder Reranker", subtext: "Cohere / BGE Reranker", type: "service", tier: 4, row: 1 },
        { id: "llm", label: "Foundation LLM Engine", subtext: "Gemini 2.0 / GPT-4o", type: "ai", tier: 5, row: 1 },
        { id: "stream", label: "Streaming Response", subtext: "SSE / WebSocket Feed", type: "service", tier: 6, row: 1 },
        { id: "audit", label: "Telemetry & Eval Store", subtext: "PostgreSQL / ClickHouse", type: "database", tier: 7, row: 1 },
      ],
      edges: [
        { from: "user", to: "guard", label: "Input Query" },
        { from: "guard", to: "cache", label: "Check Cache" },
        { from: "guard", to: "embed", label: "Generate Vector" },
        { from: "embed", to: "vector_db", label: "Cosine Search" },
        { from: "vector_db", to: "rerank", label: "Top-K Candidates" },
        { from: "rerank", to: "llm", label: "Augmented Context" },
        { from: "llm", to: "stream", label: "Stream Tokens" },
        { from: "stream", to: "audit", label: "Log Token Metrics" },
      ],
    },

    // 2. Scalable Microservices (Clean pipeline, zero intersecting arrows)
    microservices: {
      title: "Scalable Microservices Architecture",
      type: "architecture",
      direction: "horizontal",
      nodes: [
        { id: "clients", label: "Web / Mobile Clients", subtext: "React 19 / iOS / Android", type: "client", tier: 0, row: 1 },
        { id: "cdn", label: "Cloudflare CDN & WAF", subtext: "DDoS Mitigation & Edge Cache", type: "cloud", tier: 1, row: 1 },
        { id: "gateway", label: "API Gateway & Router", subtext: "Kong / Envoy Rate Limiter", type: "service", tier: 2, row: 1 },
        { id: "auth", label: "Auth & Identity Service", subtext: "Clerk / JWT / OAuth2", type: "security", tier: 3, row: 0 },
        { id: "users", label: "User Management Service", subtext: "Node.js / Go Microservice", type: "service", tier: 3, row: 1 },
        { id: "orders", label: "Order & Payment Service", subtext: "High-Throughput gRPC", type: "service", tier: 3, row: 2 },
        { id: "redis", label: "Redis Cluster (Cache)", subtext: "Session & Fast Read Store", type: "cache", tier: 4, row: 0 },
        { id: "postgres", label: "PostgreSQL Multi-AZ", subtext: "ACID Transactional DB", type: "database", tier: 4, row: 1 },
        { id: "kafka", label: "Kafka Event Streaming", subtext: "Distributed Event Bus", type: "queue", tier: 4, row: 2 },
        { id: "worker", label: "Background Async Worker", subtext: "Email, Webhooks & Sync", type: "worker", tier: 5, row: 2 },
      ],
      edges: [
        { from: "clients", to: "cdn", label: "HTTPS / TLS" },
        { from: "cdn", to: "gateway", label: "Edge Forward" },
        { from: "gateway", to: "auth", label: "Verify JWT" },
        { from: "gateway", to: "users", label: "REST / gRPC" },
        { from: "gateway", to: "orders", label: "REST / gRPC" },
        { from: "users", to: "redis", label: "Cached Profile" },
        { from: "users", to: "postgres", label: "Read / Write" },
        { from: "orders", to: "postgres", label: "Commit Order" },
        { from: "orders", to: "kafka", label: "OrderCreated Event" },
        { from: "kafka", to: "worker", label: "Process Jobs" },
      ],
    },

    // 3. Uber / Ride-Sharing System Architecture
    ride_sharing: {
      title: "Uber / Ride-Sharing System Architecture",
      type: "architecture",
      direction: "horizontal",
      nodes: [
        { id: "rider", label: "Rider Mobile App", subtext: "Ride Request & Coordinates", type: "client", tier: 0, row: 0 },
        { id: "driver", label: "Driver Mobile App", subtext: "GPS Telemetry (Every 3s)", type: "client", tier: 0, row: 1 },
        { id: "ws_gateway", label: "WebSocket Gateway", subtext: "Concurrent Socket Hub", type: "service", tier: 1, row: 0.5 },
        { id: "geo_ingest", label: "Location Ingestion Engine", subtext: "H3 Hexagonal Spatial Index", type: "service", tier: 2, row: 0 },
        { id: "dispatch", label: "Matching & Dispatch Core", subtext: "Hungarian Matching Algorithm", type: "service", tier: 2, row: 1 },
        { id: "redis_geo", label: "Redis Geospatial Cache", subtext: "Sub-ms Driver Proximity", type: "cache", tier: 3, row: 0 },
        { id: "pricing", label: "Dynamic Pricing Engine", subtext: "Surge Multiplier & ETA", type: "ai", tier: 3, row: 1 },
        { id: "trip_db", label: "Trip & Ride PostgreSQL DB", subtext: "Lifecycle State Machine", type: "database", tier: 4, row: 1 },
        { id: "kafka_stream", label: "Kafka Event Hub", subtext: "Billing & Analytics Stream", type: "queue", tier: 4, row: 2 },
      ],
      edges: [
        { from: "rider", to: "ws_gateway", label: "Request Ride" },
        { from: "driver", to: "ws_gateway", label: "Stream GPS" },
        { from: "ws_gateway", to: "geo_ingest", label: "Batch Pings" },
        { from: "ws_gateway", to: "dispatch", label: "Dispatch Trigger" },
        { from: "geo_ingest", to: "redis_geo", label: "Update H3 Cells" },
        { from: "dispatch", to: "redis_geo", label: "Query Drivers" },
        { from: "dispatch", to: "pricing", label: "Calculate Fare" },
        { from: "dispatch", to: "trip_db", label: "Persist Trip" },
        { from: "dispatch", to: "kafka_stream", label: "Publish Events" },
      ],
    },

    // 4. Sketio Real-Time Whiteboard Architecture
    sketio_system: {
      title: "Sketio Collaborative Whiteboard Architecture",
      type: "architecture",
      direction: "horizontal",
      nodes: [
        { id: "canvas", label: "Sketio Excalidraw Canvas", subtext: "Next.js 16 + React 19 Client", type: "client", tier: 0, row: 0 },
        { id: "ai_modal", label: "AI Diagram Synthesis UI", subtext: "Gemini 2.0 / OpenAI / Neural", type: "ai", tier: 0, row: 1 },
        { id: "crypto", label: "End-to-End Encryption Layer", subtext: "AES-GCM-128 / Room Keys", type: "security", tier: 1, row: 0 },
        { id: "http_api", label: "Sketio HTTP Backend", subtext: "Express 4000 (50MB Payload)", type: "service", tier: 1, row: 1 },
        { id: "ws_cluster", label: "Socket.IO Collab Server", subtext: "Port 3002 | Realtime Sync", type: "service", tier: 2, row: 0 },
        { id: "clerk", label: "Clerk Authentication", subtext: "Universal JWT & RBAC", type: "security", tier: 2, row: 1 },
        { id: "postgres", label: "PostgreSQL Database", subtext: "Rooms, Elements, AppState", type: "database", tier: 3, row: 0 },
        { id: "file_store", label: "FileAsset Binary Storage", subtext: "Images, Fonts & Media", type: "storage", tier: 3, row: 1 },
      ],
      edges: [
        { from: "canvas", to: "crypto", label: "Encrypt Deltas" },
        { from: "crypto", to: "ws_cluster", label: "Broadcast" },
        { from: "canvas", to: "http_api", label: "Save Scene PUT" },
        { from: "ai_modal", to: "canvas", label: "Inject Elements" },
        { from: "http_api", to: "clerk", label: "Validate JWT" },
        { from: "http_api", to: "postgres", label: "Prisma Upsert" },
        { from: "http_api", to: "file_store", label: "Persist Assets" },
      ],
    },

    // 5. Stripe Checkout & Payment Lifecycle
    payment_flow: {
      title: "Stripe Payment & Order Lifecycle",
      type: "flowchart",
      direction: "vertical",
      nodes: [
        { id: "start", label: "Shopper Clicks Checkout", subtext: "Cart Items + Address", type: "client", tier: 0, col: 0 },
        { id: "create_intent", label: "Create PaymentIntent", subtext: "Calculate Amount + Taxes", type: "service", tier: 1, col: 0 },
        { id: "present_form", label: "Render Stripe Elements", subtext: "Apple Pay, Card, Google Pay", type: "client", tier: 2, col: 0 },
        { id: "auth_3ds", label: "3D Secure Required?", subtext: "Bank Fraud Challenge", type: "decision", tier: 3, col: 0 },
        { id: "challenge", label: "OTP / Biometric Challenge", subtext: "Redirect to Issuer Bank", type: "security", tier: 4, col: 1 },
        { id: "stripe_charge", label: "Stripe Captures Charge", subtext: "Funds Reserved", type: "service", tier: 4, col: 0 },
        { id: "webhook", label: "Stripe Webhook Fired", subtext: "payment_intent.succeeded", type: "queue", tier: 5, col: 0 },
        { id: "order_db", label: "Commit Order Record", subtext: "Status: Paid | Decrement Stock", type: "database", tier: 6, col: 0 },
        { id: "email", label: "Send Customer Receipt", subtext: "SendGrid / Resend Email", type: "process", tier: 7, col: 0 },
      ],
      edges: [
        { from: "start", to: "create_intent" },
        { from: "create_intent", to: "present_form" },
        { from: "present_form", to: "auth_3ds", label: "User Submits" },
        { from: "auth_3ds", to: "challenge", label: "Yes (SCA)" },
        { from: "auth_3ds", to: "stripe_charge", label: "No (Frictionless)" },
        { from: "challenge", to: "stripe_charge", label: "Authorized" },
        { from: "stripe_charge", to: "webhook", label: "Async Event" },
        { from: "webhook", to: "order_db", label: "Verify Signature" },
        { from: "order_db", to: "email", label: "Trigger Dispatch" },
      ],
    },

    // 6. Kubernetes Cloud Infrastructure
    k8s_cluster: {
      title: "Production Kubernetes (EKS) Infrastructure",
      type: "cloud",
      direction: "horizontal",
      nodes: [
        { id: "route53", label: "Route 53 DNS", subtext: "Latency-based DNS Routing", type: "cloud", tier: 0, row: 1 },
        { id: "alb", label: "AWS Application Load Balancer", subtext: "TLS Termination & Health Check", type: "cloud", tier: 1, row: 1 },
        { id: "ingress", label: "Nginx Ingress Controller", subtext: "Path-based Cluster Router", type: "service", tier: 2, row: 1 },
        { id: "web_pods", label: "Frontend Web Pods (x5)", subtext: "Auto-scaling HPA Deployment", type: "process", tier: 3, row: 0 },
        { id: "api_pods", label: "Backend API Pods (x10)", subtext: "FastAPI / Node.js Pods", type: "service", tier: 3, row: 1 },
        { id: "worker_pods", label: "Async Worker Pods (x4)", subtext: "Celery / BullMQ Jobs", type: "worker", tier: 3, row: 2 },
        { id: "redis_cluster", label: "ElastiCache Redis", subtext: "Sub-ms Session Store", type: "cache", tier: 4, row: 0 },
        { id: "rds", label: "Amazon Aurora PostgreSQL", subtext: "Multi-AZ Master + Replicas", type: "database", tier: 4, row: 1 },
        { id: "s3", label: "Amazon S3 Bucket", subtext: "Encrypted Cloud Storage", type: "storage", tier: 4, row: 2 },
      ],
      edges: [
        { from: "route53", to: "alb", label: "DNS Query" },
        { from: "alb", to: "ingress", label: "Forward HTTP" },
        { from: "ingress", to: "web_pods", label: "Route /*" },
        { from: "ingress", to: "api_pods", label: "Route /api/*" },
        { from: "api_pods", to: "worker_pods", label: "Enqueue Task" },
        { from: "api_pods", to: "redis_cluster", label: "Read / Write" },
        { from: "api_pods", to: "rds", label: "SQL Query" },
        { from: "api_pods", to: "s3", label: "Presigned URL" },
      ],
    },

    // 7. CI/CD GitOps Pipeline
    gitops: {
      title: "Enterprise GitOps CI/CD Pipeline",
      type: "pipeline",
      direction: "horizontal",
      nodes: [
        { id: "git", label: "GitHub Repository", subtext: "Developer Git Push / PR", type: "client", tier: 0, row: 0.5 },
        { id: "actions", label: "GitHub Actions CI Runner", subtext: "Matrix Build Pipeline", type: "service", tier: 1, row: 0.5 },
        { id: "tests", label: "Automated Linter & Tests", subtext: "ESLint, Jest & Playwright", type: "service", tier: 2, row: 0 },
        { id: "trivy", label: "Security & Vulnerability Scan", subtext: "Trivy Container Scanner", type: "security", tier: 2, row: 1 },
        { id: "docker", label: "Docker Multi-Arch Build", subtext: "Optimized Alpine Container", type: "process", tier: 3, row: 0.5 },
        { id: "ecr", label: "Amazon ECR Registry", subtext: "Immutable Tagged Image", type: "cloud", tier: 4, row: 0.5 },
        { id: "argocd", label: "ArgoCD GitOps Operator", subtext: "Continuous Reconciliation", type: "service", tier: 5, row: 0.5 },
        { id: "prod_k8s", label: "Production K8s Cluster", subtext: "Zero-Downtime Rolling Update", type: "cloud", tier: 6, row: 0.5 },
      ],
      edges: [
        { from: "git", to: "actions", label: "Webhook Trigger" },
        { from: "actions", to: "tests", label: "Run Suite" },
        { from: "actions", to: "trivy", label: "Scan Deps" },
        { from: "tests", to: "docker", label: "Passed" },
        { from: "trivy", to: "docker", label: "Clean" },
        { from: "docker", to: "ecr", label: "Push Image" },
        { from: "ecr", to: "argocd", label: "Detect Tag" },
        { from: "argocd", to: "prod_k8s", label: "Sync Manifest" },
      ],
    },

    // 8. OAuth 2.0 & OIDC Flow
    oauth_oidc: {
      title: "OAuth 2.0 & OpenID Connect (OIDC) Flow",
      type: "flowchart",
      direction: "vertical",
      nodes: [
        { id: "user", label: "User Browser Client", subtext: "Clicks 'Sign in with Google'", type: "client", tier: 0, col: 0 },
        { id: "app_fe", label: "Sketio Frontend App", subtext: "Generates PKCE Code Verifier", type: "service", tier: 1, col: 0 },
        { id: "idp", label: "Identity Provider (Clerk/Google)", subtext: "Auth Server (/authorize)", type: "security", tier: 2, col: 0 },
        { id: "consent", label: "User Grants Consent?", subtext: "Scopes: profile, email", type: "decision", tier: 3, col: 0 },
        { id: "redirect", label: "Callback with Auth Code", subtext: "Redirect to /api/auth/callback", type: "service", tier: 4, col: 0 },
        { id: "token_exchange", label: "Token Exchange Endpoint", subtext: "POST /token with PKCE Secret", type: "security", tier: 5, col: 0 },
        { id: "jwt", label: "Issue Access & ID Tokens", subtext: "Signed RS256 JWT Token", type: "process", tier: 6, col: 0 },
        { id: "session", label: "Create Verified Session", subtext: "Dashboard Access Unlocked", type: "client", tier: 7, col: 0 },
      ],
      edges: [
        { from: "user", to: "app_fe", label: "Trigger Login" },
        { from: "app_fe", to: "idp", label: "Redirect /authorize" },
        { from: "idp", to: "consent", label: "Show Login UI" },
        { from: "consent", to: "redirect", label: "Consent Granted" },
        { from: "redirect", to: "token_exchange", label: "Pass Code" },
        { from: "token_exchange", to: "jwt", label: "Verify PKCE" },
        { from: "jwt", to: "session", label: "Set HttpOnly Cookie" },
      ],
    },
  };
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * INTELLIGENT SEMANTIC PROMPT PARSER (Heuristic + NLP Graph Extraction)
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function parsePromptToSpec(prompt: string): ParsedDiagramSpec {
  const p = prompt.toLowerCase();
  const curated = getCuratedArchitectures();

  if (p.includes("rag") || p.includes("vector") || p.includes("llm") || p.includes("embedding") || p.includes("langchain") || p.includes("ai agent")) {
    return curated.rag_ai;
  }
  if (p.includes("uber") || p.includes("ride") || p.includes("taxi") || p.includes("driver") || p.includes("geospatial")) {
    return curated.ride_sharing;
  }
  if (p.includes("microservice") || p.includes("micro services") || (p.includes("architecture") && (p.includes("system") || p.includes("backend") || p.includes("api") || p.includes("scalable")))) {
    return curated.microservices;
  }
  if (p.includes("sketio") || p.includes("whiteboard") || p.includes("excalidraw") || p.includes("draw app") || p.includes("collab")) {
    return curated.sketio_system;
  }
  if (p.includes("k8s") || p.includes("kubernetes") || p.includes("eks") || p.includes("alb") || p.includes("cluster") || p.includes("pod")) {
    return curated.k8s_cluster;
  }
  if (p.includes("stripe") || p.includes("payment") || p.includes("checkout") || p.includes("billing") || p.includes("order")) {
    return curated.payment_flow;
  }
  if (p.includes("ci/cd") || p.includes("gitops") || p.includes("argocd") || p.includes("docker") || p.includes("pipeline") || p.includes("deploy")) {
    return curated.gitops;
  }
  if (p.includes("oauth") || p.includes("oidc") || p.includes("sso") || p.includes("pkce") || p.includes("auth flow") || p.includes("login flow") || (p.includes("auth") && !p.includes("gateway"))) {
    return curated.oauth_oidc;
  }
  if (p.includes("architecture") || p.includes("system") || p.includes("backend") || p.includes("api")) {
    return curated.microservices;
  }

  // Fallback: Advanced Freeform NLP Graph Synthesis
  return synthesizeGraphFromFreeformPrompt(prompt);
}

/**
 * Parses arbitrary user prompts into an interconnected, multi-tiered semantic graph.
 */
function synthesizeGraphFromFreeformPrompt(prompt: string): ParsedDiagramSpec {
  const segments = prompt
    .split(/[,;\n\.\-\>|]+|(?:\band\b|\bthen\b|\bnext\b|\bafter\b|\binto\b)/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);

  const cleanItems = segments.length >= 3 ? segments : [
    "User / Client Request",
    "API Gateway & Validator",
    "Business Logic Service",
    "Event Broker / Queue",
    "Persistent Database Store",
    "Notification & Telemetry"
  ];

  const nodes: DiagramNode[] = cleanItems.map((item, index) => {
    const lower = item.toLowerCase();
    let type: NodeType = "service";

    if (lower.includes("user") || lower.includes("client") || lower.includes("browser") || lower.includes("mobile") || lower.includes("app") || lower.includes("ui")) {
      type = "client";
    } else if (lower.includes("db") || lower.includes("database") || lower.includes("postgres") || lower.includes("mongo") || lower.includes("sql") || lower.includes("store")) {
      type = "database";
    } else if (lower.includes("cache") || lower.includes("redis") || lower.includes("memcache")) {
      type = "cache";
    } else if (lower.includes("queue") || lower.includes("kafka") || lower.includes("rabbit") || lower.includes("event") || lower.includes("bus")) {
      type = "queue";
    } else if (lower.includes("auth") || lower.includes("security") || lower.includes("firewall") || lower.includes("waf") || lower.includes("token") || lower.includes("guard")) {
      type = "security";
    } else if (lower.includes("cloud") || lower.includes("aws") || lower.includes("gcp") || lower.includes("azure") || lower.includes("cdn") || lower.includes("k8s")) {
      type = "cloud";
    } else if (lower.includes("worker") || lower.includes("job") || lower.includes("task") || lower.includes("cron")) {
      type = "worker";
    } else if (lower.includes("s3") || lower.includes("storage") || lower.includes("bucket") || lower.includes("file") || lower.includes("asset")) {
      type = "storage";
    } else if (lower.includes("ai") || lower.includes("llm") || lower.includes("model") || lower.includes("embed") || lower.includes("vector")) {
      type = "ai";
    } else if (lower.includes("if") || lower.includes("check") || lower.includes("decision") || lower.includes("valid") || lower.includes("verify")) {
      type = "decision";
    }

    return {
      id: `node_${index}`,
      label: item.charAt(0).toUpperCase() + item.slice(1),
      subtext: `Step ${index + 1}`,
      type,
      tier: index,
      row: 0,
    };
  });

  const edges: DiagramEdge[] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    edges.push({
      from: nodes[i].id,
      to: nodes[i + 1].id,
      label: i === 0 ? "Initiates" : i === nodes.length - 2 ? "Persists" : "Forwards",
    });
  }

  return {
    title: prompt.slice(0, 45).trim() + " Diagram",
    type: "architecture",
    direction: "horizontal",
    nodes,
    edges,
  };
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * EXCALIDRAW ELEMENT CONVERTER (Clean Floating Shapes, NO GREY CONTAINERS)
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function specToExcalidrawElements(
  spec: ParsedDiagramSpec,
  theme: "light" | "dark" = "dark",
  style: ThemeStyle = "modern",
  startX = 100,
  startY = 120,
  _includeContainers = false // Disabled permanently per user request: NO GREY BACKGROUND BOXES
): any[] {
  const elements: any[] = [];
  const palette = THEME_PALETTES[style]?.[theme] || THEME_PALETTES.modern.dark;
  const isHorizontal = spec.direction !== "vertical";

  // Dimensions
  const BOX_WIDTH = 230;
  const BOX_HEIGHT = 84;
  const HORIZ_SPACING = 360;
  const VERT_SPACING = 160;

  // Group nodes by tier
  const tierGroups = new Map<number, DiagramNode[]>();
  for (const node of spec.nodes) {
    const tier = node.tier ?? 0;
    if (!tierGroups.has(tier)) tierGroups.set(tier, []);
    tierGroups.get(tier)!.push(node);
  }

  const nodeMap = new Map<string, { el: any; cx: number; cy: number; x: number; y: number; width: number; height: number }>();

  // 1. Calculate Clean Node Coordinates (Aligned rows, NO background boxes)
  for (const [tier, nodesInTier] of Array.from(tierGroups.entries())) {
    const count = nodesInTier.length;

    nodesInTier.forEach((node, idx) => {
      let x = 0;
      let y = 0;

      if (isHorizontal) {
        // Horizontal flow (Left -> Right)
        const rowVal = node.row !== undefined ? node.row : (idx - (count - 1) / 2);
        x = startX + tier * HORIZ_SPACING;
        y = startY + rowVal * VERT_SPACING + 150;
      } else {
        // Vertical flow (Top -> Bottom)
        const colVal = node.col !== undefined ? node.col : (idx - (count - 1) / 2);
        x = startX + colVal * (BOX_WIDTH + 80) + 250;
        y = startY + tier * VERT_SPACING;
      }

      const colors = palette[node.type] || palette.service;
      const shapeId = generateId();
      const textId = generateId();
      const groupId = "grp_" + generateId();

      const shapeType =
        node.type === "decision"
          ? "diamond"
          : node.type === "client"
          ? "ellipse"
          : "rectangle";

      const shapeElement: any = {
        id: shapeId,
        type: shapeType,
        x,
        y,
        width: BOX_WIDTH,
        height: BOX_HEIGHT,
        angle: 0,
        strokeColor: colors.stroke,
        backgroundColor: colors.bg,
        fillStyle: "solid",
        strokeWidth: 2,
        strokeStyle: "solid",
        roughness: style === "sketch" ? 2 : 0,
        opacity: 100,
        groupIds: [groupId],
        frameId: null,
        roundness: { type: 3 },
        seed: Math.floor(Math.random() * 100000),
        version: 1,
        versionNonce: Math.floor(Math.random() * 100000),
        isDeleted: false,
        boundElements: [{ id: textId, type: "text" }],
        updated: Date.now(),
        link: null,
        locked: false,
      };

      const displayText = node.subtext ? `${node.label}\n${node.subtext}` : node.label;

      const textElement: any = {
        id: textId,
        type: "text",
        x: x + 10,
        y: y + (BOX_HEIGHT - 40) / 2,
        width: BOX_WIDTH - 20,
        height: 40,
        angle: 0,
        strokeColor: colors.text,
        backgroundColor: "transparent",
        fillStyle: "solid",
        strokeWidth: 1,
        strokeStyle: "solid",
        roughness: 0,
        opacity: 100,
        groupIds: [groupId],
        frameId: null,
        roundness: null,
        seed: Math.floor(Math.random() * 100000),
        version: 1,
        versionNonce: Math.floor(Math.random() * 100000),
        isDeleted: false,
        boundElements: null,
        updated: Date.now(),
        link: null,
        locked: false,
        text: displayText,
        fontSize: node.subtext ? 13 : 15,
        fontFamily: style === "sketch" ? 1 : 2,
        textAlign: "center",
        verticalAlign: "middle",
        containerId: shapeId,
        originalText: displayText,
        lineHeight: 1.25,
      };

      elements.push(shapeElement, textElement);
      nodeMap.set(node.id, {
        el: shapeElement,
        cx: x + BOX_WIDTH / 2,
        cy: y + BOX_HEIGHT / 2,
        x,
        y,
        width: BOX_WIDTH,
        height: BOX_HEIGHT,
      });
    });
  }

  // 2. Render Directed Arrow Connections (Perimeter-to-Perimeter, ZERO cross-through)
  for (const edge of spec.edges) {
    const fromNode = nodeMap.get(edge.from);
    const toNode = nodeMap.get(edge.to);

    if (!fromNode || !toNode) continue;

    const arrowId = generateId();

    // Determine clean boundary connection points
    let startX = fromNode.cx;
    let startY = fromNode.cy;
    let endX = toNode.cx;
    let endY = toNode.cy;

    if (isHorizontal) {
      if (toNode.cx > fromNode.cx) {
        startX = fromNode.x + fromNode.width;
        startY = fromNode.cy;
        endX = toNode.x;
        endY = toNode.cy;
      } else if (toNode.cx < fromNode.cx) {
        startX = fromNode.x;
        startY = fromNode.cy;
        endX = toNode.x + toNode.width;
        endY = toNode.cy;
      }
    } else {
      if (toNode.cy > fromNode.cy) {
        startX = fromNode.cx;
        startY = fromNode.y + fromNode.height;
        endX = toNode.cx;
        endY = toNode.y;
      } else if (toNode.cy < fromNode.cy) {
        startX = fromNode.cx;
        startY = fromNode.y;
        endX = toNode.cx;
        endY = toNode.y + toNode.height;
      }
    }

    const dx = endX - startX;
    const dy = endY - startY;

    const arrowElement: any = {
      id: arrowId,
      type: "arrow",
      x: startX,
      y: startY,
      width: Math.abs(dx),
      height: Math.abs(dy),
      angle: 0,
      strokeColor: palette.edge,
      backgroundColor: "transparent",
      fillStyle: "solid",
      strokeWidth: 2,
      strokeStyle: edge.style === "dashed" ? "dashed" : "solid",
      roughness: style === "sketch" ? 1.5 : 0,
      opacity: 85,
      groupIds: [],
      frameId: null,
      roundness: { type: 2 },
      seed: Math.floor(Math.random() * 100000),
      version: 1,
      versionNonce: Math.floor(Math.random() * 100000),
      isDeleted: false,
      boundElements: [],
      updated: Date.now(),
      link: null,
      locked: false,
      points: [
        [0, 0],
        [dx, dy],
      ],
      lastCommittedPoint: null,
      startBinding: {
        elementId: fromNode.el.id,
        focus: 0,
        gap: 6,
      },
      endBinding: {
        elementId: toNode.el.id,
        focus: 0,
        gap: 6,
      },
      startArrowhead: null,
      endArrowhead: "arrow",
    };

    fromNode.el.boundElements.push({ id: arrowId, type: "arrow" });
    toNode.el.boundElements.push({ id: arrowId, type: "arrow" });

    elements.push(arrowElement);

    // Optional Edge Label Badge (Must be pushed AFTER arrowElement to preserve container -> boundText ordering)
    if (edge.label) {
      const labelId = generateId();
      const midX = startX + dx / 2 - 45;
      const midY = startY + dy / 2 - 12;

      arrowElement.boundElements.push({ id: labelId, type: "text" });

      const labelElement: any = {
        id: labelId,
        type: "text",
        x: midX,
        y: midY,
        width: 90,
        height: 20,
        angle: 0,
        strokeColor: theme === "dark" ? "#38bdf8" : "#0284c7",
        backgroundColor: theme === "dark" ? "#0f172a" : "#ffffff",
        fillStyle: "solid",
        strokeWidth: 1,
        strokeStyle: "solid",
        roughness: 0,
        opacity: 100,
        groupIds: [],
        frameId: null,
        roundness: { type: 2 },
        seed: Math.floor(Math.random() * 100000),
        version: 1,
        versionNonce: Math.floor(Math.random() * 100000),
        isDeleted: false,
        boundElements: null,
        updated: Date.now(),
        link: null,
        locked: false,
        text: edge.label,
        fontSize: 11,
        fontFamily: 2,
        textAlign: "center",
        verticalAlign: "middle",
        containerId: arrowId,
        originalText: edge.label,
        lineHeight: 1.2,
      };

      elements.push(labelElement);
    }
  }

  return elements;
}
