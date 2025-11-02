"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/use-toast";

export default function ComplianceCheckPage() {
    const { toast } = useToast();
    const [showCompletion, setShowCompletion] = useState(false);
    const [quizScore, setQuizScore] = useState<number | null>(null);

    // Handle quiz completion redirect with query params
    useEffect(() => {
        const url = new URL(window.location.href);
        const done = url.searchParams.get("done");
        const score = url.searchParams.get("score");
        const email = url.searchParams.get("email");

        if (done === "1") {
            setShowCompletion(true);
            if (score) {
                setQuizScore(parseInt(score, 10));
            }

            // Lightweight analytics ping
            fetch("/api/bff/quiz/ping", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ score, email }),
            }).catch(() => {
                // Silent fail for analytics
            });

            // Show success toast
            toast({
                title: "Quiz completed!",
                description: "Check your inbox for your personalized results.",
            });
        }
    }, [toast]);

    return (
        <main className="mx-auto max-w-5xl px-6 py-16">
            <section className="text-center">
                <span className="inline-block rounded-full bg-[#FF6B00]/10 px-3 py-1 text-xs font-medium text-[#FF6B00]">
                    Free 3-minute quiz
                </span>
                <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                    Is Your Business Address Fully HMRC-Compliant?
                </h1>
                <p className="mx-auto mt-3 max-w-2xl text-balance text-sm text-neutral-600 sm:text-base">
                    Find out if your registered or trading address meets the latest UK Companies House and HMRC requirements.
                    Answer 15 quick questions to reveal hidden risks, protect your privacy, and get instant recommendations.
                </p>

                <div className="mt-6 inline-flex items-center gap-2 text-xs text-neutral-500">
                    <span>✅ Instant score</span>
                    <span>•</span>
                    <span>✅ Actionable next steps</span>
                    <span>•</span>
                    <span>✅ Completely free</span>
                </div>
            </section>

            <section className="mt-10 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
                {showCompletion ? (
                    <div className="aspect-[16/12] w-full overflow-hidden rounded-xl border border-neutral-200 bg-gradient-to-br from-[#FF6B00]/5 to-[#FF6B00]/10 p-8 flex flex-col items-center justify-center text-center">
                        <div className="text-6xl mb-4">🎉</div>
                        <h2 className="text-2xl font-semibold mb-2">Thanks for completing the quiz!</h2>
                        {quizScore !== null && (
                            <p className="text-lg text-neutral-600 mb-4">
                                Your compliance score: <strong className="text-[#FF6B00]">{quizScore}/100</strong>
                            </p>
                        )}
                        <p className="text-sm text-neutral-600 mb-6">
                            Check your inbox for your personalized recommendations and next steps.
                        </p>
                        <a
                            href="/pricing"
                            className="inline-flex items-center justify-center rounded-xl bg-[#FF6B00] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
                        >
                            View Pricing
                        </a>
                    </div>
                ) : (
                    <>
                        <div className="aspect-[16/12] w-full overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50">
                            <iframe
                                title="VAH Compliance Check"
                                src={process.env.NEXT_PUBLIC_QUIZ_EMBED_URL || "about:blank"}
                                className="h-full w-full"
                                allow="clipboard-write; clipboard-read; fullscreen"
                                referrerPolicy="strict-origin-when-cross-origin"
                            />
                        </div>
                        <p className="mt-3 text-center text-xs text-neutral-500">
                            {process.env.NEXT_PUBLIC_QUIZ_EMBED_URL
                                ? "Complete the quiz to get your compliance score"
                                : "Configure NEXT_PUBLIC_QUIZ_EMBED_URL to embed your quiz"}
                        </p>
                    </>
                )}
            </section>

            <section className="mt-12 grid gap-6 sm:grid-cols-3">
                <div className="rounded-xl border border-neutral-200 bg-white p-5">
                    <h3 className="text-base font-semibold">Legal Compliance</h3>
                    <p className="mt-2 text-sm text-neutral-600">
                        Check alignment with the Economic Crime & Corporate Transparency Act (ECCTA), Companies House and HMRC.
                    </p>
                </div>
                <div className="rounded-xl border border-neutral-200 bg-white p-5">
                    <h3 className="text-base font-semibold">Privacy & Security</h3>
                    <p className="mt-2 text-sm text-neutral-600">
                        Avoid exposing your home address and ensure GDPR-compliant mail handling with same-day scanning.
                    </p>
                </div>
                <div className="rounded-xl border border-neutral-200 bg-white p-5">
                    <h3 className="text-base font-semibold">Actionable Plan</h3>
                    <p className="mt-2 text-sm text-neutral-600">
                        Get practical steps tailored to your score — from quick fixes to switching provider smoothly.
                    </p>
                </div>
            </section>
        </main>
    );
}

