import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import jwt from "jsonwebtoken";

const secret = process.env.NEXTAUTH_SECRET || "sketio-default-jwt-secret-key-change-in-prod";

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
    async jwt({ token, user }) {
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
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id || token.sub;
        (session as any).accessToken = token.accessToken;
      }
      return session;
    },
  },
  secret,
};
