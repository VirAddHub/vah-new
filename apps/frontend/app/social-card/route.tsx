import { ImageResponse } from 'next/og';

// The share card for every page (WhatsApp, LinkedIn, X, Slack, iMessage), at /social-card.
// Served as a route rather than an opengraph-image file: with that file convention Next.js drops the
// images that individual pages list. 1200 x 630 is the size those sites expect.
const size = { width: 1200, height: 630 };
export const dynamic = 'force-static';

export function GET() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        background: '#123d30', color: '#f8f5ed', padding: '72px 80px', fontFamily: 'Georgia, serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 30, fontFamily: 'Arial, sans-serif', letterSpacing: '-0.01em' }}>
          <div style={{ width: 44, height: 44, borderRadius: 22, border: '4px solid #6fcf97', display: 'flex' }} />
          VirtualAddressHub
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ fontSize: 72, lineHeight: 1.05, letterSpacing: '-0.02em' }}>A London business address.</div>
          <div style={{ fontSize: 72, lineHeight: 1.05, letterSpacing: '-0.02em', color: '#b9e4c9' }}>Your post, the same day.</div>
        </div>
        <div style={{ display: 'flex', gap: 56, fontSize: 26, fontFamily: 'Arial, sans-serif', color: '#e6eee3' }}>
          <span>Tower Bridge, London SE1</span>
          <span>Registered office included</span>
          <span>From £9.99 a month</span>
        </div>
      </div>
    ),
    size,
  );
}
