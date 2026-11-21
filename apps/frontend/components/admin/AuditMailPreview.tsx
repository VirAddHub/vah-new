'use client';

import { useEffect, useState } from 'react';
import { buildAdminBffHeaders } from '@/lib/verifiedAdminSession';

/** Fetch only when a mail event is opened; the existing BFF enforces admin access. */
export function AuditMailPreview({ mailId }: { mailId: string }) {
  const [scan, setScan] = useState<{ url: string; image: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setScan(null);
    fetch(`/api/bff/admin/mail-items/${encodeURIComponent(mailId)}`, {
      headers: buildAdminBffHeaders(), credentials: 'include', cache: 'no-store', signal: controller.signal,
    }).then(async response => {
      if (!response.ok) return;
      const json = await response.json();
      const item = json.data;
      const raw = item?.file_url || item?.scan_file_url;
      if (typeof raw !== 'string') return;
      const url = new URL(raw, window.location.href);
      if (url.protocol !== 'https:' && !(url.origin === window.location.origin && url.protocol === 'http:')) return;
      if (!controller.signal.aborted) setScan({ url: url.href, image: /^image\//.test(item.file_mime || '') || /\.(png|jpe?g|webp)(\?|$)/i.test(url.pathname) });
    }).catch(() => {}).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [mailId]);
  return <section aria-label="Mail scan preview">
    <h3>Mail preview</h3>
    <p style={{fontSize:'.875rem',color:'#525252',marginBottom:'.75rem'}}>Currently available scan · This is not an event-time snapshot.</p>
    {loading ? <p role="status">Loading scan…</p> : scan ? <>
      <div style={{height:280,border:'1px solid #d4d4d4',borderRadius:6,overflow:'hidden',background:'#f5f5f5'}}>
        {scan.image ? <img src={scan.url} alt={`Scan of mail #${mailId}`} style={{width:'100%',height:'100%',objectFit:'contain'}} referrerPolicy="no-referrer" onError={() => setScan(null)} /> : <iframe title={`Scan of mail #${mailId}`} src={scan.url} style={{width:'100%',height:'100%',border:0}} sandbox="allow-scripts allow-same-origin allow-downloads" referrerPolicy="no-referrer" />}
      </div>
      <a href={scan.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Open scanned mail</a>
      <p style={{fontSize:'.875rem',color:'#525252'}}>If the document provider cannot display the preview, open the scan in a new tab.</p>
    </> : <p>Scan unavailable</p>}
  </section>;
}
