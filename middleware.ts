import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)"]);

export default clerkMiddleware(
  {
    signInUrl: "/signin",
    signOutUrl: "/signout",
  },
  (auth, req) => {
    if (isProtectedRoute(req)) {
      auth().protect();
    }
  }
);

export const config = {
  matcher: [
    "/((?!.*\\..*|_next).*)",
    "/",
    "/(api|trpc)(.*)",
  ],
};
