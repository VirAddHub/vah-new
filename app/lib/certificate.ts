// app/lib/certificate.ts
// Certificate service for frontend - synced from backend

export interface CertificateData {
    clientBusinessName: string;
    clientContactName: string;
}

export interface CertificateResponse {
    pdfPath: string;
    filename: string;
}

/**
 * Request a Proof of Registered Address certificate from the backend
 */
export async function requestCertificate(data: CertificateData): Promise<CertificateResponse> {
    const response = await fetch('/api/profile/certificate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Certificate request failed: ${errorText}`);
    }

    return response.json();
}

/**
 * Download a certificate PDF
 */
export async function downloadCertificate(filename: string): Promise<Blob> {
    const response = await fetch(`/api/profile/certificate/${filename}`, {
        credentials: 'include',
    });

    if (!response.ok) {
        throw new Error('Failed to download certificate');
    }

    return response.blob();
}

/**
 * Generate a safe filename for certificates
 */
export function safeFilename(s: string): string {
    return String(s || '').replace(/[^\w\-]+/g, '_').slice(0, 80);
}

/**
 * Format today's date in UK format
 */
export function todayUK(): string {
    return new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });
}
