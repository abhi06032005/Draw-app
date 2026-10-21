import zlib from "node:zlib";

const GITHUB_API = "https://api.github.com";
const API_VERSION = "2022-11-28";

export interface GitHubRepository {
  full_name: string;
  name: string;
  owner: { login: string };
  description: string | null;
  default_branch: string;
  html_url: string;
  languages_url: string;
}

export interface GitHubTreeEntry {
  path: string;
  type: "blob" | "tree" | "commit";
  size?: number;
  sha: string;
}

interface GitHubCommitResponse {
  sha: string;
}

interface GitHubTreeResponse {
  sha: string;
  truncated: boolean;
  tree: GitHubTreeEntry[];
}

interface GitHubBlobResponse {
  content: string;
  encoding: "base64" | string;
  size: number;
}

export class GitHubApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly retryAfter?: string,
  ) {
    super(message);
    this.name = "GitHubApiError";
  }
}

export interface GitHubClientOptions {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  token?: string;
  signal?: AbortSignal;
}

export class GitHubClient {
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;
  private readonly token?: string;
  private readonly signal?: AbortSignal;

  // In-memory archive cache for zero-rate-limit archive ingestion
  private readonly fileArchiveCache = new Map<string, string>();
  private readonly fileArchiveSizes = new Map<string, number>();
  private cachedGitRefs?: {
    defaultBranch: string;
    headSha: string;
    refs: Map<string, string>;
  };

  constructor(options: GitHubClientOptions = {}) {
    this.fetchImpl = options.fetchImpl || fetch;
    this.timeoutMs = options.timeoutMs || 15_000;
    this.token =
      options.token ||
      process.env.GITHUB_TOKEN ||
      process.env.GITHUB_PAT ||
      process.env.GH_TOKEN;
    this.signal = options.signal;
  }

  private isRateLimitOrForbidden(error: unknown): boolean {
    if (error instanceof GitHubApiError) {
      if (error.status === 403 || error.status === 429) return true;
      const lower = error.message.toLowerCase();
      if (lower.includes("rate limit") || lower.includes("denied request"))
        return true;
    }
    return false;
  }

  /**
   * Fetches refs using GitHub's Git HTTP protocol (smart transfer).
   * This endpoint has ZERO GitHub REST API rate limit restrictions.
   */
  private async getGitRefs(
    owner: string,
    repo: string,
  ): Promise<{
    defaultBranch: string;
    headSha: string;
    refs: Map<string, string>;
  }> {
    if (this.cachedGitRefs) return this.cachedGitRefs;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const abortExternal = () => controller.abort();
    this.signal?.addEventListener("abort", abortExternal, { once: true });

    try {
      const headers: Record<string, string> = {
        "User-Agent": "sketio-architecture-importer",
      };
      if (this.token) {
        headers.Authorization = `Bearer ${this.token}`;
      }

      const url = `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/info/refs?service=git-upload-pack`;
      const response = await this.fetchImpl(url, {
        headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        if (response.status === 404 || response.status === 401) {
          throw new GitHubApiError(
            "Repository not found or private. Connect your GitHub account or provide a GitHub personal access token.",
            response.status,
          );
        }
        throw new GitHubApiError(
          `Git refs fetch returned status ${response.status}.`,
          response.status,
        );
      }

      const text = await response.text();
      let defaultBranch = "main";
      let headSha = "";
      const refsMap = new Map<string, string>();

      const symrefMatch = text.match(/symref=HEAD:refs\/heads\/([^\s\0]+)/);
      if (symrefMatch && symrefMatch[1]) {
        defaultBranch = symrefMatch[1];
      }

      const headMatch = text.match(/([0-9a-f]{40})\s+HEAD/i);
      if (headMatch && headMatch[1]) {
        headSha = headMatch[1];
      }

      const lines = text.split("\n");
      for (const line of lines) {
        const m = line.match(
          /([0-9a-f]{40})\s+refs\/(?:heads|tags)\/([^\s\0]+)/i,
        );
        if (m && m[1] && m[2]) {
          const sha = m[1];
          const name = m[2].replace(/\^{}$/, "");
          refsMap.set(name, sha);
          if (name === defaultBranch && !headSha) {
            headSha = sha;
          }
        }
      }

      this.cachedGitRefs = { defaultBranch, headSha, refs: refsMap };
      return this.cachedGitRefs;
    } finally {
      clearTimeout(timeout);
      this.signal?.removeEventListener("abort", abortExternal);
    }
  }

  /**
   * Downloads repository tarball via codeload/archive web endpoints.
   * Completely bypasses GitHub REST API rate limits and extracts repository file tree.
   */
  private async getTreeFromArchive(
    owner: string,
    repo: string,
    ref: string,
  ): Promise<GitHubTreeResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);
    const abortExternal = () => controller.abort();
    this.signal?.addEventListener("abort", abortExternal, { once: true });

    try {
      const headers: Record<string, string> = {
        "User-Agent": "sketio-architecture-importer",
      };
      if (this.token) {
        headers.Authorization = `Bearer ${this.token}`;
      }

      const candidateUrls = [
        `https://codeload.github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/legacy.tar.gz/${encodeURIComponent(ref)}`,
        `https://codeload.github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/legacy.tar.gz/refs/heads/${encodeURIComponent(ref)}`,
        `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/tarball/${encodeURIComponent(ref)}`,
      ];

      let response: Response | null = null;
      for (const url of candidateUrls) {
        try {
          const res = await this.fetchImpl(url, {
            headers,
            signal: controller.signal,
          });
          if (res.ok) {
            response = res;
            break;
          }
        } catch {
          // Try next candidate URL
        }
      }

      if (!response || !response.ok) {
        throw new GitHubApiError(
          `Could not download repository archive for ${owner}/${repo} at ${ref}.`,
          response?.status || 502,
        );
      }

      const arrayBuf = await response.arrayBuffer();
      const compressedBuffer = Buffer.from(arrayBuf);
      const decompressed = zlib.gunzipSync(compressedBuffer);

      let offset = 0;
      const entries: GitHubTreeEntry[] = [];
      let nextOverrideName: string | null = null;

      while (offset + 512 <= decompressed.length) {
        const header = decompressed.subarray(offset, offset + 512);
        if (header.every((b) => b === 0)) break;

        let name = header
          .subarray(0, 100)
          .toString("utf8")
          .replace(/\0.*$/, "");
        const prefix = header
          .subarray(345, 345 + 155)
          .toString("utf8")
          .replace(/\0.*$/, "");
        if (prefix) name = `${prefix}/${name}`;

        const sizeStr = header
          .subarray(124, 136)
          .toString("utf8")
          .trim()
          .replace(/\0.*$/, "");
        const size = parseInt(sizeStr, 8) || 0;
        const type = String.fromCharCode(header[156] || 0);
        offset += 512;

        if (type === "x" || type === "L") {
          const paxData = decompressed
            .subarray(offset, offset + size)
            .toString("utf8");
          if (type === "L") {
            nextOverrideName = paxData.replace(/\0.*$/, "");
          } else {
            const pathMatch = paxData.match(/path=(.+?)\n/);
            if (pathMatch && pathMatch[1]) nextOverrideName = pathMatch[1];
          }
        } else if (type === "0" || type === "\0") {
          const finalName = nextOverrideName || name;
          nextOverrideName = null;
          // Strip the top-level repo directory e.g., owner-repo-sha/
          const slashIdx = finalName.indexOf("/");
          const relPath =
            slashIdx !== -1 ? finalName.substring(slashIdx + 1) : finalName;
          if (relPath) {
            const content = decompressed
              .subarray(offset, offset + size)
              .toString("utf8");
            this.fileArchiveCache.set(relPath, content);
            this.fileArchiveSizes.set(relPath, size);
            entries.push({
              path: relPath,
              type: "blob",
              size,
              sha: `archive-${size}`,
            });
          }
        } else {
          nextOverrideName = null;
        }

        offset += Math.ceil(size / 512) * 512;
      }

      return {
        sha: ref,
        truncated: false,
        tree: entries,
      };
    } finally {
      clearTimeout(timeout);
      this.signal?.removeEventListener("abort", abortExternal);
    }
  }

  private synthesizeLanguagesFromArchiveCache(): Record<string, number> {
    const EXTENSION_MAP: Record<string, string> = {
      ".ts": "TypeScript",
      ".tsx": "TypeScript",
      ".js": "JavaScript",
      ".jsx": "JavaScript",
      ".mjs": "JavaScript",
      ".cjs": "JavaScript",
      ".py": "Python",
      ".go": "Go",
      ".rs": "Rust",
      ".java": "Java",
      ".c": "C",
      ".cpp": "C++",
      ".h": "C/C++ Header",
      ".cs": "C#",
      ".rb": "Ruby",
      ".php": "PHP",
      ".html": "HTML",
      ".css": "CSS",
      ".scss": "SCSS",
      ".json": "JSON",
      ".yaml": "YAML",
      ".yml": "YAML",
      ".md": "Markdown",
      ".sql": "SQL",
      ".sh": "Shell",
    };

    const counts: Record<string, number> = {};
    for (const [path, size] of this.fileArchiveSizes.entries()) {
      const dot = path.lastIndexOf(".");
      if (dot !== -1) {
        const ext = path.substring(dot).toLowerCase();
        const lang = EXTENSION_MAP[ext];
        if (lang) {
          counts[lang] = (counts[lang] || 0) + size;
        }
      }
    }
    return counts;
  }

  async getRepository(owner: string, repo: string): Promise<GitHubRepository> {
    try {
      return await this.request<GitHubRepository>(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
      );
    } catch (error) {
      if (this.isRateLimitOrForbidden(error)) {
        const refs = await this.getGitRefs(owner, repo);
        return {
          full_name: `${owner}/${repo}`,
          name: repo,
          owner: { login: owner },
          description: null,
          default_branch: refs.defaultBranch || "main",
          html_url: `https://github.com/${owner}/${repo}`,
          languages_url: `https://api.github.com/repos/${owner}/${repo}/languages`,
        };
      }
      throw error;
    }
  }

  async getLanguages(
    owner: string,
    repo: string,
  ): Promise<Record<string, number>> {
    try {
      return await this.request<Record<string, number>>(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/languages`,
      );
    } catch (error) {
      if (this.isRateLimitOrForbidden(error)) {
        const synthesized = this.synthesizeLanguagesFromArchiveCache();
        if (Object.keys(synthesized).length > 0) return synthesized;
      }
      return {};
    }
  }

  async getTree(
    owner: string,
    repo: string,
    ref: string,
  ): Promise<GitHubTreeResponse> {
    try {
      return await this.request<GitHubTreeResponse>(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(ref)}?recursive=1`,
      );
    } catch (error) {
      if (this.isRateLimitOrForbidden(error)) {
        return await this.getTreeFromArchive(owner, repo, ref);
      }
      throw error;
    }
  }

  async getCommitSha(
    owner: string,
    repo: string,
    ref: string,
  ): Promise<string> {
    const cleanRef = ref.trim();
    if (/^[0-9a-f]{40}$/i.test(cleanRef)) {
      return cleanRef;
    }

    try {
      const commit = await this.request<GitHubCommitResponse>(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits/${encodeURIComponent(cleanRef)}`,
      );
      return commit.sha;
    } catch (error) {
      if (this.isRateLimitOrForbidden(error)) {
        const refs = await this.getGitRefs(owner, repo);
        const branchName = cleanRef.replace(/^refs\/(?:heads|tags)\//, "");
        const sha =
          refs.refs.get(branchName) ||
          (branchName === refs.defaultBranch || branchName === "HEAD"
            ? refs.headSha
            : null) ||
          refs.headSha;
        if (sha) return sha;
      }
      throw error;
    }
  }

  async getBlob(owner: string, repo: string, sha: string): Promise<string> {
    const blob = await this.request<GitHubBlobResponse>(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/blobs/${encodeURIComponent(sha)}`,
    );

    if (blob.encoding !== "base64") {
      throw new GitHubApiError(
        "GitHub returned an unsupported blob encoding.",
        502,
      );
    }

    return Buffer.from(blob.content.replace(/\s/g, ""), "base64").toString(
      "utf8",
    );
  }

  /**
   * Fetches raw file content from GitHub's raw CDN (raw.githubusercontent.com).
   * Crucially, this does NOT consume the 60 requests/hr GitHub REST API rate limit!
   */
  async getRawFile(
    owner: string,
    repo: string,
    revision: string,
    path: string,
  ): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const abortExternal = () => controller.abort();
    this.signal?.addEventListener("abort", abortExternal, { once: true });

    try {
      const headers: Record<string, string> = {
        "User-Agent": "sketio-architecture-importer",
      };
      if (this.token) {
        headers.Authorization = `token ${this.token}`;
      }

      const encodedPath = path
        .split("/")
        .map((segment) => encodeURIComponent(segment))
        .join("/");
      const url = `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeURIComponent(revision)}/${encodedPath}`;
      const response = await this.fetchImpl(url, {
        headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new GitHubApiError(
          `Raw file fetch returned status ${response.status}.`,
          response.status,
        );
      }

      return await response.text();
    } catch (error) {
      if (error instanceof GitHubApiError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new GitHubApiError("GitHub raw request timed out.", 504);
      }
      throw new GitHubApiError("GitHub raw file could not be retrieved.", 502);
    } finally {
      clearTimeout(timeout);
      this.signal?.removeEventListener("abort", abortExternal);
    }
  }

  /**
   * Resilient file content loader: uses in-memory archive cache first,
   * then CDN (zero REST API quota consumed), with fallback to GitHub Git Blobs API.
   */
  async getFileContent(
    owner: string,
    repo: string,
    entry: { sha: string; path: string },
    revision?: string,
  ): Promise<string> {
    // 1. If present in tarball archive cache (0 network requests, 0 quota consumed)
    if (this.fileArchiveCache.has(entry.path)) {
      return this.fileArchiveCache.get(entry.path)!;
    }

    // 2. If we have a commit / revision and file path, try raw CDN first
    // This is virtually unlimited and immune to the 60 req/hr unauthenticated REST limit
    if (revision && entry.path) {
      try {
        return await this.getRawFile(owner, repo, revision, entry.path);
      } catch {
        // Fall back to git blob API
      }
    }

    // 3. Blobs API fallback (or when mock/fake client in tests provides getBlob)
    try {
      return await this.getBlob(owner, repo, entry.sha);
    } catch (blobErr: any) {
      // If blobs API gave 403 rate limit, try raw CDN one last time with HEAD
      if (
        this.isRateLimitOrForbidden(blobErr) &&
        entry.path
      ) {
        try {
          return await this.getRawFile(
            owner,
            repo,
            revision || "HEAD",
            entry.path,
          );
        } catch {
          // Preserve original rate limit error
        }
      }
      throw blobErr;
    }
  }

  private async request<T>(path: string): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const abortExternal = () => controller.abort();
    this.signal?.addEventListener("abort", abortExternal, { once: true });

    try {
      const headers: Record<string, string> = {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": API_VERSION,
        "User-Agent": "sketio-architecture-importer",
      };
      if (this.token) headers.Authorization = `Bearer ${this.token}`;

      const response = await this.fetchImpl(`${GITHUB_API}${path}`, {
        headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        let details = "";
        try {
          const body: any = await response.json();
          if (body?.message) details = body.message;
        } catch {}

        const remaining = response.headers.get("x-ratelimit-remaining");
        const resetTime = response.headers.get("x-ratelimit-reset");
        let rateLimitInfo = "";
        if (remaining === "0" && resetTime) {
          const resetDate = new Date(Number(resetTime) * 1000);
          rateLimitInfo = `GitHub unauthenticated rate limit (60 requests/hr) reached. Resets at ${resetDate.toLocaleTimeString()}. Add a GitHub token or connect OAuth for 5,000 requests/hr.`;
        }

        const message =
          response.status === 404
            ? "Repository or revision not found."
            : response.status === 403
              ? (rateLimitInfo || (details ? `GitHub denied request (${details}). Provide a GitHub token in the modal for 5,000 requests/hr.` : "GitHub denied this request or its rate limit was reached. Provide a GitHub token in the modal for 5,000 requests/hr."))
              : details
                ? `GitHub request failed (${response.status}): ${details}`
                : `GitHub request failed with status ${response.status}.`;
        throw new GitHubApiError(
          message,
          response.status,
          response.headers.get("retry-after") || undefined,
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof GitHubApiError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new GitHubApiError("GitHub request timed out.", 504);
      }
      throw new GitHubApiError("GitHub could not be reached.", 502);
    } finally {
      clearTimeout(timeout);
      this.signal?.removeEventListener("abort", abortExternal);
    }
  }
}

export function parseGitHubRepositoryUrl(
  value: string,
): { owner: string; repo: string } | null {
  try {
    const url = new URL(value.trim());
    if (
      url.protocol !== "https:" ||
      url.hostname.toLowerCase() !== "github.com"
    )
      return null;
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length !== 2) return null;
    const owner = parts[0];
    const repoWithSuffix = parts[1];
    if (!owner || !repoWithSuffix) return null;
    const repo = repoWithSuffix.replace(/\.git$/, "");
    if (!/^[a-zA-Z0-9_.-]+$/.test(owner) || !/^[a-zA-Z0-9_.-]+$/.test(repo))
      return null;
    return { owner, repo };
  } catch {
    return null;
  }
}
