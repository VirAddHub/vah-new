"use client";

import { useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { EnhancedAdminDashboard } from "@/components/EnhancedAdminDashboard";
import { clearToken } from "@/lib/token-manager";
import { useVerifiedAdminSession } from "@/hooks/useVerifiedAdminSession";

export default function AdminDashboardPage() {
    const router = useRouter();
    const { status, user } = useVerifiedAdminSession();

    useEffect(() => {
        if (status === "unauthenticated") {
            router.replace("/admin/login");
            return;
        }
        if (status === "forbidden") {
            router.replace("/dashboard");
        }
    }, [status, router]);

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Verifying admin access…</p>
                </div>
            </div>
        );
    }

    if (status !== "ready") {
        return null;
    }

    const handleLogout = async () => {
        if ((handleLogout as any).__isLoggingOut) {
            return;
        }
        (handleLogout as any).__isLoggingOut = true;

        try {
            await fetch("/api/bff/auth/logout", {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
            });
        } catch (error) {
            console.error("Logout API call failed:", error);
        } finally {
            clearToken();
            localStorage.removeItem("vah_jwt");
            localStorage.removeItem("vah_user");
            const isSecure = window.location.protocol === "https:";
            const sameSiteValue = isSecure ? "None" : "Lax";
            const secureFlag = isSecure ? "; Secure" : "";
            document.cookie = `vah_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=${sameSiteValue}${secureFlag}`;
            document.cookie = `vah_csrf_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=${sameSiteValue}${secureFlag}`;
            document.cookie = `vah_role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=${sameSiteValue}${secureFlag}`;
            document.cookie = `vah_user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=${sameSiteValue}${secureFlag}`;
            document.cookie = `vah_jwt=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=${sameSiteValue}${secureFlag}`;

            window.stop();
            setTimeout(() => {
                window.location.replace("/admin/login");
            }, 200);
        }
    };

    const handleNavigate = (page: string) => {
        console.log("Navigate to:", page);
        if (page === "home") {
            router.push("/");
        } else {
            router.push(`/${page}`);
        }
    };

    const handleGoBack = () => {
        router.push("/");
    };

    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center bg-background">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                        <p className="text-muted-foreground">Loading admin dashboard...</p>
                    </div>
                </div>
            }
        >
            <EnhancedAdminDashboard
                onLogout={handleLogout}
                onNavigate={handleNavigate}
                onGoBack={handleGoBack}
                verifiedAdminUser={user}
            />
        </Suspense>
    );
}
