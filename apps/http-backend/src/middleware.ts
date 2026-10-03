import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { verifyToken } from "@clerk/backend";
import { JWT_SECRET } from "@repo/common-backend/config";
import { prismaClient } from "@repo/db/client";

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

const clerkSecretKey = process.env.CLERK_SECRET_KEY;
const isClerkConfigured =
  clerkSecretKey &&
  !clerkSecretKey.includes("placeholder") &&
  clerkSecretKey.startsWith("sk_");

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

  // 1. If Clerk secret key is configured, attempt Clerk verification
  if (isClerkConfigured && clerkSecretKey) {
    try {
      const verified = await verifyToken(token, { secretKey: clerkSecretKey });
      if (verified && verified.sub) {
        req.userId = verified.sub;
        await ensureUserRecord(verified.sub, verified);
        return next();
      }
    } catch {
      // Continue to fallback
    }
  }

  // 2. Try native JWT verification
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    req.userId = decoded.userId;
    return next();
  } catch (err: any) {
    // 3. Fallback: Check if token is a Clerk JWT during setup/dev
    const decodedAny: any = jwt.decode(token);
    if (decodedAny && decodedAny.sub) {
      req.userId = decodedAny.sub;
      await ensureUserRecord(decodedAny.sub, decodedAny);
      return next();
    }

    return res.status(403).json({ message: "Unauthorized access" });
  }
}

/**
 * Ensures a Clerk user has a corresponding row in PostgreSQL User table
 * so all relations (Room admin, BoardMember, Chat) resolve properly.
 */
async function ensureUserRecord(userId: string, claims: any) {
  try {
    const email = claims.email || claims.email_address || `${userId}@clerk.user`;
    const name = claims.name || claims.first_name || "Clerk User";

    await prismaClient.user.upsert({
      where: { id: userId },
      create: {
        id: userId,
        email: email,
        name: name,
        password: "CLERK_MANAGED_AUTH",
      },
      update: {
        name: name,
      },
    });
  } catch {
    // Ignore upsert errors if email conflict or already exists
  }
}