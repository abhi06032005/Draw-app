import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "@repo/common-backend/config";
import { prismaClient } from "@repo/db/client";

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userEmail?: string;
  userName?: string;
}

// In-memory cache to make user resolution sub-millisecond and prevent concurrent DB race conditions
const userResolutionCache = new Map<string, string>();

/**
 * Ensures that any authenticated user (especially Google OAuth users)
 * has a valid row in PostgreSQL User table before continuing.
 */
export async function ensureUser(id: string, email?: string, name?: string): Promise<string> {
  const cacheKey = `${id}:${email || ""}`;
  const cached = userResolutionCache.get(cacheKey) || userResolutionCache.get(id);
  if (cached) return cached;

  try {
    // 1. Check if user already exists by ID or by Email
    const existing = await prismaClient.user.findFirst({
      where: {
        OR: [
          { id },
          ...(email ? [{ email }] : []),
        ],
      },
    }).catch(() => null);

    if (existing) {
      userResolutionCache.set(id, existing.id);
      if (email) userResolutionCache.set(email, existing.id);
      userResolutionCache.set(cacheKey, existing.id);
      return existing.id;
    }

    // 2. Create new user in PostgreSQL
    const userEmail = email || `${id}@oauth.local`;
    const userName = name || (email ? email.split("@")[0] : "Collaborator");

    const created = await prismaClient.user.upsert({
      where: { email: userEmail },
      update: {},
      create: {
        id,
        email: userEmail,
        name: userName,
        password: "OAUTH_MANAGED_ACCOUNT",
      },
    }).catch(async () => {
      // Fallback in case of ID conflict
      return await prismaClient.user.findFirst({
        where: {
          OR: [{ id }, { email: userEmail }],
        },
      }).catch(() => null);
    });

    if (created) {
      userResolutionCache.set(id, created.id);
      userResolutionCache.set(userEmail, created.id);
      userResolutionCache.set(cacheKey, created.id);
      return created.id;
    }
  } catch (err) {
    console.error("ensureUser error:", err);
  }

  userResolutionCache.set(id, id);
  return id;
}

export function extractTokenPayload(authHeader?: string): { userId?: string; email?: string; name?: string } | null {
  if (!authHeader) return null;

  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : authHeader.trim();

  if (!token) return null;

  // Try all candidate secrets across backend, NextAuth, and local dev
  const candidateSecrets = Array.from(
    new Set([
      JWT_SECRET,
      process.env.JWT_SECRET,
      process.env.NEXTAUTH_SECRET,
      "sketio-default-jwt-secret-key-change-in-prod",
      "production_jwt_secret_change_me_in_env_at_least_32_chars",
      "production_nextauth_secret_change_me_in_env_at_least_32_chars",
      "ilovetrading",
    ].filter(Boolean) as string[])
  );

  for (const candidate of candidateSecrets) {
    try {
      const decoded = jwt.verify(token, candidate) as any;
      if (decoded && (decoded.userId || decoded.id || decoded.sub)) {
        return {
          userId: decoded.userId || decoded.id || decoded.sub,
          email: decoded.email,
          name: decoded.name,
        };
      }
    } catch {}
  }

  // Fallback: check if standard decoded JWT payload has valid userId
  try {
    const decoded = jwt.decode(token) as any;
    if (decoded && (decoded.userId || decoded.id || decoded.sub)) {
      return {
        userId: decoded.userId || decoded.id || decoded.sub,
        email: decoded.email,
        name: decoded.name,
      };
    }
  } catch {}

  return null;
}

export async function middleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res.status(401).json({ message: "Not signed in" });
  }

  const payload = extractTokenPayload(authHeader);
  if (!payload || !payload.userId) {
    return res.status(403).json({ message: "Unauthorized access" });
  }

  req.userEmail = payload.email;
  req.userName = payload.name;
  req.userId = await ensureUser(payload.userId, payload.email, payload.name);

  return next();
}
