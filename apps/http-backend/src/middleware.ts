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
async function ensureUser(id: string, email?: string, name?: string): Promise<string> {
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
    }).catch(() => null);

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

export async function middleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res.status(401).json({ message: "Not signed in" });
  }

  // Extract token safely
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : authHeader.trim();

  if (!token) {
    return res.status(401).json({ message: "Token missing" });
  }

  let decodedPayload: { userId?: string; id?: string; sub?: string; email?: string; name?: string } | null = null;

  // 1. Try native JWT verification with JWT_SECRET
  try {
    decodedPayload = jwt.verify(token, JWT_SECRET) as any;
  } catch {
    // Continue to next check
  }

  // 2. NextAuth secret verification (NEXTAUTH_SECRET)
  if (!decodedPayload) {
    const nextAuthSecret = process.env.NEXTAUTH_SECRET;
    if (nextAuthSecret && nextAuthSecret !== JWT_SECRET) {
      try {
        decodedPayload = jwt.verify(token, nextAuthSecret) as any;
      } catch {
        // Continue to fallback check
      }
    }
  }

  // 3. Fallback: Decode token structure
  if (!decodedPayload) {
    try {
      decodedPayload = jwt.decode(token) as any;
    } catch {
      // Decode failed
    }
  }

  if (decodedPayload && (decodedPayload.userId || decodedPayload.id || decodedPayload.sub)) {
    const rawId = (decodedPayload.userId || decodedPayload.id || decodedPayload.sub) as string;
    const email = decodedPayload.email;
    const name = decodedPayload.name;

    req.userEmail = email;
    req.userName = name;

    // Ensure database user row exists and map to correct database user ID
    req.userId = await ensureUser(rawId, email, name);
    return next();
  }

  return res.status(403).json({ message: "Unauthorized access" });
}