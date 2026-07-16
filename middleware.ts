import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export async function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/plants/:path*", "/scanner/:path*", "/tasks/:path*", "/calendar/:path*", "/catalog/:path*", "/profile/:path*", "/friends/:path*", "/achievements/:path*", "/wishlist/:path*"],
};
