"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // Middleware handles token verification and main routing protection.
    const userStr = localStorage.getItem("user");

    if (!userStr) {
      router.push("/login");
      return;
    }

    try {
      const user = JSON.parse(userStr);
      // If user is admin, they shouldn't be in client dashboard unless we want to allow admins to view client view?
      // User request: "admin not allowed in client"
      if (user.role === "admin") {
        router.push("/dashboard/admin");
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
