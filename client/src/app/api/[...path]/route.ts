import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:4000";

async function proxy(request: Request, { params }: { params: { path: string[] } }) {
  const path = (await params).path.join("/");
  const url = new URL(request.url);
  const searchParams = url.search;
  
  const targetUrl = `${BACKEND_URL}/${path}${searchParams}`;
  
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Preserve Content-Type from original request (essential for multipart/form-data)
  const contentType = request.headers.get("content-type");
  if (contentType) {
    headers["Content-Type"] = contentType;
  }

  try {
    const res = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: request.method !== "GET" && request.method !== "HEAD" ? request.body : undefined,
      // @ts-ignore
      duplex: "half", 
    });

    // Forward the response
    const data = await res.arrayBuffer();
    
    return new NextResponse(data, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("Content-Type") || "application/json",
      }
    });
  } catch (error) {
    console.error(`Proxy error for ${path}:`, error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as DELETE, proxy as PATCH };
