import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Middleware for route protection
// This runs before any page renders, preventing flash of protected content
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Public routes that don't require authentication
  const publicRoutes = ['/auth'];
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
  
  // Check for auth cookie
  const isAuthed = request.cookies.has('habithletics_auth');
  
  // If trying to access protected route without auth, redirect to auth page
  if (!isPublicRoute && !isAuthed) {
    const loginUrl = new URL('/auth', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // If already authed and trying to access auth page, redirect to home
  if (isPublicRoute && isAuthed) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  return NextResponse.next();
}

// Configure which paths the middleware applies to
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
