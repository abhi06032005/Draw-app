import type {
  ArchitectureGraph,
  ArchitectureNode,
  ArchitectureNodeType,
} from "./architectureTypes";

const WIDTH = 230;
const HEIGHT = 94;
const X_GAP = 110;
const Y_GAP = 78;

const COLORS: Record<
  ArchitectureNodeType,
  { background: string; stroke: string; text: string }
> = {
  repository: { background: "#18181b", stroke: "#a78bfa", text: "#fafafa" },
  frontend: { background: "#082f49", stroke: "#38bdf8", text: "#e0f2fe" },
  page: { background: "#172554", stroke: "#60a5fa", text: "#dbeafe" },
  api: { background: "#312e81", stroke: "#818cf8", text: "#e0e7ff" },
  service: { background: "#3b0764", stroke: "#c084fc", text: "#f3e8ff" },
  auth: { background: "#4a044e", stroke: "#f0abfc", text: "#fdf4ff" },
  database: { background: "#052e16", stroke: "#4ade80", text: "#dcfce7" },
  realtime: { background: "#134e4a", stroke: "#2dd4bf", text: "#ccfbf1" },
  worker: { background: "#422006", stroke: "#fbbf24", text: "#fef3c7" },
  shared: { background: "#1c1917", stroke: "#a8a29e", text: "#f5f5f4" },
  infrastructure: { background: "#082f49", stroke: "#22d3ee", text: "#cffafe" },
  external: { background: "#3f3f46", stroke: "#d4d4d8", text: "#fafafa" },
};

export type ArchitectureLayoutMode =
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

export function computeArchitectureLayout(
  graph: ArchitectureGraph,
  mode: ArchitectureLayoutMode = "high-level",
  offsetX = 100,
  offsetY = 100,
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const nodes = graph.nodes;
  if (!nodes.length) return positions;

  switch (mode) {
    case "high-level": {
      // 7 clean architectural tiers
      const tiers: Record<number, ArchitectureNode[]> = {
        0: [], // Repository
        1: [], // Frontend & Pages
        2: [], // APIs
        3: [], // Services, Auth, Shared
        4: [], // Realtime & Workers
        5: [], // Databases & Storage
        6: [], // Infrastructure & External
      };

      for (const node of nodes) {
        if (node.id === "repository" || node.type === "repository") {
          tiers[0].push(node);
        } else if (node.type === "frontend" || node.type === "page") {
          tiers[1].push(node);
        } else if (node.type === "api") {
          tiers[2].push(node);
        } else if (
          node.type === "service" ||
          node.type === "auth" ||
          node.type === "shared"
        ) {
          tiers[3].push(node);
        } else if (node.type === "realtime" || node.type === "worker") {
          tiers[4].push(node);
        } else if (node.type === "database") {
          tiers[5].push(node);
        } else {
          tiers[6].push(node);
        }
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
          // Center the row
          const itemsInThisRow = Math.min(
            perRow,
            tierNodes.length - row * perRow,
          );
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
      // Horizontal sequential pipeline: Client -> API -> Auth -> Service -> Database / Worker
      const stages: Record<number, ArchitectureNode[]> = {
        0: [], // Client (Frontend / Page)
        1: [], // API Gateway & Routes
        2: [], // Auth Middleware
        3: [], // Core Services & Shared
        4: [], // Database, Storage, Worker
        5: [], // External & Infrastructure
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
      // Database relationships: DB in center column, readers & writers on left and right
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

      // Left column: APIs and Services feeding DB
      const leftNodes = related.filter((n) => n.type === "api" || n.type === "service");
      leftNodes.forEach((node, idx) => {
        positions.set(node.id, { x: offsetX, y: offsetY + idx * (HEIGHT + 50) });
      });

      // Right column: Workers, Auth, and other dependents
      const rightNodes = related.filter((n) => n.type !== "api" && n.type !== "service");
      const rightX = dbX + WIDTH + X_GAP + 60;
      rightNodes.forEach((node, idx) => {
        positions.set(node.id, { x: rightX, y: offsetY + idx * (HEIGHT + 50) });
      });

      // Bottom: other nodes
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
      // Backend focused layout: API -> Service -> DB/Worker
      const backendTypes = new Set(["api", "service", "auth", "database", "worker", "realtime"]);
      const beNodes = nodes.filter((n) => backendTypes.has(n.type));
      const feNodes = nodes.filter((n) => !backendTypes.has(n.type));

      // 4 horizontal backend tiers
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

      // Put frontend nodes in a neat group to the side or top
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
      // Topological directed layout based on in-degree / out-degree
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

      // Fallback for unranked
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

  // Ensure all nodes have coordinates
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

function baseElement(
  node: ArchitectureNode,
  x: number,
  y: number,
  elementId: string,
  groupId: string,
  customData: Record<string, unknown>,
): any {
  const colors = COLORS[node.type];
  return {
    id: elementId,
    type: "rectangle",
    x,
    y,
    width: WIDTH,
    height: HEIGHT,
    angle: 0,
    strokeColor: colors.stroke,
    backgroundColor: colors.background,
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
}

export function architectureGraphToExcalidrawElements(
  graph: ArchitectureGraph,
  options: ArchitectureElementOptions = {},
) {
  const elements: any[] = [];
  const offsetX = options.offsetX || 100;
  const offsetY = options.offsetY || 100;
  const positions = computeArchitectureLayout(
    graph,
    options.layoutMode || "high-level",
    offsetX,
    offsetY,
  );
  const nodeElements = new Map<string, any>();

  graph.nodes.forEach((node) => {
    const position = positions.get(node.id) || { x: offsetX, y: offsetY };
    const x = position.x;
    const y = position.y;
    const shapeId = id("node", node.id);
    const textId = id("label", node.id);
    const groupId = id("group", node.id);
    const customData = {
      architecture: true,
      architectureNodeId: node.id,
      repositoryCommit: graph.repository.commitSha,
    };
    const shape = baseElement(node, x, y, shapeId, groupId, customData);
    shape.boundElements = [{ id: textId, type: "text" }];
    const label = `${node.name}\n${node.technology || node.type}${node.inferred ? " · inferred" : ""}`;
    const text = {
      ...shape,
      id: textId,
      type: "text",
      x: x + 12,
      y: y + 20,
      width: WIDTH - 24,
      height: 54,
      strokeColor: COLORS[node.type].text,
      backgroundColor: "transparent",
      strokeWidth: 1,
      boundElements: null,
      text: label,
      fontSize: 15,
      fontFamily: 2,
      textAlign: "center",
      verticalAlign: "middle",
      containerId: shapeId,
      originalText: label,
      lineHeight: 1.25,
    };
    nodeElements.set(node.id, shape);
    elements.push(shape, text);
  });

  for (const edge of graph.edges) {
    const source = positions.get(edge.source);
    const target = positions.get(edge.target);
    const sourceElement = nodeElements.get(edge.source);
    const targetElement = nodeElements.get(edge.target);
    if (!source || !target || !sourceElement || !targetElement) continue;

    const startX = source.x + WIDTH / 2;
    const startY = source.y + HEIGHT / 2;
    const endX = target.x + WIDTH / 2;
    const endY = target.y + HEIGHT / 2;
    const arrowId = id("edge", edge.id);
    const dx = endX - startX;
    const dy = endY - startY;
    const arrow = {
      id: arrowId,
      type: "arrow",
      x: startX,
      y: startY,
      width: Math.abs(dx),
      height: Math.abs(dy),
      angle: 0,
      strokeColor: edge.inferred ? "#71717a" : "#a78bfa",
      backgroundColor: "transparent",
      fillStyle: "solid",
      strokeWidth: 2,
      strokeStyle: edge.inferred ? "dashed" : "solid",
      roughness: 0,
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
      startBinding: { elementId: sourceElement.id, focus: 0, gap: 8 },
      endBinding: { elementId: targetElement.id, focus: 0, gap: 8 },
      startArrowhead: null,
      endArrowhead: "arrow",
      customData: {
        architecture: true,
        architectureEdgeId: edge.id,
        architectureNodeId: edge.source,
      },
    };
    sourceElement.boundElements.push({ id: arrowId, type: "arrow" });
    targetElement.boundElements.push({ id: arrowId, type: "arrow" });
    elements.push(arrow);
  }

  return elements;
}

export function getArchitectureNodeId(element: any): string | null {
  return element?.customData?.architectureNodeId || null;
}
