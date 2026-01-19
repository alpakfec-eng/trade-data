import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export default auth((req) => {
  const isAuth = !!req.auth;
  const isAuthPage = req.nextUrl.pathname.startsWith('/login') || req.nextUrl.pathname.startsWith('/register');
  const isAdminPage = req.nextUrl.pathname.startsWith('/admin');

  if (isAdminPage) {
    if (!isAuth) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    const userRole = req.auth?.user?.role;
    if (!userRole || !['admin', 'super-admin'].includes(userRole)) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  if (isAuthPage && isAuth) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};