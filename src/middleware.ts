import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getLoggedInUser } from '@/lib/appwrite/server'

export async function middleware(request: NextRequest) {
    try {
        // Check if path is admin or seller route
        const isSuperAdminRoute = request.nextUrl.pathname.startsWith('/superadmin')
        const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')

        // Skip auth check for login page and public routes
        if (request.nextUrl.pathname.startsWith('/login') ||
            request.nextUrl.pathname.startsWith('/signup') ||
            request.nextUrl.pathname.startsWith('/contact') ||
            request.nextUrl.pathname.startsWith('/_next') ||
            request.nextUrl.pathname.includes('.')) {
            return NextResponse.next()
        }

        // Get the Appwrite session cookie
        const appwriteSession = request.cookies.get('user-session')

        if (!appwriteSession?.value) {
            // No session found, redirect to login
            const loginUrl = new URL('/login', request.url)
            loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname)
            return NextResponse.redirect(loginUrl)
        }

        try {
            // Verify session and get user
            const user = await getLoggedInUser()

            if (!user) {
                // No user with valid session found
                const loginUrl = new URL('/login', request.url)
                loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname)
                return NextResponse.redirect(loginUrl)
            }

            if (isSuperAdminRoute || isAdminRoute) {
                // Check if user has appropriate role for the route
                const isSuperAdmin = user.labels?.includes('SUPERADMIN') || false
                const isAdmin = user.labels?.includes('ADMIN') || false

                // For superadmin routes, only allow superadmins
                if (isSuperAdminRoute && !isSuperAdmin) {
                    return NextResponse.redirect(new URL('/', request.url))
                }

                // For admin routes, allow both admins and superadmins
                if (isAdminRoute && !(isAdmin || isSuperAdmin)) {
                    return NextResponse.redirect(new URL('/', request.url))
                }
            }

            // User is authenticated, proceed
            return NextResponse.next()
        } catch (error) {
            console.error('Authentication error:', error)
            // Session is invalid, redirect to login
            const loginUrl = new URL('/login', request.url)
            loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname)
            return NextResponse.redirect(loginUrl)
        }
    } catch (error) {
        console.error('Middleware error:', error)
        // In case of any error, redirect to login page
        const loginUrl = new URL('/login', request.url)
        return NextResponse.redirect(loginUrl)
    }
}

// Update middleware to run on all routes
export const config = {
    matcher: [
        // Match all paths except certain exclusions
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
}
