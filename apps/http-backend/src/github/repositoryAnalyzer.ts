import ts from "typescript";

import {
  GitHubClient,
  parseGitHubRepositoryUrl,
  type GitHubRepository,
  type GitHubTreeEntry,
} from "./githubClient";
import type {
  AnalysisDepth,
  ArchitectureEdge,
  ArchitectureGraph,
  ArchitectureNode,
  ArchitectureNodeType,
  SourceEvidence,
} from "./types";

const LIMITS: Record<
  AnalysisDepth,
  { files: number; bytes: number; sourceFiles: number }
> = {
  quick: { files: 250, bytes: 1_500_000, sourceFiles: 30 },
  standard: { files: 750, bytes: 4_000_000, sourceFiles: 100 },
  deep: { files: 1_500, bytes: 8_000_000, sourceFiles: 220 },
};

const IGNORED_PARTS = new Set([
  ".git",
  ".next",
  "dist",
  "build",
  "coverage",
  "node_modules",
  "vendor",
  "target",
  "__pycache__",
  ".turbo",
]);
const SOURCE_PATTERN = /\.(?:ts|tsx|js|jsx|mjs|cjs|py)$/i;
const CONFIG_FILES = new Set([
  "package.json",
  "pnpm-workspace.yaml",
  "turbo.json",
  "docker-compose.yml",
  "docker-compose.yaml",
  "Dockerfile",
  "schema.prisma",
  "next.config.js",
  "next.config.mjs",
  "next.config.ts",
]);
const SECRET_PATTERN =
  /(^|\/)(?:\.env(?:\..*)?|.*\.(?:pem|key|crt|p12)|secrets?\.(?:json|ya?ml))$/i;

interface SourceFile {
  path: string;
  content: string;
  githubUrl: string;
}

export interface AnalyzeRepositoryInput {
  url: string;
  branch?: string;
  depth?: AnalysisDepth;
  client?: GitHubClient;
  onStage?: (stage: string) => void | Promise<void>;
}

export async function analyzeRepository(
  input: AnalyzeRepositoryInput,
): Promise<ArchitectureGraph> {
  const parsed = parseGitHubRepositoryUrl(input.url);
  if (!parsed)
    throw new Error(
      "Enter a public GitHub repository URL such as https://github.com/owner/repository.",
    );

  const depth = input.depth || "standard";
  const limits = LIMITS[depth];
  const client = input.client || new GitHubClient();
  await input.onStage?.("connecting");
  const repository = await client.getRepository(parsed.owner, parsed.repo);
  const revision = input.branch?.trim() || repository.default_branch;
  const tree = await client.getTree(parsed.owner, parsed.repo, revision);
  const commitSha = await client.getCommitSha(
    parsed.owner,
    parsed.repo,
    revision,
  );
  const languages = await client
    .getLanguages(parsed.owner, parsed.repo)
    .catch(() => ({}));

  await input.onStage?.("fetching");
  const entries = tree.tree.filter(
    (entry) => entry.type === "blob" && isRelevantPath(entry.path),
  );
  const considered = entries.slice(0, limits.files);
  const warnings: string[] = [];

  if (tree.truncated || entries.length > limits.files) {
    warnings.push(
      `Repository file list was limited to ${limits.files} relevant files for ${depth} analysis.`,
    );
  }

  const selected = selectFiles(considered, limits.sourceFiles);
  const sourceFiles: SourceFile[] = [];
  let bytes = 0;
  let skipped = Math.max(0, entries.length - considered.length);

  // Parallel batch fetching with concurrency pool (avoids 100 serial HTTP roundtrips)
  const CONCURRENCY = 8;
  const queue = [...selected];

  const { owner, repo } = parsed;
  async function fetchWorker() {
    while (queue.length > 0) {
      const entry = queue.shift();
      if (!entry) break;

      if (bytes + (entry.size || 0) > limits.bytes) {
        skipped += 1;
        continue;
      }

      try {
        let content: string;
        // If client supports getFileContent (CDN raw support), use it to avoid consuming 60 req/hr API limit!
        if (typeof (client as any).getFileContent === "function") {
          content = await (client as any).getFileContent(
            owner,
            repo,
            entry,
            commitSha || revision,
          );
        } else {
          content = await client.getBlob(owner, repo, entry.sha);
        }

        if (Buffer.byteLength(content, "utf8") > limits.bytes - bytes) {
          skipped += 1;
          continue;
        }

        bytes += Buffer.byteLength(content, "utf8");
        sourceFiles.push({
          path: entry.path,
          content,
          githubUrl: `https://github.com/${owner}/${repo}/blob/${encodeURIComponent(commitSha)}/${entry.path}`,
        });
      } catch {
        skipped += 1;
        warnings.push(
          `Could not read ${entry.path}; it was omitted from analysis.`,
        );
      }
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(CONCURRENCY, selected.length) },
      () => fetchWorker(),
    ),
  );

  await input.onStage?.("structure");
  const metadata = {
    owner: repository.owner.login,
    name: repository.name,
    fullName: repository.full_name,
    description: repository.description,
    defaultBranch: repository.default_branch,
    commitSha,
    htmlUrl: repository.html_url,
    languages,
  };
  await input.onStage?.("dependencies");
  await input.onStage?.("services");
  await input.onStage?.("building");
  const graph = buildGraph(
    metadata,
    depth,
    sourceFiles,
    considered,
    skipped,
    warnings,
  );
  return graph;
}

function isRelevantPath(path: string): boolean {
  if (SECRET_PATTERN.test(path)) return false;
  const parts = path.split("/");
  if (parts.some((part) => IGNORED_PARTS.has(part))) return false;
  const name = parts[parts.length - 1] || "";
  return SOURCE_PATTERN.test(path) || CONFIG_FILES.has(name);
}

function selectFiles(
  entries: GitHubTreeEntry[],
  limit: number,
): GitHubTreeEntry[] {
  return [...entries]
    .sort(
      (a, b) =>
        Number(isPriorityFile(b.path)) - Number(isPriorityFile(a.path)) ||
        a.path.localeCompare(b.path),
    )
    .slice(0, limit);
}

function isPriorityFile(path: string): boolean {
  const name = path.split("/").pop() || "";
  return (
    CONFIG_FILES.has(name) ||
    /(?:route|controller|service|middleware|auth|socket|worker|prisma|schema)/i.test(
      name,
    )
  );
}

function buildGraph(
  repository: GitHubRepositoryMetadata,
  depth: AnalysisDepth,
  sourceFiles: SourceFile[],
  considered: GitHubTreeEntry[],
  skipped: number,
  warnings: string[],
): ArchitectureGraph {
  const nodes: ArchitectureNode[] = [];
  const edges: ArchitectureEdge[] = [];
  const nodeByKey = new Map<string, ArchitectureNode>();
  const fileNodeByPath = new Map<string, ArchitectureNode>();

  const addNode = (node: ArchitectureNode): ArchitectureNode => {
    const existing = nodeByKey.get(node.id);
    if (existing) {
      existing.files = [...new Set([...existing.files, ...node.files])];
      existing.evidence = mergeEvidence(existing.evidence, node.evidence);
      existing.confidence = Math.max(existing.confidence, node.confidence);
      return existing;
    }
    nodeByKey.set(node.id, node);
    nodes.push(node);
    return node;
  };

  const root = addNode({
    id: "repository",
    name: repository.fullName,
    type: "repository",
    description: repository.description || "Analyzed public GitHub repository.",
    technology:
      Object.keys(repository.languages).slice(0, 3).join(", ") || undefined,
    files: [],
    evidence: [],
    confidence: 1,
    inferred: false,
  });

  for (const file of sourceFiles) {
    const classification = classifyFile(file.path, file.content);
    const cluster = detectArchitectureCluster(file.path, file.content);
    const owner = addNode({
      id: cluster.id,
      name: cluster.name,
      type: cluster.type,
      description: cluster.description,
      technology: cluster.technology,
      files: [file.path],
      evidence: [
        evidence(
          file,
          "Detected from repository structure and source contents.",
        ),
      ],
      confidence: cluster.type === "shared" ? 0.82 : 0.96,
      inferred: false,
    });
    addEdge(
      edges,
      root.id,
      owner.id,
      "contains",
      "contains module",
      [evidence(file, "Module belongs to this repository.")],
      1,
      false,
    );

    if (depth !== "quick" && SOURCE_PATTERN.test(file.path)) {
      const symbolEvidences = extractSymbolsAndEvidence(file);
      const nodeEvidences =
        symbolEvidences.length > 0
          ? symbolEvidences
          : [
              evidence(
                file,
                file.path.endsWith(".py")
                  ? "Python source file analyzed."
                  : "Source file analyzed with syntax-aware parser.",
              ),
            ];
      const fileNode = addNode({
        id: `file:${file.path}`,
        name: file.path.split("/").pop() || file.path,
        type: classification.type,
        description: classification.description,
        technology: classification.technology,
        files: [file.path],
        evidence: nodeEvidences,
        confidence: classification.confidence,
        inferred: classification.inferred,
      });
      owner.evidence = mergeEvidence(owner.evidence, nodeEvidences);
      fileNodeByPath.set(file.path, fileNode);
      addEdge(
        edges,
        owner.id,
        fileNode.id,
        "contains",
        "contains file",
        fileNode.evidence,
        1,
        false,
      );
    }
  }

  for (const file of sourceFiles.filter((item) =>
    SOURCE_PATTERN.test(item.path),
  )) {
    const currentCluster = detectArchitectureCluster(file.path, file.content);
    const currentOwner = nodeByKey.get(currentCluster.id);
    const current = fileNodeByPath.get(file.path) || currentOwner;
    if (!current) continue;
    const imports = extractImports(file);
    for (const imported of imports) {
      const targetPath = resolveLocalImport(file.path, imported, sourceFiles);
      if (targetPath) {
        const targetCluster = detectArchitectureCluster(targetPath, "");
        const targetOwner = nodeByKey.get(targetCluster.id);
        const target = fileNodeByPath.get(targetPath) || targetOwner;
        if (target && target.id !== current.id) {
          addEdge(
            edges,
            current.id,
            target.id,
            "imports",
            "imports",
            [importEvidence(file, imported)],
            1,
            false,
          );
        }
        if (
          currentOwner &&
          targetOwner &&
          currentOwner.id !== targetOwner.id
        ) {
          addEdge(
            edges,
            currentOwner.id,
            targetOwner.id,
            "depends-on",
            "imports / calls",
            [importEvidence(file, imported)],
            0.92,
            false,
          );
        }
      } else if (
        /^(react|next|express|prisma|socket\.io|axios|pg|redis|bullmq|@aws-sdk|firebase)/i.test(
          imported,
        )
      ) {
        const external = addNode({
          id: `external:${imported}`,
          name: imported,
          type: "external",
          description: "External package referenced by repository source.",
          technology: imported,
          files: [file.path],
          evidence: [importEvidence(file, imported)],
          confidence: 1,
          inferred: false,
        });
        addEdge(
          edges,
          current.id,
          external.id,
          "depends-on",
          "uses package",
          [importEvidence(file, imported)],
          1,
          false,
        );
      }
    }
  }

  detectCrossModuleInteractions(nodes, edges, sourceFiles, addEdge);
  addDetectedInfrastructure(nodes, edges, sourceFiles, addNode);
  return {
    version: 1,
    repository,
    depth,
    nodes: nodes.slice(
      0,
      depth === "quick" ? 80 : depth === "standard" ? 220 : 450,
    ),
    edges: edges.slice(
      0,
      depth === "quick" ? 160 : depth === "standard" ? 600 : 1200,
    ),
    stats: {
      filesConsidered: considered.length,
      filesAnalyzed: sourceFiles.length,
      filesSkipped: skipped,
      truncated: warnings.length > 0,
    },
    warnings,
  };
}

type GitHubRepositoryMetadata = ArchitectureGraph["repository"];

function classifyFile(
  path: string,
  content: string,
): {
  type: ArchitectureNodeType;
  description: string;
  technology?: string;
  confidence: number;
  inferred: boolean;
} {
  const name = path.split("/").pop() || path;
  if (/prisma|schema\.prisma|\.sql$/i.test(path) || /models\.Model|declarative_base|Base\s*=|sqlalchemy|peewee|tortoise/i.test(content))
    return {
      type: "database",
      description: "Database schema or persistence model definition.",
      technology: path.endsWith(".py") ? "Python ORM / SQL" : "Prisma / SQL",
      confidence: 1,
      inferred: false,
    };
  if (
    /(route|controller|api|resolver)/i.test(path) ||
    /app\.(get|post|put|delete)|router\.(get|post|put|delete)/.test(content) ||
    /@(?:app|router|bp)\.(get|post|put|delete|patch|route)|FastAPI\(|APIRouter\(|Flask\(__name__\)/.test(content)
  )
    return {
      type: "api",
      description:
        "HTTP or RPC entry point detected from file path or route declarations.",
      technology: path.endsWith(".py") ? "Python API (FastAPI / Flask)" : "HTTP API",
      confidence: 0.94,
      inferred: false,
    };
  if (
    /(auth|login|session|jwt|permission|middleware)/i.test(name) ||
    /jsonwebtoken|next-auth|passport|authorize|authenticate|OAuth2PasswordBearer|pyjwt|flask_login/i.test(content)
  )
    return {
      type: "auth",
      description: "Authentication or authorization responsibility detected.",
      technology: "Authentication",
      confidence: 0.9,
      inferred: false,
    };
  if (
    /(socket|websocket|realtime)/i.test(name) ||
    /socket\.io|WebSocket|server-broadcast|asyncio\.Queue|websockets/i.test(content)
  )
    return {
      type: "realtime",
      description: "Real-time communication responsibility detected.",
      technology: "WebSocket",
      confidence: 0.95,
      inferred: false,
    };
  if (
    /(worker|queue|job|cron|schedule)/i.test(name) ||
    /bullmq|agenda|node-cron|setInterval|celery|Celery|rq|redis_queue/i.test(content)
  )
    return {
      type: "worker",
      description: "Background processing or scheduled work detected.",
      technology: path.endsWith(".py") ? "Celery / Python Worker" : "Worker / Queue",
      confidence: 0.85,
      inferred: false,
    };
  if (
    /(page|layout|component|app\/|pages\/)/i.test(path) ||
    /from ["']react["']|useState\(|useEffect\(/.test(content)
  )
    return {
      type:
        path.includes("page") || path.includes("app/") ? "page" : "frontend",
      description: "Frontend page or UI component detected.",
      technology: "React / Next.js",
      confidence: 0.88,
      inferred: false,
    };
  if (/(package|shared|common|lib|utils|types)/i.test(path))
    return {
      type: "shared",
      description: "Reusable shared library or utility code.",
      technology: path.endsWith(".py") ? "Python Module" : "JavaScript / TypeScript",
      confidence: 0.7,
      inferred: true,
    };
  return {
    type: "service",
    description: "Application source file grouped as a service area.",
    technology: path.endsWith(".py") ? "Python Service" : "JavaScript / TypeScript",
    confidence: 0.62,
    inferred: true,
  };
}

function extractImports(file: SourceFile): string[] {
  if (file.path.endsWith(".py")) {
    const fromMatches = [...file.content.matchAll(/from\s+([a-zA-Z0-9_.]+)\s+import/g)].map((m) => m[1] || "");
    const importMatches = [...file.content.matchAll(/import\s+([a-zA-Z0-9_., ]+)/g)].flatMap((m) =>
      (m[1] || "").split(",").map((s) => s.trim().split(" ")[0] || ""),
    );
    return [...new Set([...fromMatches, ...importMatches])].filter(Boolean);
  }
  const source = ts.createSourceFile(
    file.path,
    file.content,
    ts.ScriptTarget.Latest,
    true,
    scriptKind(file.path),
  );
  const imports = new Set<string>();
  source.forEachChild((node) => {
    if (
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier)
    )
      imports.add(node.moduleSpecifier.text);
    if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    )
      imports.add(node.moduleSpecifier.text);
    if (
      ts.isCallExpression(node) &&
      node.expression.getText(source) === "require" &&
      node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0])
    )
      imports.add(node.arguments[0].text);
  });
  return [...imports];
}

function scriptKind(path: string): ts.ScriptKind {
  if (path.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (path.endsWith(".jsx")) return ts.ScriptKind.JSX;
  if (path.endsWith(".js") || path.endsWith(".mjs") || path.endsWith(".cjs"))
    return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

function resolveLocalImport(
  from: string,
  imported: string,
  files: SourceFile[],
): string | null {
  if (!imported.startsWith(".")) {
    // Check python relative / package imports
    if (from.endsWith(".py")) {
      const pyBase = imported.replace(/\./g, "/");
      const cand = files.find((f) => f.path.endsWith(`${pyBase}.py`) || f.path.endsWith(`${pyBase}/__init__.py`));
      if (cand) return cand.path;
    }
    return null;
  }
  const base = normalizePath(
    `${from.split("/").slice(0, -1).join("/")}/${imported}`,
  );
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.jsx`,
    `${base}.py`,
    `${base}/index.ts`,
    `${base}/index.tsx`,
    `${base}/index.js`,
    `${base}/__init__.py`,
  ];
  return (
    candidates.find((candidate) =>
      files.some((file) => file.path === candidate),
    ) || null
  );
}

function normalizePath(path: string): string {
  const parts: string[] = [];
  for (const part of path.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") parts.pop();
    else parts.push(part);
  }
  return parts.join("/");
}

function topLevelOwner(path: string): string {
  const norm = path.replace(/\\/g, "/");
  const parts = norm.split("/").filter(Boolean);
  if (
    parts.length >= 2 &&
    /^(apps|packages|services|modules)$/i.test(parts[0] || "")
  ) {
    return `${parts[0]}/${parts[1]}`;
  }
  for (const part of parts.slice(0, -1)) {
    const p = part.toLowerCase();
    if (/routes|controllers|api|endpoints/i.test(p)) return "api";
    if (/models|entities|db|database|prisma|schemas/i.test(p)) return "database";
    if (/services|domain|business/i.test(p)) return "services";
    if (/middleware|auth|security|guards/i.test(p)) return "auth";
    if (/realtime|sockets|ws/i.test(p)) return "realtime";
    if (/workers|queues|tasks|jobs/i.test(p)) return "workers";
    if (/components|views|pages|app|ui/i.test(p)) return "frontend";
  }
  return parts.length > 1 ? parts[0] || "." : ".";
}

function capitalize(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function detectArchitectureCluster(
  filePath: string,
  content: string,
): {
  id: string;
  name: string;
  type: ArchitectureNodeType;
  description: string;
  technology?: string;
} {
  const norm = filePath.replace(/\\/g, "/");
  const parts = norm.split("/").filter(Boolean);

  // 1. Monorepo detection: apps/* or packages/* or services/* or modules/*
  if (
    parts.length >= 2 &&
    /^(apps|packages|services|modules)$/i.test(parts[0] || "")
  ) {
    const scope = parts[0]!.toLowerCase();
    const sub = parts[1]!.toLowerCase();
    const moduleId = `${scope}/${sub}`;

    if (/fe|frontend|client|web|ui/i.test(sub)) {
      return {
        id: `area:${moduleId}`,
        name: `${capitalize(sub)} (Web Client)`,
        type: "frontend",
        description: "Interactive web frontend application",
        technology: /react|next/i.test(content)
          ? "Next.js / React"
          : "Web Frontend",
      };
    }
    if (/http|api|server|backend/i.test(sub)) {
      return {
        id: `area:${moduleId}`,
        name: `${capitalize(sub)} (API Service)`,
        type: "api",
        description: "REST API service & endpoint handler",
        technology: /express/i.test(content) ? "Express.js" : "Node.js API",
      };
    }
    if (/ws|socket|realtime/i.test(sub)) {
      return {
        id: `area:${moduleId}`,
        name: `${capitalize(sub)} (Realtime Hub)`,
        type: "realtime",
        description: "WebSocket server & live collaboration hub",
        technology: /socket\.io/i.test(content) ? "Socket.IO" : "WebSocket",
      };
    }
    if (/db|database|prisma|persistence/i.test(sub)) {
      return {
        id: `area:${moduleId}`,
        name: `${capitalize(sub)} (Database Layer)`,
        type: "database",
        description: "Database client, schemas, and persistence models",
        technology: /prisma/i.test(content)
          ? "Prisma / PostgreSQL"
          : "Database Layer",
      };
    }
    if (/common|shared|types|contracts/i.test(sub)) {
      return {
        id: `area:${moduleId}`,
        name: `${capitalize(sub)} (Shared Core)`,
        type: "shared",
        description: "Shared data contracts, schemas, and validation logic",
        technology: "TypeScript Shared Library",
      };
    }
    const classification = classifyFile(filePath, content);
    return {
      id: `area:${moduleId}`,
      name: `${capitalize(sub)} (${capitalize(scope)})`,
      type: classification.type,
      description: `${capitalize(scope)} workspace package: ${sub}`,
      technology: classification.technology,
    };
  }

  // 2. Layer-based subsystems for standard projects:
  for (const part of parts.slice(0, -1)) {
    const p = part.toLowerCase();
    if (/routes|controllers|api|endpoints/i.test(p)) {
      return {
        id: "area:api",
        name: "API Gateway & Routing",
        type: "api",
        description: "HTTP endpoints, route handlers, and controllers",
        technology: norm.endsWith(".py")
          ? "FastAPI / Flask Routes"
          : "API Routes",
      };
    }
    if (/models|entities|db|database|prisma|schemas/i.test(p)) {
      return {
        id: "area:database",
        name: "Persistence & Data Models",
        type: "database",
        description: "Database models, schemas, and queries",
        technology: norm.endsWith(".py")
          ? "Python ORM / SQL"
          : "Prisma / SQL Models",
      };
    }
    if (/services|domain|business/i.test(p)) {
      return {
        id: "area:services",
        name: "Core Business Services",
        type: "service",
        description: "Domain logic, business services, and processing",
        technology: "Application Services",
      };
    }
    if (/middleware|auth|security|guards/i.test(p)) {
      return {
        id: "area:auth",
        name: "Auth & Security Middleware",
        type: "auth",
        description: "Authentication, token verification, and security rules",
        technology: "Auth & Security",
      };
    }
    if (/realtime|sockets|ws/i.test(p)) {
      return {
        id: "area:realtime",
        name: "Realtime Gateway",
        type: "realtime",
        description: "Real-time communication and event dispatching",
        technology: "Realtime WebSocket",
      };
    }
    if (/workers|queues|tasks|jobs/i.test(p)) {
      return {
        id: "area:workers",
        name: "Background Workers & Queues",
        type: "worker",
        description: "Asynchronous task execution and scheduled jobs",
        technology: norm.endsWith(".py") ? "Celery Worker" : "Job Queue",
      };
    }
    if (/components|views|pages|app|ui/i.test(p)) {
      return {
        id: "area:frontend",
        name: "Frontend UI & Pages",
        type: "frontend",
        description: "Client pages, layouts, and user interface components",
        technology: "React / Frontend",
      };
    }
  }

  // 3. Fallback based on file classification:
  const classification = classifyFile(filePath, content);
  const top = topLevelOwner(filePath);
  return {
    id: `area:${top}`,
    name:
      top === "."
        ? "Application Root"
        : `${capitalize(top.replace(/[/_-]/g, " "))} Module`,
    type: classification.type,
    description: classification.description,
    technology: classification.technology,
  };
}

function safeSnippet(
  content: string,
  lineStart?: number,
  lineEnd?: number,
): string | undefined {
  if (!lineStart) return undefined;
  const lines = content.split(/\r?\n/);
  const startIdx = Math.max(0, lineStart - 1);
  const endIdx = Math.min(
    lines.length,
    lineEnd ? Math.max(startIdx + 1, lineEnd) : startIdx + 6,
  );
  const text = lines.slice(startIdx, endIdx).join("\n").trim();
  if (!text) return undefined;
  return text.length > 350 ? text.slice(0, 347) + "..." : text;
}

function evidence(
  file: SourceFile,
  reason: string,
  lineStart?: number,
  lineEnd?: number,
  symbol?: string,
): SourceEvidence {
  const lineSuffix = lineStart
    ? lineEnd && lineEnd !== lineStart
      ? `#L${lineStart}-L${lineEnd}`
      : `#L${lineStart}`
    : "";
  return {
    path: file.path,
    lineStart,
    lineEnd,
    symbol,
    reason,
    githubUrl: `${file.githubUrl}${lineSuffix}`,
    snippet: safeSnippet(file.content, lineStart, lineEnd),
  };
}

function extractSymbolsAndEvidence(file: SourceFile): SourceEvidence[] {
  const evidences: SourceEvidence[] = [];
  const lines = file.content.split(/\r?\n/);

  if (file.path.endsWith(".py")) {
    lines.forEach((line, index) => {
      const lineNum = index + 1;
      const funcMatch = line.match(/^(?:async\s+)?def\s+([a-zA-Z0-9_]+)\s*\(/);
      if (funcMatch) {
        const symbol = funcMatch[1];
        evidences.push(
          evidence(
            file,
            `Python function ${symbol} defined.`,
            lineNum,
            Math.min(lines.length, lineNum + 4),
            symbol,
          ),
        );
      }
      const classMatch = line.match(/^class\s+([a-zA-Z0-9_]+)/);
      if (classMatch) {
        const symbol = classMatch[1];
        evidences.push(
          evidence(
            file,
            `Python class ${symbol} declared.`,
            lineNum,
            Math.min(lines.length, lineNum + 4),
            symbol,
          ),
        );
      }
      const routeMatch = line.match(
        /@(?:app|router|bp)\.(get|post|put|delete|patch|route)\s*\((.*?)\)/,
      );
      if (routeMatch && routeMatch[1]) {
        evidences.push(
          evidence(
            file,
            `Route handler ${routeMatch[1].toUpperCase()} declared.`,
            lineNum,
            Math.min(lines.length, lineNum + 4),
            routeMatch[0],
          ),
        );
      }
    });
  } else {
    try {
      const source = ts.createSourceFile(
        file.path,
        file.content,
        ts.ScriptTarget.Latest,
        true,
        scriptKind(file.path),
      );
      const visit = (node: ts.Node) => {
        if (ts.isFunctionDeclaration(node) && node.name) {
          const pos = source.getLineAndCharacterOfPosition(node.getStart(source));
          const end = source.getLineAndCharacterOfPosition(node.getEnd());
          evidences.push(
            evidence(
              file,
              `Function ${node.name.text} defined.`,
              pos.line + 1,
              end.line + 1,
              node.name.text,
            ),
          );
        }
        if (ts.isClassDeclaration(node) && node.name) {
          const pos = source.getLineAndCharacterOfPosition(node.getStart(source));
          const end = source.getLineAndCharacterOfPosition(node.getEnd());
          evidences.push(
            evidence(
              file,
              `Class ${node.name.text} declared.`,
              pos.line + 1,
              end.line + 1,
              node.name.text,
            ),
          );
        }
        ts.forEachChild(node, visit);
      };
      visit(source);
    } catch {
      // TypeScript parsing fallback
    }
  }

  return evidences.slice(0, 6);
}

function importEvidence(file: SourceFile, imported: string): SourceEvidence {
  const line = file.content
    .split(/\r?\n/)
    .findIndex((value) => value.includes(imported));
  return evidence(
    file,
    `Import declaration references ${imported}.`,
    line >= 0 ? line + 1 : undefined,
    line >= 0 ? line + 1 : undefined,
  );
}

function mergeEvidence(
  left: SourceEvidence[],
  right: SourceEvidence[],
): SourceEvidence[] {
  const seen = new Set(
    left.map((item) => `${item.path}:${item.lineStart}:${item.reason}`),
  );
  return [
    ...left,
    ...right.filter(
      (item) => !seen.has(`${item.path}:${item.lineStart}:${item.reason}`),
    ),
  ].slice(0, 20);
}

function addEdge(
  edges: ArchitectureEdge[],
  source: string,
  target: string,
  relationship: ArchitectureEdge["relationship"],
  label: string,
  evidenceItems: SourceEvidence[],
  confidence: number,
  inferred: boolean,
): void {
  const id = `${source}->${target}:${relationship}`;
  const existing = edges.find((edge) => edge.id === id);
  if (existing) {
    existing.evidence = mergeEvidence(existing.evidence, evidenceItems);
    return;
  }
  edges.push({
    id,
    source,
    target,
    relationship,
    label,
    evidence: evidenceItems.slice(0, 20),
    confidence,
    inferred,
  });
}

function detectCrossModuleInteractions(
  nodes: ArchitectureNode[],
  edges: ArchitectureEdge[],
  files: SourceFile[],
  addEdgeFn: typeof addEdge,
): void {
  const feNode = nodes.find(
    (n) => n.type === "frontend" && !n.id.startsWith("file:"),
  );
  const apiNode = nodes.find(
    (n) => n.type === "api" && !n.id.startsWith("file:"),
  );
  const dbNode = nodes.find(
    (n) => n.type === "database" && !n.id.startsWith("file:"),
  );
  const rtNode = nodes.find(
    (n) => n.type === "realtime" && !n.id.startsWith("file:"),
  );
  const authNode = nodes.find(
    (n) => n.type === "auth" && !n.id.startsWith("file:"),
  );
  const sharedNode = nodes.find(
    (n) => n.type === "shared" && !n.id.startsWith("file:"),
  );

  for (const file of files) {
    const content = file.content;

    // Frontend -> API HTTP calls
    if (feNode && apiNode && feNode.files.includes(file.path)) {
      if (/axios|fetch\(|BACKEND_URL|\/api\/|useSWR|useQuery/i.test(content)) {
        addEdgeFn(
          edges,
          feNode.id,
          apiNode.id,
          "connects",
          "HTTP REST API",
          [evidence(file, "Frontend client calls backend HTTP endpoints.")],
          0.96,
          false,
        );
      }
      if (
        rtNode &&
        /socket\.io|WebSocket|io\(|WS_URL|realtime/i.test(content)
      ) {
        addEdgeFn(
          edges,
          feNode.id,
          rtNode.id,
          "connects",
          "WebSocket Stream",
          [
            evidence(
              file,
              "Frontend client establishes realtime socket connection.",
            ),
          ],
          0.96,
          false,
        );
      }
    }

    // API -> Database persistence & Auth
    if (apiNode && dbNode && apiNode.files.includes(file.path)) {
      if (
        /prisma|prismaClient|new Pool|db\.|execute\(|declarative_base|Base\s*=|sqlalchemy/i.test(
          content,
        )
      ) {
        addEdgeFn(
          edges,
          apiNode.id,
          dbNode.id,
          "persists",
          "ORM Queries & Writes",
          [evidence(file, "API service reads/writes from database models.")],
          0.98,
          false,
        );
      }
      if (
        authNode &&
        /jwt|bcrypt|password|token|authorize|authenticate/i.test(content)
      ) {
        addEdgeFn(
          edges,
          apiNode.id,
          authNode.id,
          "depends-on",
          "Token & Auth Guard",
          [evidence(file, "API verifies tokens and enforces auth rules.")],
          0.92,
          false,
        );
      }
    }

    // Realtime -> DB sync
    if (rtNode && dbNode && rtNode.files.includes(file.path)) {
      if (/prisma|db\.|save|update|insert/i.test(content)) {
        addEdgeFn(
          edges,
          rtNode.id,
          dbNode.id,
          "persists",
          "Syncs State",
          [
            evidence(
              file,
              "Realtime hub synchronizes state to persistence layer.",
            ),
          ],
          0.95,
          false,
        );
      }
    }

    // Services -> Shared
    if (
      sharedNode &&
      (apiNode?.files.includes(file.path) || feNode?.files.includes(file.path))
    ) {
      const sourceModule = apiNode?.files.includes(file.path)
        ? apiNode
        : feNode;
      if (
        sourceModule &&
        /@repo\/common|packages\/common|from ["'].*common["']/i.test(content)
      ) {
        addEdgeFn(
          edges,
          sourceModule.id,
          sharedNode.id,
          "depends-on",
          "Shared Schemas & Types",
          [evidence(file, "Imports shared schemas and contracts.")],
          0.9,
          false,
        );
      }
    }
  }
}

function addDetectedInfrastructure(
  nodes: ArchitectureNode[],
  edges: ArchitectureEdge[],
  files: SourceFile[],
  addNode: (node: ArchitectureNode) => ArchitectureNode,
): void {
  for (const file of files.filter((item) =>
    /docker|\.ya?ml$|\.json$/i.test(item.path),
  )) {
    const content = file.content;
    const detections: Array<[RegExp, string, ArchitectureNodeType, string]> = [
      [
        /postgres|mysql|mongodb|prisma/i,
        "Database",
        "database",
        "Database technology referenced by configuration.",
      ],
      [
        /redis/i,
        "Redis",
        "database",
        "Redis configuration or dependency detected.",
      ],
      [
        /docker|kubernetes|\.github\/workflows/i,
        "Deployment infrastructure",
        "infrastructure",
        "Deployment configuration detected.",
      ],
    ];
    for (const [pattern, name, type, reason] of detections) {
      if (!pattern.test(content)) continue;
      const node = addNode({
        id: `detected:${name.toLowerCase().replace(/\W+/g, "-")}`,
        name,
        type,
        description: reason,
        technology: name,
        files: [file.path],
        evidence: [evidence(file, reason)],
        confidence: 0.82,
        inferred: false,
      });
      addEdge(
        edges,
        "repository",
        node.id,
        "configures",
        "configured by",
        node.evidence,
        0.82,
        false,
      );
    }
  }
}
