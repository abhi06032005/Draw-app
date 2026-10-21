import type {
  ArchitectureGraph,
  ArchitectureNode,
  ArchitectureNodeType,
} from "./architectureTypes";

const WIDTH = 250;
const HEIGHT = 88;
const SAT_WIDTH = 176;
const SAT_HEIGHT = 34;
const X_GAP = 180;
const Y_GAP = 90;

const COLORS: Record<
  ArchitectureNodeType,
  { background: string; stroke: string; text: string; accent: string }
> = {
  repository: { background: "#161924", stroke: "#a78bfa", text: "#f8fafc", accent: "#23213a" },
  frontend: { background: "#131c2b", stroke: "#38bdf8", text: "#f8fafc", accent: "#0c2847" },
  page: { background: "#131c2b", stroke: "#60a5fa", text: "#f8fafc", accent: "#112a52" },
  api: { background: "#18182e", stroke: "#818cf8", text: "#f8fafc", accent: "#23214c" },
  service: { background: "#1b172c", stroke: "#c084fc", text: "#f8fafc", accent: "#2b1c4b" },
  auth: { background: "#221727", stroke: "#f472b6", text: "#f8fafc", accent: "#3c1b37" },
  database: { background: "#11221b", stroke: "#34d399", text: "#f8fafc", accent: "#0d3828" },
  realtime: { background: "#112224", stroke: "#2dd4bf", text: "#f8fafc", accent: "#0d3937" },
  worker: { background: "#221c14", stroke: "#fbbf24", text: "#f8fafc", accent: "#3c2e12" },
  shared: { background: "#171920", stroke: "#94a3b8", text: "#f8fafc", accent: "#232631" },
  infrastructure: { background: "#121d26", stroke: "#22d3ee", text: "#f8fafc", accent: "#103240" },
  external: { background: "#181921", stroke: "#a1a1aa", text: "#f8fafc", accent: "#252731" },
};

export type ArchitectureLayoutMode =
  | "workflow"
  | "high-level"
  | "dependency"
  | "backend"
  | "database"
  | "api-flow";

export interface ArchitectureElementOptions {
  offsetX?: number;
  offsetY?: number;
  layoutMode?: ArchitectureLayoutMode;
}

function id(prefix: string, source: string) {
  return `architecture-${prefix}-${source.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

export function getNodeIcon(node: ArchitectureNode): string {
  const name = (node.name + " " + (node.technology || "")).toLowerCase();
  if (/next|react|fe|frontend|web|client|ui|page/i.test(name)) return "🌐";
  if (/http|api|router|route|express|fastapi|flask/i.test(name)) return "⚡";
  if (/db|database|prisma|postgres|sql|mongo|store|model/i.test(name)) return "🗄️";
  if (/ws|socket|realtime|collaboration/i.test(name)) return "📡";
  if (/auth|jwt|security|guard|permission/i.test(name)) return "🔒";
  if (/worker|queue|cron|task|job|celery/i.test(name)) return "⚙️";
  if (/ai|llm|agent|gemini|openai|claude/i.test(name)) return "🤖";
  if (/repo|workspace|project|git/i.test(name)) return "🚀";
  if (/shared|common|types|lib|util/i.test(name)) return "📦";
  if (/cloud|docker|k8s|infra|deploy/i.test(name)) return "☁️";
  return "⚡";
}

export function getSatelliteIcon(node: ArchitectureNode): string {
  const name = (node.name + " " + node.id).toLowerCase();
  if (/page|view|screen|layout/i.test(name)) return "📄";
  if (/route|controller|handler|api/i.test(name)) return "⚡";
  if (/model|schema|table|entity|sql/i.test(name)) return "🗄️";
  if (/auth|token|jwt|session/i.test(name)) return "🔑";
  if (/socket|ws|event/i.test(name)) return "📡";
  if (/worker|job|task/i.test(name)) return "⚙️";
  if (/ai|llm|bot/i.test(name)) return "🤖";
  return "📄";
}

export function isSatelliteNode(node: ArchitectureNode): boolean {
  return node.id.startsWith("file:");
}

/**
 * Workflow Hub & Spoke Pipeline Layout (Inspired by modern node engines like n8n/ComfyUI)
 * Primary services form a clean horizontal pipeline with satellite sub-nodes (tools/routes/models)
 * fanning out cleanly underneath.
 */
function computeWorkflowLayout(
  graph: ArchitectureGraph,
  offsetX = 100,
  offsetY = 100,
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const nodes = graph.nodes;
  if (!nodes.length) return positions;

  const hubs: ArchitectureNode[] = [];
  const satellitesByHub = new Map<string, ArchitectureNode[]>();
  const unmappedSatellites: ArchitectureNode[] = [];

  for (const node of nodes) {
    if (isSatelliteNode(node)) {
      let parentHub: ArchitectureNode | undefined;
      for (const edge of graph.edges) {
        if (edge.target === node.id && edge.relationship === "contains") {
          parentHub = nodes.find((n) => n.id === edge.source);
          break;
        }
      }
      if (!parentHub) {
        parentHub = nodes.find(
          (n) =>
            !isSatelliteNode(n) &&
            n.files?.some((f) => f === node.id.replace("file:", "")),
        );
      }
      if (parentHub) {
        if (!satellitesByHub.has(parentHub.id)) {
          satellitesByHub.set(parentHub.id, []);
        }
        satellitesByHub.get(parentHub.id)!.push(node);
      } else {
        unmappedSatellites.push(node);
      }
    } else {
      hubs.push(node);
    }
  }

  // 6 Pipeline Stages: Trigger -> Client -> Ingress/API -> Realtime/Workers -> DB -> External/Shared
  const stages: Record<number, ArchitectureNode[]> = {
    0: [],
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
  };

  for (const hub of hubs) {
    if (hub.id === "repository" || hub.type === "repository") {
      stages[0].push(hub);
    } else if (hub.type === "frontend" || hub.type === "page") {
      stages[1].push(hub);
    } else if (hub.type === "api" || hub.type === "auth") {
      stages[2].push(hub);
    } else if (
      hub.type === "realtime" ||
      hub.type === "worker" ||
      hub.type === "service"
    ) {
      stages[3].push(hub);
    } else if (hub.type === "database") {
      stages[4].push(hub);
    } else {
      stages[5].push(hub);
    }
  }

  const STAGE_SPACING = 480;
  let currentStageX = offsetX;

  for (let s = 0; s <= 5; s++) {
    const stageHubs = stages[s] || [];
    if (!stageHubs.length) continue;

    stageHubs.forEach((hub, hubIdx) => {
      const hubX = currentStageX;
      const hubY = offsetY + 80 + hubIdx * (HEIGHT + 280);
      positions.set(hub.id, { x: hubX, y: hubY });

      // Position subcomponent capsule chips under the hub
      const sats = (satellitesByHub.get(hub.id) || []).slice(0, 6);
      const satCount = sats.length;
      if (satCount > 0) {
        const cols = satCount <= 3 ? 1 : 2;
        const totalW = cols === 1 ? SAT_WIDTH : 2 * SAT_WIDTH + 14;
        const startSatX = hubX + (WIDTH - totalW) / 2;

        sats.forEach((sat, satIdx) => {
          let col = 0;
          let row = satIdx;
          if (cols === 2) {
            col = satIdx % 2;
            row = Math.floor(satIdx / 2);
          }
          const satX = startSatX + col * (SAT_WIDTH + 14);
          const satY = hubY + HEIGHT + 28 + row * (SAT_HEIGHT + 10);
          positions.set(sat.id, { x: satX, y: satY });
        });
      }
    });

    currentStageX += STAGE_SPACING;
  }

  // Fallback for unmapped nodes
  unmappedSatellites.forEach((sat, idx) => {
    positions.set(sat.id, {
      x: offsetX + (idx % 6) * 100,
      y: offsetY + 580 + Math.floor(idx / 6) * 100,
    });
  });

  nodes.forEach((n, idx) => {
    if (!positions.has(n.id)) {
      positions.set(n.id, {
        x: offsetX + (idx % 4) * (WIDTH + X_GAP),
        y: offsetY + Math.floor(idx / 4) * (HEIGHT + Y_GAP),
      });
    }
  });

  return positions;
}

export function computeArchitectureLayout(
  graph: ArchitectureGraph,
  mode: ArchitectureLayoutMode = "workflow",
  offsetX = 100,
  offsetY = 100,
): Map<string, { x: number; y: number }> {
  if (mode === "workflow") {
    return computeWorkflowLayout(graph, offsetX, offsetY);
  }

  const positions = new Map<string, { x: number; y: number }>();
  const nodes = graph.nodes;
  if (!nodes.length) return positions;

  switch (mode) {
    case "high-level": {
      const tiers: Record<number, ArchitectureNode[]> = {
        0: [],
        1: [],
        2: [],
        3: [],
        4: [],
        5: [],
        6: [],
      };

      for (const node of nodes) {
        if (node.id === "repository" || node.type === "repository") tiers[0].push(node);
        else if (node.type === "frontend" || node.type === "page") tiers[1].push(node);
        else if (node.type === "api") tiers[2].push(node);
        else if (node.type === "service" || node.type === "auth" || node.type === "shared") tiers[3].push(node);
        else if (node.type === "realtime" || node.type === "worker") tiers[4].push(node);
        else if (node.type === "database") tiers[5].push(node);
        else tiers[6].push(node);
      }

      let currentY = offsetY;
      for (let t = 0; t <= 6; t++) {
        const tierNodes = tiers[t] || [];
        if (!tierNodes.length) continue;
        const perRow = Math.min(tierNodes.length, 5);
        const rowCount = Math.ceil(tierNodes.length / perRow);

        tierNodes.forEach((node, idx) => {
          const col = idx % perRow;
          const row = Math.floor(idx / perRow);
          const itemsInThisRow = Math.min(perRow, tierNodes.length - row * perRow);
          const rowOffset = ((5 - itemsInThisRow) * (WIDTH + X_GAP)) / 2;
          const x = offsetX + rowOffset + col * (WIDTH + X_GAP);
          const y = currentY + row * (HEIGHT + Y_GAP);
          positions.set(node.id, { x, y });
        });

        currentY += rowCount * (HEIGHT + Y_GAP) + 30;
      }
      break;
    }

    case "api-flow": {
      const stages: Record<number, ArchitectureNode[]> = {
        0: [],
        1: [],
        2: [],
        3: [],
        4: [],
        5: [],
      };

      for (const node of nodes) {
        if (node.type === "frontend" || node.type === "page") stages[0].push(node);
        else if (node.type === "api") stages[1].push(node);
        else if (node.type === "auth") stages[2].push(node);
        else if (node.type === "service" || node.type === "shared") stages[3].push(node);
        else if (node.type === "database" || node.type === "worker" || node.type === "realtime") stages[4].push(node);
        else stages[5].push(node);
      }

      for (let s = 0; s <= 5; s++) {
        const stageNodes = stages[s] || [];
        const x = offsetX + s * (WIDTH + X_GAP + 30);
        stageNodes.forEach((node, idx) => {
          const y = offsetY + idx * (HEIGHT + 40);
          positions.set(node.id, { x, y });
        });
      }
      break;
    }

    case "database": {
      const dbNodes = nodes.filter((n) => n.type === "database");
      const connectedToDb = new Set<string>();
      graph.edges.forEach((e) => {
        if (dbNodes.some((d) => d.id === e.target)) connectedToDb.add(e.source);
        if (dbNodes.some((d) => d.id === e.source)) connectedToDb.add(e.target);
      });

      const related = nodes.filter((n) => connectedToDb.has(n.id) && n.type !== "database");
      const others = nodes.filter((n) => !connectedToDb.has(n.id) && n.type !== "database");

      const dbX = offsetX + WIDTH + X_GAP + 60;
      dbNodes.forEach((node, idx) => {
        positions.set(node.id, { x: dbX, y: offsetY + idx * (HEIGHT + 60) });
      });

      const leftNodes = related.filter((n) => n.type === "api" || n.type === "service");
      leftNodes.forEach((node, idx) => {
        positions.set(node.id, { x: offsetX, y: offsetY + idx * (HEIGHT + 50) });
      });

      const rightNodes = related.filter((n) => n.type !== "api" && n.type !== "service");
      const rightX = dbX + WIDTH + X_GAP + 60;
      rightNodes.forEach((node, idx) => {
        positions.set(node.id, { x: rightX, y: offsetY + idx * (HEIGHT + 50) });
      });

      const bottomY = offsetY + Math.max(dbNodes.length, leftNodes.length, rightNodes.length, 1) * (HEIGHT + 60) + 40;
      others.forEach((node, idx) => {
        const col = idx % 4;
        const row = Math.floor(idx / 4);
        positions.set(node.id, {
          x: offsetX + col * (WIDTH + X_GAP),
          y: bottomY + row * (HEIGHT + Y_GAP),
        });
      });
      break;
    }

    case "backend": {
      const backendTypes = new Set(["api", "service", "auth", "database", "worker", "realtime"]);
      const beNodes = nodes.filter((n) => backendTypes.has(n.type));
      const feNodes = nodes.filter((n) => !backendTypes.has(n.type));

      const beTiers: Record<number, ArchitectureNode[]> = { 0: [], 1: [], 2: [], 3: [] };
      for (const node of beNodes) {
        if (node.type === "api") beTiers[0].push(node);
        else if (node.type === "auth" || node.type === "service") beTiers[1].push(node);
        else if (node.type === "realtime" || node.type === "worker") beTiers[2].push(node);
        else beTiers[3].push(node);
      }

      let yCursor = offsetY;
      for (let t = 0; t <= 3; t++) {
        const list = beTiers[t] || [];
        list.forEach((node, idx) => {
          positions.set(node.id, {
            x: offsetX + idx * (WIDTH + X_GAP),
            y: yCursor,
          });
        });
        if (list.length > 0) yCursor += HEIGHT + Y_GAP + 20;
      }

      feNodes.forEach((node, idx) => {
        const col = idx % 3;
        const row = Math.floor(idx / 3);
        positions.set(node.id, {
          x: offsetX + 4 * (WIDTH + X_GAP) + col * (WIDTH + 40),
          y: offsetY + row * (HEIGHT + 40),
        });
      });
      break;
    }

    case "dependency":
    default: {
      const inDegree = new Map<string, number>();
      const outEdges = new Map<string, string[]>();
      nodes.forEach((n) => {
        inDegree.set(n.id, 0);
        outEdges.set(n.id, []);
      });

      graph.edges.forEach((e) => {
        inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
        outEdges.get(e.source)?.push(e.target);
      });

      const ranks = new Map<string, number>();
      const queue: string[] = [];
      nodes.forEach((n) => {
        if ((inDegree.get(n.id) || 0) === 0) {
          ranks.set(n.id, 0);
          queue.push(n.id);
        }
      });

      while (queue.length > 0) {
        const current = queue.shift()!;
        const currentRank = ranks.get(current) || 0;
        const targets = outEdges.get(current) || [];
        for (const target of targets) {
          const nextRank = Math.max(ranks.get(target) || 0, currentRank + 1);
          ranks.set(target, Math.min(nextRank, 6));
          queue.push(target);
        }
      }

      nodes.forEach((n) => {
        if (!ranks.has(n.id)) ranks.set(n.id, 0);
      });

      const rankGroups = new Map<number, ArchitectureNode[]>();
      nodes.forEach((n) => {
        const r = ranks.get(n.id) || 0;
        if (!rankGroups.has(r)) rankGroups.set(r, []);
        rankGroups.get(r)!.push(n);
      });

      rankGroups.forEach((group, r) => {
        group.forEach((node, idx) => {
          positions.set(node.id, {
            x: offsetX + r * (WIDTH + X_GAP + 20),
            y: offsetY + idx * (HEIGHT + 45),
          });
        });
      });
      break;
    }
  }

  nodes.forEach((n, idx) => {
    if (!positions.has(n.id)) {
      positions.set(n.id, {
        x: offsetX + (idx % 4) * (WIDTH + X_GAP),
        y: offsetY + Math.floor(idx / 4) * (HEIGHT + Y_GAP),
      });
    }
  });

  return positions;
}

export function architectureGraphToExcalidrawElements(
  graph: ArchitectureGraph,
  options: ArchitectureElementOptions = {},
) {
  const elements: any[] = [];
  const offsetX = options.offsetX || 100;
  const offsetY = options.offsetY || 100;
  const layoutMode = options.layoutMode || "workflow";
  const positions = computeArchitectureLayout(graph, layoutMode, offsetX, offsetY);
  const nodeElements = new Map<string, any>();

  // 1. Render Nodes
  graph.nodes.forEach((node) => {
    const position = positions.get(node.id) || { x: offsetX, y: offsetY };
    const x = position.x;
    const y = position.y;
    const shapeId = id("node", node.id);
    const groupId = id("group", node.id);
    const colors = COLORS[node.type] || COLORS.service;
    const isSat = isSatelliteNode(node);

    const customData = {
      architecture: true,
      architectureNodeId: node.id,
      repositoryCommit: graph.repository.commitSha,
    };

    if (isSat) {
      // ── Architecture Subcomponent Capsule Chip ──
      const icon = getSatelliteIcon(node);
      const rawName = node.name.replace(/^file:/, "");
      const cleanName =
        rawName.length > 20 ? rawName.slice(0, 18) + "…" : rawName;

      // 1. Capsule container
      const capsuleElement = {
        id: shapeId,
        type: "rectangle",
        x,
        y,
        width: SAT_WIDTH,
        height: SAT_HEIGHT,
        angle: 0,
        strokeColor: colors.stroke,
        backgroundColor: "#111520",
        fillStyle: "solid",
        strokeWidth: 1.5,
        strokeStyle: "solid",
        roughness: 0,
        opacity: 95,
        groupIds: [groupId],
        frameId: null,
        roundness: { type: 3 },
        seed: Math.floor(Math.random() * 100000),
        version: 1,
        versionNonce: Math.floor(Math.random() * 100000),
        isDeleted: false,
        boundElements: [],
        updated: Date.now(),
        link: null,
        locked: false,
        customData,
      };

      // 2. Icon in Capsule
      const iconElement = {
        id: id("sat-icon", node.id),
        type: "text",
        x: x + 8,
        y: y + 7,
        width: 22,
        height: 20,
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
        text: icon,
        fontSize: 13,
        fontFamily: 2,
        textAlign: "center",
        verticalAlign: "middle",
        containerId: null,
        originalText: icon,
        lineHeight: 1.2,
      };

      // 3. Label Text inside Capsule
      const labelElement = {
        id: id("sat-label", node.id),
        type: "text",
        x: x + 32,
        y: y + 8,
        width: SAT_WIDTH - 38,
        height: 20,
        angle: 0,
        strokeColor: "#e2e8f0",
        backgroundColor: "transparent",
        fillStyle: "solid",
        strokeWidth: 1,
        strokeStyle: "solid",
        roughness: 0,
        opacity: 95,
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
        text: cleanName,
        fontSize: 11,
        fontFamily: 2,
        textAlign: "left",
        verticalAlign: "middle",
        containerId: null,
        originalText: cleanName,
        lineHeight: 1.2,
      };

      nodeElements.set(node.id, capsuleElement);
      elements.push(capsuleElement, iconElement, labelElement);
    } else {
      // ── Main Workflow Service Card ──
      const icon = getNodeIcon(node);

      // 1. Card Container
      const cardElement = {
        id: shapeId,
        type: "rectangle",
        x,
        y,
        width: WIDTH,
        height: HEIGHT,
        angle: 0,
        strokeColor: colors.stroke,
        backgroundColor: "#161922",
        fillStyle: "solid",
        strokeWidth: 2,
        strokeStyle: "solid",
        roughness: 0,
        opacity: 100,
        groupIds: [groupId],
        frameId: null,
        roundness: { type: 3 },
        seed: Math.floor(Math.random() * 100000),
        version: 1,
        versionNonce: Math.floor(Math.random() * 100000),
        isDeleted: false,
        boundElements: [],
        updated: Date.now(),
        link: null,
        locked: false,
        customData,
      };

      // 2. Left Icon Box
      const iconBoxElement = {
        id: id("icon-box", node.id),
        type: "rectangle",
        x: x + 10,
        y: y + 14,
        width: 44,
        height: 56,
        angle: 0,
        strokeColor: colors.stroke,
        backgroundColor: "#0e1118",
        fillStyle: "solid",
        strokeWidth: 1.5,
        strokeStyle: "solid",
        roughness: 0,
        opacity: 100,
        groupIds: [groupId],
        frameId: null,
        roundness: { type: 3 },
        seed: Math.floor(Math.random() * 100000),
        version: 1,
        versionNonce: Math.floor(Math.random() * 100000),
        isDeleted: false,
        boundElements: null,
        updated: Date.now(),
        link: null,
        locked: false,
      };

      // 3. Icon Text inside Box
      const iconTextElement = {
        id: id("icon-text", node.id),
        type: "text",
        x: x + 12,
        y: y + 26,
        width: 40,
        height: 28,
        angle: 0,
        strokeColor: "#f8fafc",
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
        text: icon,
        fontSize: 20,
        fontFamily: 2,
        textAlign: "center",
        verticalAlign: "middle",
        containerId: null,
        originalText: icon,
        lineHeight: 1.2,
      };

      // 4. Card Title Text
      const titleElement = {
        id: id("title", node.id),
        type: "text",
        x: x + 62,
        y: y + 18,
        width: 165,
        height: 22,
        angle: 0,
        strokeColor: "#f8fafc",
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
        text: node.name,
        fontSize: 13,
        fontFamily: 2,
        textAlign: "left",
        verticalAlign: "middle",
        containerId: null,
        originalText: node.name,
        lineHeight: 1.2,
      };

      // 5. Tech Tag Subtitle
      const techText = (node.technology || node.type).toUpperCase();
      const techElement = {
        id: id("tech", node.id),
        type: "text",
        x: x + 62,
        y: y + 44,
        width: 165,
        height: 18,
        angle: 0,
        strokeColor: colors.stroke,
        backgroundColor: "transparent",
        fillStyle: "solid",
        strokeWidth: 1,
        strokeStyle: "solid",
        roughness: 0,
        opacity: 90,
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
        text: techText,
        fontSize: 9,
        fontFamily: 2,
        textAlign: "left",
        verticalAlign: "middle",
        containerId: null,
        originalText: techText,
        lineHeight: 1.2,
      };

      // 6. Left Dock Port (Input Terminal Dot)
      const inputPortOuter = {
        id: id("in-port-outer", node.id),
        type: "ellipse",
        x: x - 6,
        y: y + 38,
        width: 12,
        height: 12,
        angle: 0,
        strokeColor: colors.stroke,
        backgroundColor: "#0b0f19",
        fillStyle: "solid",
        strokeWidth: 1.5,
        strokeStyle: "solid",
        roughness: 0,
        opacity: 100,
        groupIds: [groupId],
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
      };

      const inputPortInner = {
        id: id("in-port-inner", node.id),
        type: "ellipse",
        x: x - 3,
        y: y + 41,
        width: 6,
        height: 6,
        angle: 0,
        strokeColor: colors.stroke,
        backgroundColor: colors.stroke,
        fillStyle: "solid",
        strokeWidth: 1,
        strokeStyle: "solid",
        roughness: 0,
        opacity: 100,
        groupIds: [groupId],
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
      };

      // 7. Right Dock Port (Output Terminal Dot)
      const outputPortOuter = {
        id: id("out-port-outer", node.id),
        type: "ellipse",
        x: x + WIDTH - 6,
        y: y + 38,
        width: 12,
        height: 12,
        angle: 0,
        strokeColor: colors.stroke,
        backgroundColor: "#0b0f19",
        fillStyle: "solid",
        strokeWidth: 1.5,
        strokeStyle: "solid",
        roughness: 0,
        opacity: 100,
        groupIds: [groupId],
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
      };

      const outputPortInner = {
        id: id("out-port-inner", node.id),
        type: "ellipse",
        x: x + WIDTH - 3,
        y: y + 41,
        width: 6,
        height: 6,
        angle: 0,
        strokeColor: colors.stroke,
        backgroundColor: colors.stroke,
        fillStyle: "solid",
        strokeWidth: 1,
        strokeStyle: "solid",
        roughness: 0,
        opacity: 100,
        groupIds: [groupId],
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
      };

      nodeElements.set(node.id, cardElement);
      elements.push(
        cardElement,
        iconBoxElement,
        iconTextElement,
        titleElement,
        techElement,
        inputPortOuter,
        inputPortInner,
        outputPortOuter,
        outputPortInner,
      );
    }
  });

  // 2. Render Edges
  for (const edge of graph.edges) {
    const sourceNode = graph.nodes.find((n) => n.id === edge.source);
    const targetNode = graph.nodes.find((n) => n.id === edge.target);
    const sourcePos = positions.get(edge.source);
    const targetPos = positions.get(edge.target);
    const sourceElement = nodeElements.get(edge.source);
    const targetElement = nodeElements.get(edge.target);
    if (!sourcePos || !targetPos || !sourceElement || !targetElement || !sourceNode || !targetNode) {
      continue;
    }

    const isTargetSat = isSatelliteNode(targetNode);
    const isSourceSat = isSatelliteNode(sourceNode);

    if (edge.relationship === "contains") {
      // Subcomponent subtle vertical connector (from bottom center of parent card to top center of capsule)
      if (isTargetSat) {
        const startX = sourcePos.x + WIDTH / 2;
        const startY = sourcePos.y + HEIGHT;
        const endX = targetPos.x + SAT_WIDTH / 2;
        const endY = targetPos.y;
        const arrowId = id("edge", edge.id);
        const dx = endX - startX;
        const dy = endY - startY;

        const subTreeLine = {
          id: arrowId,
          type: "arrow",
          x: startX,
          y: startY,
          width: Math.abs(dx),
          height: Math.abs(dy),
          angle: 0,
          strokeColor: "#475569",
          backgroundColor: "transparent",
          fillStyle: "solid",
          strokeWidth: 1.5,
          strokeStyle: "dashed",
          roughness: 0,
          opacity: 65,
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
          startBinding: null,
          endBinding: null,
          startArrowhead: null,
          endArrowhead: null,
          customData: {
            architecture: true,
            architectureEdgeId: edge.id,
          },
        };

        elements.push(subTreeLine);
      }
      continue;
    }

    // Pipeline or inter-component edge
    let startX: number;
    let startY: number;
    let endX: number;
    let endY: number;

    if (!isSourceSat && !isTargetSat) {
      // Connect right dock port of source to left dock port of target
      startX = sourcePos.x + WIDTH + 6;
      startY = sourcePos.y + 44;
      endX = targetPos.x - 6;
      endY = targetPos.y + 44;
    } else {
      const srcW = isSourceSat ? SAT_WIDTH : WIDTH;
      const srcH = isSourceSat ? SAT_HEIGHT : HEIGHT;
      const tgtW = isTargetSat ? SAT_WIDTH : WIDTH;
      const tgtH = isTargetSat ? SAT_HEIGHT : HEIGHT;
      const centerDx = targetPos.x + tgtW / 2 - (sourcePos.x + srcW / 2);
      const centerDy = targetPos.y + tgtH / 2 - (sourcePos.y + srcH / 2);

      if (Math.abs(centerDx) >= Math.abs(centerDy)) {
        if (centerDx > 0) {
          startX = sourcePos.x + srcW;
          endX = targetPos.x;
        } else {
          startX = sourcePos.x;
          endX = targetPos.x + tgtW;
        }
        startY = sourcePos.y + srcH / 2;
        endY = targetPos.y + tgtH / 2;
      } else {
        if (centerDy > 0) {
          startY = sourcePos.y + srcH;
          endY = targetPos.y;
        } else {
          startY = sourcePos.y;
          endY = targetPos.y + tgtH;
        }
        startX = sourcePos.x + srcW / 2;
        endX = targetPos.x + tgtW / 2;
      }
    }

    const arrowId = id("edge", edge.id);
    const dx = endX - startX;
    const dy = endY - startY;

    const pipelineArrow = {
      id: arrowId,
      type: "arrow",
      x: startX,
      y: startY,
      width: Math.abs(dx),
      height: Math.abs(dy),
      angle: 0,
      strokeColor: edge.inferred ? "#64748b" : "#818cf8",
      backgroundColor: "transparent",
      fillStyle: "solid",
      strokeWidth: 2,
      strokeStyle: edge.inferred ? "dashed" : "solid",
      roughness: 0,
      opacity: 95,
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
      startBinding: null,
      endBinding: null,
      startArrowhead: null,
      endArrowhead: "arrow",
      customData: {
        architecture: true,
        architectureEdgeId: edge.id,
      },
    };

    elements.push(pipelineArrow);

    // Flow Label Pill along the arrow
    if (edge.label && edge.label !== "contains" && edge.label !== "contains file") {
      const midX = (startX + endX) / 2;
      const midY = (startY + endY) / 2;
      const labelText = edge.label;
      const labelWidth = Math.min(220, Math.max(80, labelText.length * 7.5));
      const edgeLabelId = id("edge-label", edge.id);

      elements.push({
        id: id("edge-label-bg", edge.id),
        type: "rectangle",
        x: midX - labelWidth / 2 - 6,
        y: midY - 11,
        width: labelWidth + 12,
        height: 22,
        angle: 0,
        strokeColor: "#334155",
        backgroundColor: "#0d111a",
        fillStyle: "solid",
        strokeWidth: 1,
        strokeStyle: "solid",
        roughness: 0,
        opacity: 95,
        groupIds: [],
        frameId: null,
        roundness: { type: 3 },
        seed: Math.floor(Math.random() * 100000),
        version: 1,
        versionNonce: Math.floor(Math.random() * 100000),
        isDeleted: false,
        boundElements: null,
        updated: Date.now(),
        link: null,
        locked: false,
      });

      elements.push({
        id: edgeLabelId,
        type: "text",
        x: midX - labelWidth / 2,
        y: midY - 8,
        width: labelWidth,
        height: 16,
        angle: 0,
        strokeColor: edge.inferred ? "#94a3b8" : "#c7d2fe",
        backgroundColor: "transparent",
        fillStyle: "solid",
        strokeWidth: 1,
        strokeStyle: "solid",
        roughness: 0,
        opacity: 95,
        groupIds: [],
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
        text: labelText,
        fontSize: 10,
        fontFamily: 2,
        textAlign: "center",
        verticalAlign: "middle",
        containerId: null,
        originalText: labelText,
        lineHeight: 1.2,
      });
    }
  }

  return elements;
}

export function getArchitectureNodeId(element: any): string | null {
  return element?.customData?.architectureNodeId || null;
}
