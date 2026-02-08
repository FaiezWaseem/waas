import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  const { pathname } = request.nextUrl;

  // Paths to protect
  if (pathname.startsWith("/dashboard")) {
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    try {
      const { payload } = await jwtVerify(
        token,
        new TextEncoder().encode(JWT_SECRET)
      );
      
      const role = payload.role as string;

      // Admin trying to access client dashboard
      if (pathname.startsWith("/dashboard/client") && role === "admin") {
        return NextResponse.redirect(new URL("/dashboard/admin", request.url));
      }

      // Client trying to access admin dashboard
      if (pathname.startsWith("/dashboard/admin") && role !== "admin") {
        return NextResponse.redirect(new URL("/dashboard/client", request.url));
      }

      return NextResponse.next();
    } catch (err) {
      console.error("Token verification failed", err);
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // Redirect logged-in users away from login/register
  if ((pathname === "/login" || pathname === "/register") && token) {
     try {
      const { payload } = await jwtVerify(
        token,
        new TextEncoder().encode(JWT_SECRET)
      );
      const role = payload.role as string;
      if (role === "admin") {
        return NextResponse.redirect(new URL("/dashboard/admin", request.url));
      } else {
        return NextResponse.redirect(new URL("/dashboard/client", request.url));
      }
    } catch (e) {
      // invalid token, let them stay on login
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/register"],
};
