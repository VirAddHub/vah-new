'use client';
import { pingContact, pingAuth, pingForwarding } from '@/lib/pingApi';

export function DevButtons() {
    if (process.env.NODE_ENV !== 'development') return null;

    return (
        <div className="fixed bottom-4 right-4 space-y-2 bg-white border rounded p-3 shadow-lg">
            <div className="text-xs font-semibold text-gray-600">Dev Tools</div>
            <button
                onClick={async () => alert(JSON.stringify(await pingContact()))}
                className="block w-full px-3 py-2 rounded border text-sm hover:bg-gray-50"
            >
                Ping Contact API
            </button>
            <button
                onClick={async () => alert(JSON.stringify(await pingAuth()))}
                className="block w-full px-3 py-2 rounded border text-sm hover:bg-gray-50"
            >
                Ping Auth API
            </button>
            <button
                onClick={async () => alert(JSON.stringify(await pingForwarding()))}
                className="block w-full px-3 py-2 rounded border text-sm hover:bg-gray-50"
            >
                Ping Forwarding API
            </button>
        </div>
    );
}
