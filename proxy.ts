import { type NextRequest, NextResponse } from 'next/server';
import { DEFAULT_WORKSPACE_ID, DEFAULT_PROJECT_ID, DEFAULT_ROOM_ID } from '@/lib/store/workspace-store';

export async function proxy(request: NextRequest) {
  const userCookie = request.cookies.get('teammind_user');
  const pathname = request.nextUrl.pathname;

  const isAuthPage =
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/invite');
  const isApiRoute = pathname.startsWith('/api');
  const isStatic = pathname.startsWith('/_next') || pathname.includes('.');

  if (isApiRoute || isStatic) {
    return NextResponse.next();
  }

  // If user is authenticated via name cookie
  if (userCookie?.value) {
    if (isAuthPage || pathname === '/') {
      const url = request.nextUrl.clone();
      url.pathname = `/${DEFAULT_WORKSPACE_ID}/projects/${DEFAULT_PROJECT_ID}/rooms/${DEFAULT_ROOM_ID}`;
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Not authenticated
  if (!isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export default proxy;

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
