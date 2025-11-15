import { Mail, ScanLine, Clock, Shield } from "lucide-react";
import { Badge } from "./ui/badge";

interface MailboxPreviewCardProps {
    showPriceBadge?: boolean;
    price?: string;
}

export function MailboxPreviewCard({
    showPriceBadge = true,
    price = "£9.99/mo"
}: MailboxPreviewCardProps) {
    return (
        <div className="relative">
            <div className="shadow-neutral-900/10 bg-card border-border border rounded-2xl pt-6 pr-6 pb-6 pl-6 relative shadow-2xl backdrop-blur-xl">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                                data-lucide="mail" className="lucide lucide-mail w-5 h-5 text-primary">
                                <path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7"></path>
                                <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                            </svg>
                        </div>
                        <div>
                            <p className="font-semibold text-sm text-foreground">Your Mail Dashboard</p>
                            <p className="text-xs text-muted-foreground">Real-time updates</p>
                        </div>
                    </div>
                    <span className="px-2.5 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full">3 New</span>
                </div>

                {/* Mail Items */}
                <div className="space-y-2.5 mb-4">
                    <div
                        className="flex items-center gap-3 p-3 bg-muted/50 hover:bg-muted rounded-xl transition-colors cursor-pointer group">
                        <div className="w-9 h-9 bg-destructive/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                                data-lucide="file-text" className="lucide lucide-file-text w-4 h-4 text-destructive">
                                <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path>
                                <path d="M14 2v4a2 2 0 0 0 2 2h4"></path>
                                <path d="M10 9H8"></path>
                                <path d="M16 13H8"></path>
                                <path d="M16 17H8"></path>
                            </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-foreground truncate">HMRC</p>
                            <p className="text-xs text-muted-foreground truncate">VAT Return Notice</p>
                        </div>
                        <span className="px-2 py-1 bg-accent text-accent-foreground text-xs font-medium rounded-md flex-shrink-0">Free Forward</span>
                    </div>

                    <div
                        className="flex items-center gap-3 p-3 bg-muted/50 hover:bg-muted rounded-xl transition-colors cursor-pointer group">
                        <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                                data-lucide="building-2" className="lucide lucide-building-2 w-4 h-4 text-primary">
                                <path d="M10 12h4"></path>
                                <path d="M10 8h4"></path>
                                <path d="M14 21v-3a2 2 0 0 0-4 0v3"></path>
                                <path d="M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2"></path>
                                <path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"></path>
                            </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-foreground truncate">Companies House</p>
                            <p className="text-xs text-muted-foreground truncate">Annual Confirmation</p>
                        </div>
                        <span className="px-2 py-1 bg-muted text-muted-foreground text-xs font-medium rounded-md flex-shrink-0">Scanned</span>
                    </div>

                    <div
                        className="flex items-center gap-3 p-3 bg-muted/50 hover:bg-muted rounded-xl transition-colors cursor-pointer group">
                        <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                                data-lucide="landmark" className="lucide lucide-landmark w-4 h-4 text-primary">
                                <path d="M10 18v-7"></path>
                                <path
                                    d="M11.12 2.198a2 2 0 0 1 1.76.006l7.866 3.847c.476.233.31.949-.22.949H3.474c-.53 0-.695-.716-.22-.949z">
                                </path>
                                <path d="M14 18v-7"></path>
                                <path d="M18 18v-7"></path>
                                <path d="M3 22h18"></path>
                                <path d="M6 18v-7"></path>
                            </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-foreground truncate">Barclays Bank</p>
                            <p className="text-xs text-muted-foreground truncate">Account Statement</p>
                        </div>
                        <span className="px-2 py-1 bg-muted text-muted-foreground text-xs font-medium rounded-md flex-shrink-0">Today</span>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                            data-lucide="clock" className="lucide lucide-clock w-3.5 h-3.5">
                            <path d="M12 6v6l4 2"></path>
                            <circle cx="12" cy="12" r="10"></circle>
                        </svg>
                        <span>Scanned today</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                            data-lucide="shield" className="lucide lucide-shield w-3.5 h-3.5">
                            <path
                                d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z">
                            </path>
                        </svg>
                        <span>Secure &amp; Private</span>
                    </div>
                </div>
            </div>

            {/* Floating badge */}
            {showPriceBadge && (
                <div className="absolute -bottom-4 -right-4 bg-accent text-accent-foreground px-6 py-3 rounded-2xl shadow-lg">
                    <p className="text-xs uppercase tracking-wide opacity-90">
                        Live in Minutes
                    </p>
                    <p className="text-2xl font-bold">{price}</p>
                </div>
            )}
        </div>
    );
}
