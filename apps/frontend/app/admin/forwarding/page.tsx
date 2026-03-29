"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import CollaborativeForwardingBoard from "@/components/admin/CollaborativeForwardingBoard";
import { useVerifiedAdminSession } from "@/hooks/useVerifiedAdminSession";

export default function AdminForwardingPage() {
  const router = useRouter();
  const { status, user } = useVerifiedAdminSession();

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/admin/login");
    else if (status === "forbidden") router.replace("/dashboard");
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying admin access…</p>
        </div>
      </div>
    );
  }

  if (status !== "ready") {
    return null;
  }

  return <CollaborativeForwardingBoard verifiedAdminUser={user} />;
}
