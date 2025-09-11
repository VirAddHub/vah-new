'use client';
import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';

export default function DashboardPage() {
  const [me, setMe] = useState<any>(null);
  const kyc = me?.kyc_status || 'unknown';

  useEffect(() => {
    (async () => {
      try {
        const profile = await apiGet('/api/profile');
        setMe(profile);
      } catch { }
    })();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      {/* Recent mail table would be here */}

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-white/10 p-4">
          <div className="font-medium mb-1">Letter of Certification</div>
          <p className="text-sm opacity-80 mb-3">
            Download your proof of address. (KYC required)
          </p>
          <a
            href="/api/profile/certificate-url"
            className={`inline-block px-4 py-2 rounded border ${kyc === 'approved' ? 'border-white/15 hover:bg-white/10' : 'border-white/10 opacity-50 pointer-events-none'
              }`}
          >
            Get certificate PDF
          </a>
        </div>
      </div>
    </div>
  );
}