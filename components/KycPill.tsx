interface KycPillProps {
  status?: string;
}

export default function KycPill({ status }: KycPillProps) {
  const s = (status || '').toUpperCase();
  const label =
    s === 'GREEN' ? 'KYC Verified' :
    s === 'YELLOW' ? 'KYC Pending' :
    s === 'RED' ? 'KYC Rejected' :
    s ? `KYC: ${s}` : 'KYC: Unknown';
  const cls =
    s === 'GREEN' ? 'bg-green-100 text-green-800' :
    s === 'YELLOW' ? 'bg-yellow-100 text-yellow-800' :
    s === 'RED' ? 'bg-red-100 text-red-800' :
    'bg-gray-100 text-gray-800';
  return <span className={`inline-flex items-center px-2 py-1 rounded-full text-sm ${cls}`}>{label}</span>;
}
