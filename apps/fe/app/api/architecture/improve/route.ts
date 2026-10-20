import { NextResponse } from "next/server";

import type {
  ArchitectureGraph,
  ArchitectureImprovement,
  ArchitectureNode,
} from "@/lib/architectureTypes";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const graph = body.graph as ArchitectureGraph | undefined;
    if (!graph?.nodes?.length) {
      return NextResponse.json(
        { error: "An architecture graph is required." },
        { status: 400 },
      );
    }

    const improvements = await inspectGraphWithAI(graph);
    const proposedGraph = createProposedGraph(graph, improvements);
    return NextResponse.json({
      improvements,
      proposedGraph,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Architecture review failed.",
      },
      { status: 500 },
    );
  }
}

async function inspectGraphWithAI(graph: ArchitectureGraph): Promise<ArchitectureImprovement[]> {
  const deterministic = inspectGraph(graph);
  const openAiKey = process.env.OPENAI_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  if (!openAiKey && !geminiKey) {
    return deterministic;
  }

  // If AI provider is available, supplement with smart architectural suggestions
  try {
    const prompt = `Analyze this software repository architecture graph and identify up to 4 architectural improvement hypotheses (e.g., tight coupling, missing cache, single points of failure, missing async worker).
Graph: ${JSON.stringify({
      repository: graph.repository.fullName,
      nodes: graph.nodes.slice(0, 50).map((n) => ({ id: n.id, name: n.name, type: n.type })),
      edgesCount: graph.edges.length,
    })}
Respond strictly with a JSON array of objects with keys: id, category, title, observation, impact, suggestion, confidence (0-1), limitations.`;

    if (openAiKey) {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openAiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.2,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content || "";
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const aiItems = JSON.parse(jsonMatch[0]) as ArchitectureImprovement[];
          return [...aiItems.map((item) => ({ ...item, evidence: [], nodeIds: [] })), ...deterministic].slice(0, 10);
        }
      }
    }
  } catch {
    // Fallback to deterministic
  }

  return deterministic;
}

function inspectGraph(graph: ArchitectureGraph): ArchitectureImprovement[] {
  const improvements: ArchitectureImprovement[] = [];
  const degree = new Map<string, number>();
  for (const edge of graph.edges) {
    degree.set(edge.source, (degree.get(edge.source) || 0) + 1);
    degree.set(edge.target, (degree.get(edge.target) || 0) + 1);
  }

  for (const node of graph.nodes) {
    const connections = degree.get(node.id) || 0;
    if (connections >= 8) {
      improvements.push({
        id: `coupling-${node.id}`,
        category: "coupling",
        title: `${node.name} is a high-connectivity boundary`,
        observation: `${node.name} participates in ${connections} detected relationships.`,
        impact:
          "Changes in this component may have a wider coordination and regression surface.",
        suggestion:
          "Review whether transport, orchestration, and domain responsibilities can be separated behind smaller interfaces.",
        confidence: 0.72,
        limitations:
          "Connectivity is measured from detected relationships, not runtime traffic or change history.",
        evidence: node.evidence.slice(0, 4),
        nodeIds: [node.id],
      });
    }
    if (node.inferred) {
      improvements.push({
        id: `boundary-${node.id}`,
        category: "boundary",
        title: `${node.name} needs boundary confirmation`,
        observation:
          "This component was grouped from naming, structure, or conventions rather than a direct architectural declaration.",
        impact:
          "The visual boundary may hide responsibilities that should be verified before making structural changes.",
        suggestion:
          "Confirm the ownership and public interface of this area with its source files before splitting or scaling it.",
        confidence: 0.64,
        limitations:
          "The analyzer did not find an explicit service boundary in the inspected files.",
        evidence: node.evidence.slice(0, 4),
        nodeIds: [node.id],
      });
    }
  }

  const realtime = graph.nodes.find((node) => node.type === "realtime");
  const database = graph.nodes.find((node) => node.type === "database");
  if (realtime && database) {
    const edge = graph.edges.find(
      (item) => item.source === realtime.id && item.target === database.id,
    );
    if (!edge) {
      improvements.push({
        id: "realtime-persistence",
        category: "scalability",
        title: "Realtime persistence path is not confirmed",
        observation:
          "A realtime component and database were detected, but no direct persistence relationship was confirmed in the analyzed graph.",
        impact:
          "Reconnect recovery, fan-out, or durability behavior may need explicit review.",
        suggestion:
          "Trace room state ownership and reconnect handling before adding horizontal realtime instances.",
        confidence: 0.58,
        limitations:
          "The graph may omit files because of analysis depth or repository size limits.",
        evidence: [
          ...realtime.evidence.slice(0, 2),
          ...database.evidence.slice(0, 2),
        ],
        nodeIds: [realtime.id, database.id],
      });
    }
  }

  // Suggest cache layer if database exists without redis
  const hasCache = graph.nodes.some((n) => n.name.toLowerCase().includes("redis") || n.name.toLowerCase().includes("cache"));
  if (database && !hasCache) {
    improvements.push({
      id: "caching-layer",
      category: "scalability",
      title: "Evaluate Redis / in-memory caching tier",
      observation:
        "Detected direct database persistence without an intermediate cache or Redis instance.",
      impact:
        "High-read queries (e.g. board elements, user profiles, room sessions) hit PostgreSQL directly.",
      suggestion:
        "Introduce Redis or an LRU read cache for frequent read queries and room metadata.",
      confidence: 0.75,
      limitations:
        "Optimal when read-to-write ratio exceeds 5:1.",
      evidence: database.evidence.slice(0, 2),
      nodeIds: [database.id],
    });
  }

  return improvements.slice(0, 10);
}

function createProposedGraph(
  graph: ArchitectureGraph,
  improvements: ArchitectureImprovement[],
): ArchitectureGraph {
  const affected = new Set(improvements.flatMap((item) => item.nodeIds));
  const idMap = new Map(
    graph.nodes.map((node) => [node.id, `proposal:${node.id}`]),
  );

  const nodes: ArchitectureNode[] = graph.nodes.map((node) => ({
    ...node,
    id: idMap.get(node.id) || `proposal:${node.id}`,
    name: affected.has(node.id) ? `Proposed: ${node.name}` : node.name,
    description: affected.has(node.id)
      ? `${node.description} This is a review-only proposal with optimized boundaries.`
      : node.description,
  }));

  // Add proposed caching node if database improvement was triggered
  const proposedNodes = [...nodes];
  const proposedEdges = [...graph.edges.map((edge) => ({
    ...edge,
    id: `proposal:${edge.id}`,
    source: idMap.get(edge.source) || `proposal:${edge.source}`,
    target: idMap.get(edge.target) || `proposal:${edge.target}`,
  }))];

  const dbNode = graph.nodes.find((n) => n.type === "database");
  if (dbNode && improvements.some((i) => i.id === "caching-layer")) {
    const cacheId = "proposal:cache:redis";
    proposedNodes.push({
      id: cacheId,
      name: "Proposed: Redis Cache Layer",
      type: "database",
      description: "Proposed fast in-memory cache to absorb frequent read traffic before database.",
      technology: "Redis / In-Memory",
      files: [],
      evidence: [],
      confidence: 0.85,
      inferred: true,
    });
    proposedEdges.push({
      id: `proposal:${cacheId}->${idMap.get(dbNode.id)}`,
      source: cacheId,
      target: idMap.get(dbNode.id)!,
      relationship: "connects",
      label: "cache write-through / eviction",
      evidence: [],
      confidence: 0.85,
      inferred: true,
    });
  }

  return {
    ...graph,
    nodes: proposedNodes,
    edges: proposedEdges,
    warnings: [
      ...graph.warnings,
      "Proposed architecture branch: includes suggested caching tier and boundary refinements without altering original canvas data.",
    ],
  };
}

