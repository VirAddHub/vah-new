import Callout from '@/app/components/Callout';

export default async function ForwardingPage() {
  // List user requests
  const res = await fetch(`${process.env.BACKEND_API_ORIGIN}/forwarding-requests`, { cache: 'no-store', credentials: 'include' });
  const data = res.ok ? await res.json() : { rows: [] };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-semibold">My Forwarding Requests</h1>
      <p className="mb-4 text-gray-600">Track the status of your requests here.</p>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Item</th>
              <th className="px-3 py-2 text-left font-medium">Created</th>
              <th className="px-3 py-2 text-left font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.rows?.length ? (
              data.rows.map((r: any) => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2">{r.mail_subject || r.mail_item_id}</td>
                  <td className="px-3 py-2">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="px-3 py-2">{r.status}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-3 py-6 text-center text-gray-500" colSpan={3}>
                  No forwarding requests yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-gray-500">
        Letters from <strong>HMRC</strong> and <strong>Companies House</strong> are forwarded <strong>free</strong>.
      </p>
    </div>
  );
}
