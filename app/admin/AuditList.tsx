"use client";
import { useEffect, useState } from "react";

type Audit = {
  id:number; item_id:number; user_id:number|null; action:string;
  before?:any; after?:any; created_at:number;
};

export default function AuditList({ itemId }: { itemId?: number }) {
  const [items, setItems] = useState<Audit[]>([]);
  useEffect(() => {
    const url = `/api/bff/admin/mail-audit${itemId ? `?item_id=${itemId}` : ""}`;
    fetch(url, { credentials: "include" })
      .then(r => r.json()).then(j => setItems(j.items || []));
  }, [itemId]);

  return (
    <div className="space-y-2">
      {items.map(a => (
        <div key={a.id} className="border rounded p-2 text-sm">
          <div className="font-medium">{a.action} • item #{a.item_id} • {new Date(a.created_at).toLocaleString()}</div>
          <pre className="text-xs overflow-auto bg-gray-50 p-2 rounded mt-1">
{JSON.stringify({ before: a.before, after: a.after, user_id: a.user_id }, null, 2)}
          </pre>
        </div>
      ))}
      {items.length === 0 && <div className="text-sm text-gray-500">No audit entries</div>}
    </div>
  );
}
