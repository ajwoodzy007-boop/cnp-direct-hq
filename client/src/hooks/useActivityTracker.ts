import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';

export function useActivityTracker() {
  const [location] = useLocation();
  const lastPingRef = useRef<number>(0);
  const MIN_PING_INTERVAL = 30000;

  useEffect(() => {
    const pingActivity = async () => {
      const now = Date.now();
      if (now - lastPingRef.current < MIN_PING_INTERVAL) return;
      
      lastPingRef.current = now;
      
      try {
        await fetch('/api/auth/ping', { 
          method: 'POST',
          credentials: 'include'
        });
      } catch (e) {
      }
    };

    pingActivity();
  }, [location]);
}
