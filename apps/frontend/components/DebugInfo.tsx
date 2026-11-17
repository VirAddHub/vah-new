"use client";

import { useState, useEffect } from "react";

export function DebugInfo() {
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    const info = {
      apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
      backendBase: process.env.NEXT_PUBLIC_BACKEND_BASE,
      nodeEnv: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    };
    setDebugInfo(info);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 bg-destructive/[0.06] border border-destructive/25 rounded-lg p-4 max-w-md text-caption">
      <h3 className="font-bold text-destructive mb-2">Debug Info</h3>
      <pre className="text-destructive whitespace-pre-wrap">
        {JSON.stringify(debugInfo, null, 2)}
      </pre>
    </div>
  );
}
