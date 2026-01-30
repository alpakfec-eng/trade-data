import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export default auth((req) => {
  const isAuth = !!req.auth;
  const pathname = req.nextUrl.pathname;
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register');

  // List of protected routes that require authentication
  const protectedRoutes = [
    '/admin',
    '/dashboard',
    '/data',
    '/consignors',
    '/grades',
    '/importers',
    '/new-data',
    '/upload-csv',
  ];

  // Check if the current route is protected
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  // Redirect to login if accessing a protected route without authentication
  if (isProtectedRoute && !isAuth) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Admin page specific role check
  if (pathname.startsWith('/admin')) {
    const userRole = (req.auth?.user as any)?.role;
    if (!userRole || !['admin', 'super-admin'].includes(userRole)) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  // Redirect authenticated users away from auth pages
  if (isAuthPage && isAuth) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};