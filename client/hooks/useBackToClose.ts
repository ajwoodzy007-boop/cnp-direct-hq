import { useEffect, useRef, useCallback } from 'react';

export function useBackToClose(isOpen: boolean, onClose: () => void) {
  const hasAddedHistoryRef = useRef(false);
  
  const stableOnClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      if (!hasAddedHistoryRef.current) {
        window.history.pushState({ modalOpen: true }, '', window.location.href);
        hasAddedHistoryRef.current = true;
      }

      const handlePopState = (event: PopStateEvent) => {
        if (hasAddedHistoryRef.current) {
          hasAddedHistoryRef.current = false;
          stableOnClose();
        }
      };

      window.addEventListener('popstate', handlePopState);

      return () => {
        window.removeEventListener('popstate', handlePopState);
        if (hasAddedHistoryRef.current) {
          hasAddedHistoryRef.current = false;
          window.history.back();
        }
      };
    } else {
      hasAddedHistoryRef.current = false;
    }
  }, [isOpen, stableOnClose]);
}
