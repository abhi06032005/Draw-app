export type AnalysisDepth = "quick" | "standard" | "deep";

export type ArchitectureNodeType =
  | "repository"
  | "frontend"
  | "page"
  | "api"
  | "service"
  | "auth"
  | "database"
  | "realtime"
  | "worker"
  | "shared"
  | "infrastructure"
  | "external";

export interface SourceEvidence {
  path: string;
  lineStart?: number;
  lineEnd?: number;
  symbol?: string;
  reason: string;
  githubUrl: string;
  snippet?: string;
}

export interface ArchitectureNode {
  id: string;
  name: string;
  type: ArchitectureNodeType;
  description: string;
  technology?: string;
  files: string[];
  evidence: SourceEvidence[];
  confidence: number;
  inferred: boolean;
}

export interface ArchitectureEdge {
  id: string;
  source: string;
  target: string;
  relationship: string;
  label: string;
  evidence: SourceEvidence[];
  confidence: number;
  inferred: boolean;
}

export interface ArchitectureGraph {
  version: 1;
  repository: {
    owner: string;
    name: string;
    fullName: string;
    description: string | null;
    defaultBranch: string;
    commitSha: string;
    htmlUrl: string;
    languages: Record<string, number>;
  };
  depth: AnalysisDepth;
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
  stats: {
    filesConsidered: number;
    filesAnalyzed: number;
    filesSkipped: number;
    truncated: boolean;
  };
  warnings: string[];
}

export interface ArchitectureImportResult {
  success: boolean;
  graph: ArchitectureGraph;
}

export type ImprovementCategory =
  | "coupling"
  | "boundary"
  | "scalability"
  | "security"
  | "maintainability";

export interface ArchitectureImprovement {
  id: string;
  category: ImprovementCategory;
  title: string;
  observation: string;
  impact: string;
  suggestion: string;
  confidence: number;
  limitations: string;
  evidence: SourceEvidence[];
  nodeIds: string[];
}

export interface ArchitectureImprovementResult {
  improvements: ArchitectureImprovement[];
  proposedGraph: ArchitectureGraph;
}
