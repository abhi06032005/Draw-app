import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

// Check if a valid real Clerk publishable key is present (pk_test_... or pk_live_... with base64 instance payload)
const isKeyConfigured = Boolean(
  publishableKey &&
  !publishableKey.includes("placeholder") &&
  (publishableKey.startsWith("pk_test_") || publishableKey.startsWith("pk_live_")) &&
  publishableKey.length > 30
);

let isPublicRoute: ReturnType<typeof createRouteMatcher> | null = null;
let clerkHandler: any = null;

if (isKeyConfigured) {
  try {
    isPublicRoute = createRouteMatcher([
      "/",
      "/sign-in(.*)",
      "/sign-up(.*)",
      "/signin(.*)",
      "/signup(.*)",
      "/api(.*)",
    ]);

    clerkHandler = clerkMiddleware(async (auth, req) => {
      if (isPublicRoute && !isPublicRoute(req)) {
        await auth.protect();
      }
    });
  } catch {
    // If Clerk key parsing fails, fallback safely
    clerkHandler = null;
  }
}

export default async function middleware(req: NextRequest, event: any) {
  if (clerkHandler) {
    return clerkHandler(req, event);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
