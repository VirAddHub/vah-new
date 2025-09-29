'use client';

import { useEffect } from 'react';
import { pingReady } from '@/lib/ready';

export function ReadyPing() {
  useEffect(() => {
    pingReady();
  }, []);
  
  return null; // This component doesn't render anything
}
