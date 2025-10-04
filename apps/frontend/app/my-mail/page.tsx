"use client";
import { useEffect, useState } from "react";
import { mailApi } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, Download, FileArchive, LogOut, ArrowLeft } from "lucide-react";
// Removed sonner dependency - using simple alerts instead
import { useRouter } from "next/navigation";

export default function MyMailPage() {
    const router = useRouter();
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [openId, setOpenId] = useState<string | null>(null);
    const [details, setDetails] = useState<Record<string, any>>({});

    useEffect(() => {
        loadMail();
    }, []);

    const loadMail = async () => {
        try {
            setLoading(true);
            const response = await mailApi.list();
            if (response.ok) {
                setItems(response.data || []);
            } else {
                console.error("Couldn't load mail:", response.error);
            }
        } catch (error) {
            console.error("Failed to load mail:", error);
        } finally {
            setLoading(false);
        }
    };

    const openMail = async (id: string) => {
        setOpenId((prev) => (prev === id ? null : id));
        if (!details[id]) {
            try {
                const res = await mailApi.get(id);
                if (res.ok && res.data) {
                    setDetails(d => ({ ...d, [id]: res.data }));
                    // Mark as read
                    await mailApi.markRead(id);
                    // Refresh the list to update read status
                    loadMail();
                }
            } catch (error) {
                console.error("Failed to load mail details:", error);
            }
        }
    };

    const downloadPdf = async (id: string) => {
        try {
            const blob = await mailApi.downloadScan(id);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `mail-${id}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            console.log("Download started");
        } catch (error) {
            console.error("Download failed:", error);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('vah_jwt');
        localStorage.removeItem('vah_user');
        router.push('/login');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background">
                {/* Header */}
                <div className="border-b border-border bg-card">
                    <div className="max-w-4xl mx-auto px-4 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                                    <FileArchive className="h-5 w-5 text-primary-foreground" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold">My Mail</h1>
                                    <p className="text-sm text-muted-foreground">VirtualAddressHub</p>
                                </div>
                            </div>
                            <Button variant="outline" size="sm" onClick={handleLogout}>
                                <LogOut className="h-4 w-4 mr-2" />
                                Sign Out
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Loading Content */}
                <div className="max-w-4xl mx-auto p-4 sm:p-6">
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <Card key={i}>
                                <CardContent className="p-4">
                                    <div className="animate-pulse">
                                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="border-b border-border bg-card">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                                <FileArchive className="h-5 w-5 text-primary-foreground" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold">My Mail</h1>
                                <p className="text-sm text-muted-foreground">VirtualAddressHub</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => router.push('/dashboard')}>
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Dashboard
                            </Button>
                            <Button variant="outline" size="sm" onClick={handleLogout}>
                                <LogOut className="h-4 w-4 mr-2" />
                                Sign Out
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-4xl mx-auto p-4 sm:p-6">
                {/* Stats */}
                <div className="flex items-center gap-4 mb-6">
                    <Badge variant="secondary" className="text-sm">
                        {items.filter(item => !item.is_read).length} unread
                    </Badge>
                    <Badge variant="outline" className="text-sm">
                        {items.length} total
                    </Badge>
                </div>

                {items.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center text-muted-foreground">
                            <FileArchive className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p className="text-lg font-medium">No mail yet</p>
                            <p className="text-sm">Your mail will appear here once it's processed</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {items.map(item => (
                            <Card key={item.id} className={`transition-all ${openId === item.id ? 'ring-2 ring-primary/20 bg-muted/30' : ''}`}>
                                <CardContent className="p-4 space-y-3">
                                    {/* Header - Always Visible */}
                                    <div
                                        className="cursor-pointer active:opacity-70 transition-opacity"
                                        onClick={() => openMail(item.id)}
                                    >
                                        <div className="flex justify-between items-start gap-2 mb-2">
                                            <h3 className="font-medium flex-1 break-words pr-2">
                                                {item.description || item.subject || "Mail Item"}
                                            </h3>
                                            <div className="flex items-center gap-2 shrink-0">
                                                {item.tag && (
                                                    <Badge variant="outline" className="text-xs">
                                                        {item.tag}
                                                    </Badge>
                                                )}
                                                <Badge variant={item.is_read ? "secondary" : "default"}>
                                                    {item.is_read ? "Read" : "Unread"}
                                                </Badge>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center gap-2 text-muted-foreground">
                                            <span className="text-sm">
                                                {new Date(item.received_at).toLocaleDateString()}
                                            </span>
                                            <span className="text-sm">
                                                {item.sender_name || "Unknown sender"}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Expanded Details */}
                                    {openId === item.id && (
                                        <div className="pt-3 border-t space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <p className="text-xs text-muted-foreground mb-1">Received</p>
                                                    <p className="text-sm font-medium">
                                                        {new Date(item.received_at).toLocaleString()}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground mb-1">Type</p>
                                                    <p className="text-sm font-medium">{item.tag || "Other"}</p>
                                                </div>
                                            </div>

                                            {details[item.id]?.scan_url && (
                                                <div className="border rounded-lg overflow-hidden bg-background">
                                                    <div className="px-3 py-2 bg-muted/50 text-xs font-medium">
                                                        Mail Scan Preview
                                                    </div>
                                                    <div className="p-3">
                                                        <img
                                                            src={details[item.id].scan_url}
                                                            alt="Mail scan"
                                                            className="w-full h-auto rounded border"
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {!details[item.id]?.scan_url && (
                                                <div className="border rounded-lg p-6 text-center text-muted-foreground bg-muted/20">
                                                    <FileArchive className="h-10 w-10 mx-auto mb-2 opacity-50" />
                                                    <p className="text-sm">No scan preview available</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="flex gap-2">
                                        <Button
                                            size="default"
                                            variant={openId === item.id ? "default" : "outline"}
                                            onClick={() => openMail(item.id)}
                                            className="flex-1 h-10"
                                        >
                                            <Eye className="h-4 w-4 mr-2" />
                                            {openId === item.id ? "Close" : "View"}
                                        </Button>
                                        <Button
                                            size="default"
                                            variant="outline"
                                            onClick={() => downloadPdf(item.id)}
                                            className="flex-1 h-10"
                                        >
                                            <Download className="h-4 w-4 mr-2" />
                                            Download
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}