"use client";

import { MailManagement } from "@/components/MailManagement";

// Test page to verify MailManagement component works
export default function TestMailManagement() {
    const mockMailItems = [
        {
            id: 1,
            subject: "Test Mail 1",
            sender_name: "Test Sender",
            received_date: "2024-01-15",
            status: "received",
            tag: "Important",
            is_read: false,
            created_at: "2024-01-15T10:00:00Z",
            scanned_at: "2024-01-15T10:30:00Z",
            file_url: "/test.pdf",
            archived: false
        },
        {
            id: 2,
            subject: "Test Mail 2",
            sender_name: "Another Sender",
            received_date: "2024-01-16",
            status: "received",
            tag: "Bills",
            is_read: true,
            created_at: "2024-01-16T09:00:00Z",
            scanned_at: "2024-01-16T09:15:00Z",
            file_url: "/test2.pdf",
            archived: true
        }
    ];

    const mockFormatScannedDate = (item: any) => {
        if (item.scanned_at) {
            return new Date(item.scanned_at).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
        }
        return null;
    };

    const mockOnRefresh = () => {
        console.log('Refreshing mail...');
    };

    const mockOnOpen = (item: any) => {
        console.log('Opening mail item:', item.id);
    };

    const mockOnDownload = (item: any) => {
        console.log('Downloading mail item:', item.id);
    };

    return (
        <div className="container mx-auto p-6">
            <h1 className="text-2xl font-bold mb-6">Test Mail Management</h1>
            <MailManagement
                mailItems={mockMailItems}
                onRefresh={mockOnRefresh}
                onOpen={mockOnOpen}
                onDownload={mockOnDownload}
                formatScannedDate={mockFormatScannedDate}
            />
        </div>
    );
}

