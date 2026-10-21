import { getSession, signOut } from "next-auth/react";

/**
 * Instant synchronous lookup for local JWT tokens.
 * Checks multiple common storage keys (Authorization, token, auth_token).
 */
export function getLocalAuthToken(): string | null {
  if (typeof window === "undefined") return null;

  try {
    const candidate =
      localStorage.getItem("Authorization") ||
      localStorage.getItem("token") ||
      localStorage.getItem("auth_token");

    if (candidate && candidate.trim().length > 0) {
      const clean = candidate.startsWith("Bearer ")
        ? candidate.slice(7).trim()
        : candidate.trim();
      return clean.length > 0 ? clean : null;
    }
  } catch {
    // localStorage may be disabled or restricted
  }

  return null;
}

/**
 * Universal authentication token helper.
 * 1. Returns local token instantly if available.
 * 2. Asynchronously polls NextAuth active session as fallback and caches result.
 */
export async function getAuthToken(): Promise<string | null> {
  if (typeof window === "undefined") {
    return null;
  }

  // 1. Fast synchronous check from localStorage (0ms)
  const localToken = getLocalAuthToken();
  if (localToken) {
    return localToken;
  }

  // 2. Fallback to NextAuth active session
  try {
    const session: any = await getSession();
    if (session?.accessToken) {
      setLocalAuthToken(session.accessToken);
      return session.accessToken;
    }
  } catch {
    // NextAuth session not initialized
  }

  return null;
}

export async function getGitHubAccessToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const session: any = await getSession();
    return session?.githubAccessToken || null;
  } catch {
    return null;
  }
}

export function setLocalAuthToken(token: string) {
  if (typeof window !== "undefined" && token) {
    const clean = token.startsWith("Bearer ") ? token.slice(7).trim() : token.trim();
    try {
      localStorage.setItem("Authorization", clean);
      localStorage.setItem("token", clean);
    } catch {}
  }
}

export function removeLocalAuthToken() {
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem("Authorization");
      localStorage.removeItem("token");
      localStorage.removeItem("auth_token");
      localStorage.removeItem("sketio_cached_user");
      localStorage.removeItem("sketio_cached_rooms");
    } catch {}

    try {
      signOut({ redirect: false }).catch(() => {});
    } catch {
      // Ignore
    }
  }
}
