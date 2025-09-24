import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
// Separator component not available, using div instead
import { ArrowLeft, Home, Mail, Search, Check } from "lucide-react";

interface NotFoundPageProps {
    onNavigate?: (page: string) => void;
    onGoBack?: () => void;
}

export function NotFoundPage({ onNavigate, onGoBack }: NotFoundPageProps) {
    const handleNavClick = (page: string) => {
        if (onNavigate) {
            onNavigate(page);
        }
    };

    return (
        <main className="min-h-[80vh] bg-background text-foreground">
            <div className="container mx-auto px-4 py-16">
                <div className="mx-auto max-w-3xl">
                    <div className="text-center mb-10">
                        <div className="text-6xl font-bold tracking-tight">404</div>
                        <h1 className="text-3xl md:text-4xl font-bold mt-3">
                            We couldn't find that page
                        </h1>
                        <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
                            The link may be broken, or the page may have been moved. Here are a few helpful links.
                        </p>
                    </div>

                    <Card className="shadow-sm border border-border/80">
                        <CardHeader>
                            <CardTitle>Try the following</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <ul className="space-y-3 text-sm">
                                {[
                                    "Check the URL for typos",
                                    "Use the main navigation to find a section",
                                    "Search for the page or topic you need",
                                ].map((tip) => (
                                    <li key={tip} className="flex items-start gap-3">
                                        <div className="mt-[2px] w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                                            <Check className="w-3.5 h-3.5 text-primary" />
                                        </div>
                                        <span className="text-foreground/90">{tip}</span>
                                    </li>
                                ))}
                            </ul>

                            <div className="border-t border-border my-4" />

                            <div className="flex flex-col sm:flex-row gap-3">
                                <Button
                                    onClick={() => handleNavClick('home')}
                                    className="w-full sm:w-auto"
                                >
                                    <Home className="mr-2 h-4 w-4" />
                                    Go to Home
                                </Button>
                                <Button
                                    onClick={() => handleNavClick('help')}
                                    variant="secondary"
                                    className="w-full sm:w-auto"
                                >
                                    <Search className="mr-2 h-4 w-4" />
                                    Browse Help
                                </Button>
                                <Button
                                    onClick={() => window.open('mailto:support@virtualaddresshub.co.uk')}
                                    variant="ghost"
                                    className="w-full sm:w-auto"
                                >
                                    <Mail className="mr-2 h-4 w-4" />
                                    Contact Support
                                </Button>
                            </div>

                            <div className="pt-2 text-xs text-muted-foreground">
                                <button
                                    onClick={onGoBack || (() => window.history.back())}
                                    className="inline-flex items-center hover:underline"
                                >
                                    <ArrowLeft className="mr-1 h-3.5 w-3.5" />
                                    Go back
                                </button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </main>
    );
}
