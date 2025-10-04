"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DASHBOARD_MODE } from '@/lib/config';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileArchive, ArrowRight } from 'lucide-react';

export default function DashboardClient() {
    const router = useRouter();

    useEffect(() => {
        // Check if user is authenticated
        const token = localStorage.getItem('vah_jwt');
        if (!token) {
            router.push('/login');
            return;
        }

        // If in inbox-only mode, redirect to the simple mail page
        if (DASHBOARD_MODE === "inbox-only") {
            router.push('/my-mail');
            return;
        }
    }, [router]);

    // Show maintenance message
    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <Card className="max-w-xl w-full">
                <CardContent className="p-8 text-center">
                    <FileArchive className="h-16 w-16 mx-auto mb-6 text-muted-foreground" />
                    <h1 className="text-2xl font-bold mb-4">We'll be right back</h1>
                    <p className="text-muted-foreground mb-6">
                        We're doing a quick upgrade to make your experience better.
                        You can still view and download your mail while we work.
                    </p>
                    <Button
                        onClick={() => router.push('/my-mail')}
                        className="w-full"
                    >
                        View My Mail
                        <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
