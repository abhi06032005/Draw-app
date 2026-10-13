import { getSession, signOut } from "next-auth/react";

/**
 * Universal authentication token helper.
 * Integrates NextAuth session tokens with local storage tokens.
 */
export async function getAuthToken(): Promise<string | null> {
  if (typeof window === "undefined") {
    return null;
  }

  // 1. Try localStorage token
  const localToken = localStorage.getItem("Authorization");
  if (localToken && localToken.trim().length > 0) {
    return localToken.trim();
  }

  // 2. Fallback to NextAuth active session
  try {
    const session: any = await getSession();
    if (session?.accessToken) {
      localStorage.setItem("Authorization", session.accessToken);
      return session.accessToken;
    }
  } catch {
    // NextAuth session not initialized
  }

  return null;
}

export function setLocalAuthToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("Authorization", token);
  }
}

export function removeLocalAuthToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("Authorization");
    try {
      signOut({ redirect: false }).catch(() => {});
    } catch {
      // Ignore
    }
  }
}
