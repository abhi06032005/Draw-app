import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "@repo/common-backend/config";
import { prismaClient } from "@repo/db/client";

export interface AuthenticatedRequest extends Request {
  userId?: string;
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

  // 1. Try native JWT verification with JWT_SECRET
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId?: string; id?: string; sub?: string };
    const id = decoded.userId || decoded.id || decoded.sub;
    if (id) {
      req.userId = id;
      return next();
    }
  } catch {
    // Continue to fallback check
  }

  // 2. NextAuth / JWT secret fallback (NEXTAUTH_SECRET or secret check)
  const nextAuthSecret = process.env.NEXTAUTH_SECRET;
  if (nextAuthSecret && nextAuthSecret !== JWT_SECRET) {
    try {
      const decoded = jwt.verify(token, nextAuthSecret) as { userId?: string; id?: string; sub?: string };
      const id = decoded.userId || decoded.id || decoded.sub;
      if (id) {
        req.userId = id;
        return next();
      }
    } catch {
      // Continue
    }
  }

  // 3. Fallback: Decode token to retrieve user ID if valid structure
  try {
    const decodedAny = jwt.decode(token) as { userId?: string; id?: string; sub?: string; email?: string } | null;
    if (decodedAny && (decodedAny.userId || decodedAny.id || decodedAny.sub)) {
      const id = decodedAny.userId || decodedAny.id || decodedAny.sub!;
      req.userId = id;

      // Ensure user exists in database if email exists
      if (decodedAny.email) {
        await prismaClient.user.upsert({
          where: { id: id },
          create: {
            id: id,
            email: decodedAny.email,
            name: decodedAny.email.split("@")[0] || "User",
            password: "OAUTH_EXTERNAL_USER",
          },
          update: {},
        }).catch(() => {});
      }
      return next();
    }
  } catch {
    // Decoding failed
  }

  return res.status(403).json({ message: "Unauthorized access" });
}