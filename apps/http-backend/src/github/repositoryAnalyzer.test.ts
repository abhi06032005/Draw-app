import assert from "node:assert/strict";
import test from "node:test";

import { analyzeRepository } from "./repositoryAnalyzer";
import { parseGitHubRepositoryUrl } from "./githubClient";

class FakeGitHubClient {
  async getRepository() {
    return {
      full_name: "acme/whiteboard",
      name: "whiteboard",
      owner: { login: "acme" },
      description: "A collaborative whiteboard",
      default_branch: "main",
      html_url: "https://github.com/acme/whiteboard",
      languages_url: "https://api.github.com/repos/acme/whiteboard/languages",
    };
  }

  async getTree() {
    return {
      sha: "tree-sha",
      truncated: false,
      tree: [
        {
          path: "src/app/page.tsx",
          type: "blob" as const,
          size: 120,
          sha: "page",
        },
        {
          path: "src/api/rooms.ts",
          type: "blob" as const,
          size: 160,
          sha: "api",
        },
        {
          path: "src/db/client.ts",
          type: "blob" as const,
          size: 100,
          sha: "db",
        },
        {
          path: "src/.env.local",
          type: "blob" as const,
          size: 80,
          sha: "secret",
        },
        {
          path: "node_modules/ignored.ts",
          type: "blob" as const,
          size: 80,
          sha: "ignored",
        },
      ],
    };
  }

  async getCommitSha() {
    return "commit-sha";
  }

  async getLanguages(): Promise<Record<string, number>> {
    return { TypeScript: 1000, JavaScript: 50 };
  }

  async getBlob(
    _owner: string,
    _repo: string,
    sha: string,
  ): Promise<string> {
    if (sha === "page")
      return `import { createRoom } from "../api/rooms";\nexport default function Page() { return createRoom(); }`;
    if (sha === "api")
      return `import { db } from "../db/client";\nexport async function getRooms() { return db.room.findMany(); }`;
    return `export const db = { room: { findMany() { return []; } } };`;
  }
}

test("accepts only safe GitHub repository URLs", () => {
  assert.deepEqual(
    parseGitHubRepositoryUrl("https://github.com/acme/whiteboard"),
    {
      owner: "acme",
      repo: "whiteboard",
    },
  );
  assert.deepEqual(
    parseGitHubRepositoryUrl("https://github.com/acme/whiteboard.git"),
    {
      owner: "acme",
      repo: "whiteboard",
    },
  );
  assert.equal(
    parseGitHubRepositoryUrl("http://github.com/acme/whiteboard"),
    null,
  );
  assert.equal(
    parseGitHubRepositoryUrl("https://evil.example/acme/whiteboard"),
    null,
  );
  assert.equal(
    parseGitHubRepositoryUrl("https://github.com/acme/whiteboard/issues"),
    null,
  );
});

test("builds evidence-backed graph from source imports and excludes secrets", async () => {
  const graph = await analyzeRepository({
    url: "https://github.com/acme/whiteboard",
    depth: "deep",
    client: new FakeGitHubClient() as never,
  });

  assert.equal(graph.repository.commitSha, "commit-sha");
  assert.equal(graph.stats.filesAnalyzed, 3);
  assert.equal(
    graph.nodes.some((node) => node.files.includes("src/.env.local")),
    false,
  );
  assert.equal(
    graph.nodes.some((node) => node.files.includes("node_modules/ignored.ts")),
    false,
  );

  const importEdge = graph.edges.find(
    (edge) =>
      edge.source === "file:src/app/page.tsx" &&
      edge.target === "file:src/api/rooms.ts",
  );
  assert.ok(importEdge);
  assert.equal(importEdge.inferred, false);
  assert.equal(importEdge.evidence[0]?.githubUrl.includes("commit-sha"), true);
  assert.equal(importEdge.evidence[0]?.lineStart, 1);
});

test("quick analysis remains bounded and returns grouped nodes", async () => {
  const graph = await analyzeRepository({
    url: "https://github.com/acme/whiteboard",
    depth: "quick",
    client: new FakeGitHubClient() as never,
  });

  assert.equal(graph.depth, "quick");
  assert.equal(
    graph.nodes.some((node) => node.id.startsWith("file:")),
    false,
  );
});

test("analyzes Python repositories with routes, models, and snippets", async () => {
  class FakePythonClient extends FakeGitHubClient {
    override async getTree() {
      return {
        sha: "py-tree-sha",
        truncated: false,
        tree: [
          {
            path: "server/main.py",
            type: "blob" as const,
            size: 200,
            sha: "py-main",
          },
          {
            path: "server/models.py",
            type: "blob" as const,
            size: 150,
            sha: "py-models",
          },
        ],
      };
    }
    override async getLanguages() {
      return { Python: 1000 };
    }
    override async getBlob(_owner: string, _repo: string, sha: string) {
      if (sha === "py-main") {
        return [
          "from fastapi import FastAPI",
          "from .models import User",
          "app = FastAPI()",
          "",
          "@app.get('/users')",
          "async def get_users():",
          "    return []",
        ].join("\n");
      }
      return [
        "from sqlalchemy import Column, Integer, String",
        "from sqlalchemy.orm import declarative_base",
        "Base = declarative_base()",
        "",
        "class User(Base):",
        "    __tablename__ = 'users'",
        "    id = Column(Integer, primary_key=True)",
      ].join("\n");
    }
  }

  const graph = await analyzeRepository({
    url: "https://github.com/acme/whiteboard",
    depth: "standard",
    client: new FakePythonClient() as never,
  });

  const apiNode = graph.nodes.find((node) => node.id === "file:server/main.py");
  assert.ok(apiNode);
  assert.equal(apiNode.type, "api");
  assert.ok(apiNode.evidence.length > 0);
  assert.ok(apiNode.evidence[0]?.snippet);

  const modelNode = graph.nodes.find(
    (node) => node.id === "file:server/models.py",
  );
  assert.ok(modelNode);
  assert.equal(modelNode.type, "database");
  assert.ok(modelNode.technology?.includes("Python ORM"));
});

