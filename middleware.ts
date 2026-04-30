import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)"]);

export default clerkMiddleware((auth, req) => {
  if (isProtectedRoute(req)) {
    // Manually check auth and redirect if not signed in
    const session = auth();
    if (!session.userId) {
      const signInUrl = new URL("/signin", req.url);
      signInUrl.searchParams.set("redirect_url", req.url);
      return NextResponse.redirect(signInUrl);
    }
  }
});

export const config = {
  matcher: [
    "/((?!api/health|.*\\..*|_next).*)",
    "/(api/(?!health)|trpc)(.*)",
  ],
};
