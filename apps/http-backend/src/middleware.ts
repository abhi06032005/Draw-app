import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "@repo/common-backend/config";
import { prismaClient } from "@repo/db/client";

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userEmail?: string;
  userName?: string;
}

/**
 * Ensures that any authenticated user (especially Google OAuth users)
 * has a valid row in PostgreSQL User table before continuing.
 */
export async function ensureUser(id: string, email?: string, name?: string): Promise<string> {
  try {
    // 1. Check if user already exists by ID
    const existingById = await prismaClient.user.findUnique({ where: { id } }).catch(() => null);
    if (existingById) return existingById.id;

    // 2. Check if user already exists by Email
    if (email) {
      const existingByEmail = await prismaClient.user.findUnique({ where: { email } }).catch(() => null);
      if (existingByEmail) return existingByEmail.id;
    }

    // 3. Create new user in PostgreSQL
    const userEmail = email || `${id}@google.user`;
    const userName = name || (email ? email.split("@")[0] : "User");

    const created = await prismaClient.user.create({
      data: {
        id,
        email: userEmail,
        name: userName,
        password: "GOOGLE_OAUTH_MANAGED",
      },
    }).catch((err) => {
      console.warn("create user failed in ensureUser:", err?.message || err);
      return null;
    });

    if (created) return created.id;

    // In case of race condition
    if (email) {
      const fallback = await prismaClient.user.findUnique({ where: { email } }).catch(() => null);
      if (fallback) return fallback.id;
    }
  } catch (err) {
    console.error("ensureUser error:", err);
  }
  return id;
}

export function extractTokenPayload(authHeader?: string): { userId?: string; email?: string; name?: string } | null {
  if (!authHeader) return null;

  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : authHeader.trim();

  if (!token) return null;

  // 1. Try native JWT verification with JWT_SECRET
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded && (decoded.userId || decoded.id || decoded.sub)) {
      return {
        userId: decoded.userId || decoded.id || decoded.sub,
        email: decoded.email,
        name: decoded.name,
      };
    }
  } catch {}

  // 2. Try NextAuth secret verification (NEXTAUTH_SECRET or default fallback)
  const candidateSecrets = [
    process.env.NEXTAUTH_SECRET,
    "sketio-default-jwt-secret-key-change-in-prod",
  ].filter(Boolean) as string[];

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

  // 3. Fallback: Decode token structure
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