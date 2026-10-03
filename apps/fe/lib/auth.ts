/**
 * Universal authentication token helper.
 * Seamlessly integrates Clerk session tokens with fallback to local storage tokens.
 */
export async function getAuthToken(): Promise<string | null> {
  if (typeof window === "undefined") {
    return null;
  }

  // 1. Try Clerk active session token
  try {
    const clerk = (window as any).Clerk;
    if (clerk?.session) {
      const token = await clerk.session.getToken();
      if (token) {
        return token;
      }
    }
  } catch {
    // Clerk session not yet initialized or error
  }

  // 2. Fallback to localStorage token
  return localStorage.getItem("Authorization");
}

export function setLocalAuthToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("Authorization", token);
  }
}

export function removeLocalAuthToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("Authorization");
    const clerk = (window as any).Clerk;
    if (clerk?.signOut) {
      clerk.signOut().catch(() => {});
    }
  }
}
