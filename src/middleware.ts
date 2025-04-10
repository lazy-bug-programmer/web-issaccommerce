import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getLoggedInUser } from './lib/appwrite/server';

// Define paths that don't require authentication
const publicPaths = ['/', '/login', '/signup', '/api/auth'];

export async function middleware(request: NextRequest) {
    const user = await getLoggedInUser();
    const isLoggedIn = !!user;
    const isAdmin = user?.labels?.includes('ADMIN') || false;

    const { pathname } = request.nextUrl;

    if (!isLoggedIn && !publicPaths.some(path => pathname === path || pathname.startsWith(path))) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    if (isLoggedIn && (pathname === '/login' || pathname === '/signup')) {
        return NextResponse.redirect(new URL('/', request.url));
    }

    if (isLoggedIn && !isAdmin && pathname.startsWith('/admin')) {
        return NextResponse.redirect(new URL('/', request.url));
    }

    if (isLoggedIn && isAdmin && pathname.startsWith('/seller')) {
        return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.next();
}

// Configure middleware to run on specific paths
export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - images/ (app images)
         * - public/ files
         */
        '/((?!_next/static|_next/image|favicon.ico|images|public).*)',
    ],
};
