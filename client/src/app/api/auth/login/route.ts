import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:4000";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Call backend login
    const res = await fetch(`${BACKEND_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: data.error || "Login failed" },
        { status: res.status }
      );
    }

    // Set HTTP-only cookie
    const cookieStore = await cookies();
    cookieStore.set("token", data.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8, // 8 hours (matches backend)
    });

    // Also set a user cookie for client-side reading (non-httpOnly) if needed, 
    // or just return the user data.
    // We'll return user data so the client context can update.

    return NextResponse.json({ user: data.user });
  } catch (error: any) {
    console.error("Login route error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
