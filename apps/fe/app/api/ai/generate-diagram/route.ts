import { NextResponse } from "next/server";
import {
  parsePromptToSpec,
  specToExcalidrawElements,
  type ParsedDiagramSpec,
  type ThemeStyle,
} from "@/lib/aiDiagramGenerator";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `
You are the world's best software architect and technical illustrator.
Convert the user's diagram request into a clean, structured JSON diagram specification.

Rules:
1. Identify all architectural layers, actors, microservices, databases, queues, caches, and cloud components.
2. Group components into logical tiers:
   - tier 0: entry / clients / browsers / mobile apps
   - tier 1: ingress / API gateways / WAF / reverse proxies
   - tier 2: core microservices / backend logic / workers
   - tier 3: event streaming / queues / async brokers
   - tier 4: databases / caches / object stores / analytics
3. Provide crisp, directed edges showing protocols or data flow descriptions (e.g. "HTTPS REST", "gRPC", "Publishes Event", "SQL Query", "Reads Cache").
4. Return ONLY raw JSON without markdown code fences.

JSON Schema format:
{
  "title": "Diagram Title",
  "type": "architecture", // architecture | flowchart | pipeline | cloud | erd
  "direction": "horizontal", // horizontal | vertical
  "containers": [
    { "id": "c_edge", "label": "Edge & Ingress", "tier": 0 },
    { "id": "c_services", "label": "Core Microservices", "tier": 1 },
    { "id": "c_data", "label": "Storage Layer", "tier": 2 }
  ],
  "nodes": [
    { "id": "client", "label": "Web Client", "subtext": "React 19 SPA", "type": "client", "tier": 0, "col": 0 },
    { "id": "gateway", "label": "API Gateway", "subtext": "Envoy Proxy", "type": "service", "tier": 1, "col": 0 },
    { "id": "db", "label": "PostgreSQL", "subtext": "Multi-AZ DB", "type": "database", "tier": 2, "col": 0 }
  ],
  "edges": [
    { "from": "client", "to": "gateway", "label": "HTTPS REST" },
    { "from": "gateway", "to": "db", "label": "Read / Write" }
  ]
}
Supported node types: client, service, database, cache, queue, decision, cloud, security, worker, storage, ai, process.
`;

/**
 * GET: Returns available AI models and their active status
 */
export async function GET() {
  const geminiKey = process.env.GEMINI_API_KEY || "";
  const openaiKey = process.env.OPENAI_API_KEY || "";
  const groqKey = process.env.GROQ_API_KEY || "";
  const defaultModel = process.env.DEFAULT_AI_MODEL || "gemini-2.0-flash";

  return NextResponse.json({
    geminiConfigured: Boolean(geminiKey && geminiKey.trim().length > 10),
    openaiConfigured: Boolean(openaiKey && openaiKey.trim().length > 10),
    groqConfigured: Boolean(groqKey && groqKey.trim().length > 10),
    defaultModel,
    availableModels: [
      {
        id: "gemini-2.0-flash",
        name: "Google Gemini 2.0 Flash",
        provider: "Google AI",
        desc: "Frontier multimodal reasoning & fastest structured output",
        configured: Boolean(geminiKey),
      },
      {
        id: "gemini-1.5-flash",
        name: "Google Gemini 1.5 Flash",
        provider: "Google AI",
        desc: "High-speed technical architecture model",
        configured: Boolean(geminiKey),
      },
      {
        id: "gpt-4o-mini",
        name: "OpenAI GPT-4o Mini",
        provider: "OpenAI",
        desc: "Smart compact reasoning model",
        configured: Boolean(openaiKey),
      },
      {
        id: "gpt-4o",
        name: "OpenAI GPT-4o",
        provider: "OpenAI",
        desc: "Full flagship frontier model",
        configured: Boolean(openaiKey),
      },
      {
        id: "llama-3.3-70b-versatile",
        name: "Groq Llama 3.3 70B",
        provider: "Groq",
        desc: "Ultra-fast open weights inference (<400ms)",
        configured: Boolean(groqKey),
      },
      {
        id: "sketio-neural-v3",
        name: "Sketio Neural Engine v3",
        provider: "Built-in (Offline)",
        desc: "Deterministic DAG layout with 20+ architectures",
        configured: true,
      },
    ],
  });
}

/**
 * POST: Generates diagram specification from prompt using requested AI model
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      prompt,
      model = "auto",
      apiKey: clientApiKey,
      theme = "dark",
      style = "modern",
      direction = "horizontal",
      includeContainers = true,
    } = body;

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const trimmedPrompt = prompt.trim();
    let spec: ParsedDiagramSpec | null = null;
    let modelUsed = "sketio-neural-v3";
    let providerName = "Sketio Built-in Engine";

    // Keys resolution (client key takes precedence, falls back to env)
    const geminiKey = (clientApiKey && clientApiKey.startsWith("AIza")) ? clientApiKey : (process.env.GEMINI_API_KEY || "");
    const openaiKey = (clientApiKey && clientApiKey.startsWith("sk-proj-") || clientApiKey?.startsWith("sk-")) ? clientApiKey : (process.env.OPENAI_API_KEY || "");
    const groqKey = (clientApiKey && clientApiKey.startsWith("gsk_")) ? clientApiKey : (process.env.GROQ_API_KEY || "");

    // Determine target model
    let targetModel = model;
    if (targetModel === "auto") {
      if (geminiKey) targetModel = process.env.DEFAULT_AI_MODEL || "gemini-2.0-flash";
      else if (groqKey) targetModel = "llama-3.3-70b-versatile";
      else if (openaiKey) targetModel = "gpt-4o-mini";
      else targetModel = "sketio-neural-v3";
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 1. Google Gemini (2.0 Flash / 1.5 Flash / 1.5 Pro)
    // ─────────────────────────────────────────────────────────────────────────
    if (targetModel.startsWith("gemini") && geminiKey) {
      try {
        const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${geminiKey}`;
        const res = await fetch(geminiEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: `${SYSTEM_PROMPT}\n\nUser Diagram Request: "${trimmedPrompt}"` }],
              },
            ],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.2,
            },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            spec = JSON.parse(rawText);
            modelUsed = targetModel;
            providerName = "Google AI (Gemini)";
          }
        } else {
          const errText = await res.text();
          console.warn(`[Gemini API Error] ${res.status}:`, errText);
        }
      } catch (geminiErr) {
        console.warn("[Gemini Fetch Error]:", geminiErr);
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Groq (Llama 3.3 70B Versatile - Ultra Fast Inference)
    // ─────────────────────────────────────────────────────────────────────────
    if (!spec && (targetModel.includes("llama") || targetModel.includes("groq")) && groqKey) {
      try {
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: `Create diagram for: "${trimmedPrompt}"` },
            ],
            temperature: 0.2,
          }),
        });

        if (groqRes.ok) {
          const data = await groqRes.json();
          const content = data.choices?.[0]?.message?.content;
          if (content) {
            spec = JSON.parse(content);
            modelUsed = "llama-3.3-70b-versatile";
            providerName = "Groq (Llama 3.3 70B)";
          }
        } else {
          console.warn("[Groq API Error]:", await groqRes.text());
        }
      } catch (groqErr) {
        console.warn("[Groq Fetch Error]:", groqErr);
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. OpenAI (GPT-4o / GPT-4o-mini)
    // ─────────────────────────────────────────────────────────────────────────
    if (!spec && targetModel.startsWith("gpt") && openaiKey) {
      try {
        const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: targetModel,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: `Create diagram for: "${trimmedPrompt}"` },
            ],
            temperature: 0.2,
          }),
        });

        if (openaiRes.ok) {
          const data = await openaiRes.json();
          const content = data.choices?.[0]?.message?.content;
          if (content) {
            spec = JSON.parse(content);
            modelUsed = targetModel;
            providerName = "OpenAI";
          }
        } else {
          console.warn("[OpenAI API Error]:", await openaiRes.text());
        }
      } catch (openaiErr) {
        console.warn("[OpenAI Fetch Error]:", openaiErr);
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. Deterministic Sketio Neural Engine v3 (Zero-Config / Offline Fallback)
    // ─────────────────────────────────────────────────────────────────────────
    if (!spec) {
      spec = parsePromptToSpec(trimmedPrompt);
      modelUsed = "sketio-neural-v3";
      providerName = "Sketio Ultra-Neural Engine";
    }

    // Apply layout direction override if provided
    if (direction) {
      spec.direction = direction;
    }

    // Convert spec to fully styled Excalidraw shapes
    const elements = specToExcalidrawElements(
      spec,
      theme === "dark" ? "dark" : "light",
      style as ThemeStyle,
      100,
      120,
      includeContainers
    );

    return NextResponse.json({
      success: true,
      modelUsed,
      providerName,
      title: spec.title,
      spec,
      elements,
    });
  } catch (error: any) {
    console.error("AI Diagram generation error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
