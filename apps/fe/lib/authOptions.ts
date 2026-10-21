import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import CredentialsProvider from "next-auth/providers/credentials";
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
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "developer@example.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Please enter both email and password");
        }

        const username = credentials.email.trim();
        const password = credentials.password;

        try {
          const res = await fetch(`${BACKEND_URL}/signin`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.message || "Invalid email or password");
          }

          const data = await res.json();
          if (!data?.token) {
            throw new Error("Authentication failed: No token received");
          }

          const decoded = jwt.decode(data.token) as any;
          const userId = decoded?.userId || decoded?.id || decoded?.sub;

          return {
            id: userId,
            email: username,
            name: decoded?.name || username.split("@")[0],
            accessToken: data.token,
          } as any;
        } catch (err: any) {
          throw new Error(err.message || "Sign in failed");
        }
      },
    }),
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

        if ((user as any).accessToken) {
          token.accessToken = (user as any).accessToken;
        } else {
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
      }

      // Guarantee token.accessToken is always present on token
      if (!token.accessToken && (token.id || token.sub)) {
        token.accessToken = jwt.sign(
          {
            userId: token.id || token.sub,
            email: token.email,
            name: token.name,
          },
          secret,
          { expiresIn: "30d" }
        );
      }

      if (account?.provider === "github" && account.access_token) {
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
