// app/lib/storage.ts
// Storage utilities for frontend - synced from backend

export interface StorageConfig {
    dataDir: string;
    invoicesDir: string;
    backupsDir: string;
}

/**
 * Frontend storage utilities for file operations
 */
export class StorageManager {
    private config: StorageConfig;

    constructor(config?: Partial<StorageConfig>) {
        this.config = {
            dataDir: config?.dataDir || '/data',
            invoicesDir: config?.invoicesDir || '/data/invoices',
            backupsDir: config?.backupsDir || '/data/backups',
            ...config,
        };
    }

    /**
     * Upload a file to the server
     */
    async uploadFile(file: File, path: string): Promise<string> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('path', path);

        const response = await fetch('/api/storage/upload', {
            method: 'POST',
            credentials: 'include',
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            throw new Error(`File upload failed: ${errorText}`);
        }

        const result = await response.json();
        return result.filePath;
    }

    /**
     * Download a file from the server
     */
    async downloadFile(path: string): Promise<Blob> {
        const response = await fetch(`/api/storage/download?path=${encodeURIComponent(path)}`, {
            credentials: 'include',
        });

        if (!response.ok) {
            throw new Error('File download failed');
        }

        return response.blob();
    }

    /**
     * Delete a file from the server
     */
    async deleteFile(path: string): Promise<void> {
        const response = await fetch('/api/storage/delete', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ path }),
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            throw new Error(`File deletion failed: ${errorText}`);
        }
    }

    /**
     * List files in a directory
     */
    async listFiles(directory: string): Promise<string[]> {
        const response = await fetch(`/api/storage/list?directory=${encodeURIComponent(directory)}`, {
            credentials: 'include',
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            throw new Error(`File listing failed: ${errorText}`);
        }

        const result = await response.json();
        return result.files;
    }

    /**
     * Get file info
     */
    async getFileInfo(path: string): Promise<{ size: number; modified: string; type: string }> {
        const response = await fetch(`/api/storage/info?path=${encodeURIComponent(path)}`, {
            credentials: 'include',
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            throw new Error(`File info retrieval failed: ${errorText}`);
        }

        return response.json();
    }
}

/**
 * Utility functions for file operations
 */
export class FileUtils {
    /**
     * Generate a safe filename
     */
    static safeFilename(filename: string): string {
        return filename.replace(/[^\w\-\.]+/g, '_').slice(0, 255);
    }

    /**
     * Get file extension
     */
    static getExtension(filename: string): string {
        const lastDot = filename.lastIndexOf('.');
        return lastDot > 0 ? filename.slice(lastDot + 1).toLowerCase() : '';
    }

    /**
     * Format file size
     */
    static formatFileSize(bytes: number): string {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return `${size.toFixed(1)} ${units[unitIndex]}`;
    }

    /**
     * Check if file type is allowed
     */
    static isAllowedFileType(filename: string, allowedTypes: string[]): boolean {
        const extension = this.getExtension(filename);
        return allowedTypes.includes(extension);
    }

    /**
     * Generate unique filename
     */
    static generateUniqueFilename(originalFilename: string): string {
        const timestamp = Date.now();
        const extension = this.getExtension(originalFilename);
        const baseName = originalFilename.replace(/\.[^/.]+$/, '');
        const safeBaseName = this.safeFilename(baseName);

        return `${safeBaseName}_${timestamp}${extension ? '.' + extension : ''}`;
    }
}

// Export singleton instance
export const storage = new StorageManager();
export const fileUtils = FileUtils;
