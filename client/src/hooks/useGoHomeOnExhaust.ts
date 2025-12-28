import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';

export function useGoHomeOnExhaust() {
  const [location, setLocation] = useLocation();
  const initialHistoryLength = useRef(window.history.length);
  const hasSetupRef = useRef(false);

  useEffect(() => {
    if (hasSetupRef.current) return;
    hasSetupRef.current = true;

    const handlePopState = () => {
      if (window.history.length <= 1 || window.history.state === null) {
        if (location !== '/') {
          setLocation('/');
        }
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [location, setLocation]);
}
