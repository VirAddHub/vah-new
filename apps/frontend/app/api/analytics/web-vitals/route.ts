import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

interface WebVitalsReport {
  metric: {
    id: string;
    name: string;
    value: number;
    delta: number;
    entries: any[];
    navigationType: string;
  };
  url: string;
  timestamp: number;
  userAgent: string;
  connection?: string;
  deviceMemory?: number;
}

export async function POST(request: NextRequest) {
  try {
    const report: WebVitalsReport = await request.json();
    
    // Log web vitals in development
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Web Vitals Report:', {
        metric: report.metric.name,
        value: report.metric.value,
        url: report.url,
        connection: report.connection,
        deviceMemory: report.deviceMemory,
      });
    }

    // In production, you might want to send to analytics services like:
    // - Google Analytics 4
    // - Vercel Analytics
    // - Custom analytics endpoint
    // - Database logging
    
    // For now, we'll just log to console in production too
    console.log(`[Web Vitals] ${report.metric.name}: ${report.metric.value} - ${report.url}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing web vitals report:', error);
    return NextResponse.json(
      { error: 'Failed to process web vitals report' },
      { status: 500 }
    );
  }
}
