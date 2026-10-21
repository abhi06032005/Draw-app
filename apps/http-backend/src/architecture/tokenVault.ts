import crypto from "node:crypto";
import { prismaClient } from "@repo/db/client";

const ALGORITHM = "aes-256-gcm";
const VERSION = "v1";

function encryptionKey(): Buffer {
  const secret =
    process.env.GITHUB_TOKEN_ENCRYPTION_KEY ||
    process.env.JWT_SECRET ||
    "sketio-default-github-token-secret-key-32-chars-minimum!";
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptGitHubToken(token: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decryptGitHubToken(payload: string): string {
  const [version, ivValue, tagValue, dataValue] = payload.split(".");
  if (version !== VERSION || !ivValue || !tagValue || !dataValue) {
    throw new Error("Invalid encrypted GitHub token.");
  }
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    encryptionKey(),
    Buffer.from(ivValue, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export async function saveUserGitHubToken(
  userId: string,
  token: string,
  githubLogin?: string,
) {
  let resolvedLogin = githubLogin;
  if (!resolvedLogin) {
    try {
      const res = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "sketio-token-vault",
        },
      });
      if (res.ok) {
        const data: any = await res.json();
        if (data?.login) resolvedLogin = data.login;
      }
    } catch {
      // Ignore network errors during username lookup
    }
  }

  const encrypted = encryptGitHubToken(token);
  return await prismaClient.githubConnection.upsert({
    where: { userId_provider: { userId, provider: "github" } },
    create: {
      userId,
      provider: "github",
      githubLogin: resolvedLogin || null,
      encryptedToken: encrypted,
    },
    update: {
      githubLogin: resolvedLogin || null,
      encryptedToken: encrypted,
      updatedAt: new Date(),
    },
  });
}

export async function getUserGitHubToken(
  userId: string,
): Promise<string | null> {
  const record = await prismaClient.githubConnection.findUnique({
    where: { userId_provider: { userId, provider: "github" } },
  });
  if (!record || !record.encryptedToken) return null;
  try {
    return decryptGitHubToken(record.encryptedToken);
  } catch {
    return null;
  }
}

export async function deleteUserGitHubConnection(userId: string) {
  return await prismaClient.githubConnection
    .deleteMany({
      where: { userId, provider: "github" },
    })
    .catch(() => ({ count: 0 }));
}

export async function getUserGitHubConnectionStatus(userId: string) {
  const record = await prismaClient.githubConnection.findUnique({
    where: { userId_provider: { userId, provider: "github" } },
    select: { id: true, githubLogin: true, updatedAt: true, createdAt: true },
  });
  return {
    connected: Boolean(record),
    githubLogin: record?.githubLogin || null,
    updatedAt: record?.updatedAt || null,
  };
}

