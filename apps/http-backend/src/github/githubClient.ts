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

  async getRepository(owner: string, repo: string): Promise<GitHubRepository> {
    return this.request<GitHubRepository>(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
    );
  }

  async getLanguages(
    owner: string,
    repo: string,
  ): Promise<Record<string, number>> {
    return this.request<Record<string, number>>(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/languages`,
    );
  }

  async getTree(
    owner: string,
    repo: string,
    ref: string,
  ): Promise<GitHubTreeResponse> {
    return this.request<GitHubTreeResponse>(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(ref)}?recursive=1`,
    );
  }

  async getCommitSha(
    owner: string,
    repo: string,
    ref: string,
  ): Promise<string> {
    const commit = await this.request<GitHubCommitResponse>(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits/${encodeURIComponent(ref)}`,
    );
    return commit.sha;
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
