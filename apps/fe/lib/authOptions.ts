import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import jwt from "jsonwebtoken";

const secret =
  process.env.NEXTAUTH_SECRET ||
  process.env.JWT_SECRET ||
  "sketio-default-jwt-secret-key-change-in-prod";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

async function storeGitHubConnection(userId: string, accessToken: string) {
  const signed = jwt.sign({ userId }, secret, { expiresIn: "5m" });
  const response = await fetch(`${BACKEND_URL}/github/connection`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${signed}`,
    },
    body: JSON.stringify({ accessToken }),
  });
  if (!response.ok) throw new Error(`Backend rejected GitHub connection (${response.status})`);
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
    ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
      ? [
          GitHubProvider({
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
            authorization: { params: { scope: "read:user repo" } },
          }),
        ]
      : []),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/signin",
    error: "/signin",
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;

        // Sign a valid JWT token recognizable by backend & websocket services
        token.accessToken = jwt.sign(
          {
            userId: user.id || token.sub,
            email: user.email,
            name: user.name,
          },
          secret,
          { expiresIn: "30d" }
        );
      }
      if (account?.provider === "github" && account.access_token) {
        // Forward the GitHub token to the backend once, over the server-to-server
        // connection endpoint; it is never kept in the browser-visible session.
        await storeGitHubConnection(token.id as string, account.access_token).catch(
          (error) => console.error("GitHub connection store failed:", error),
        );
        token.githubConnected = true;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id || token.sub;
        (session as any).accessToken = token.accessToken;
        (session as any).githubConnected = Boolean(token.githubConnected);
      }
      return session;
    },
  },
  secret,
};
