"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // Middleware handles token verification and main routing protection.
    // We double-check user role from localStorage for client-side state consistency.
    const userStr = localStorage.getItem("user");

    if (!userStr) {
      // If no user data locally, fetch it or redirect (middleware should have caught this if token missing)
      // But if token exists but no local user data, we might want to fetch it.
      // For now, assume consistent state or redirect to login to re-sync.
      router.push("/login");
      return;
    }

    try {
      const user = JSON.parse(userStr);
      if (user.role !== "admin") {
        // Redirect non-admins to client dashboard
        router.push("/dashboard/client");
      } else {
        setIsAuthorized(true);
      }
    } catch (e) {
      console.error("Failed to parse user data", e);
      router.push("/login");
    }
  }, [router]);

  if (!isAuthorized) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return <>{children}</>;
}
