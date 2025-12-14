import { useEffect } from 'react';

export function useBackToClose(isOpen: boolean, onClose: () => void) {
  useEffect(() => {
    if (isOpen) {
      window.history.pushState({ modalOpen: true }, "", window.location.href);

      const handlePopState = (event: PopStateEvent) => {
        event.preventDefault();
        onClose();
      };

      window.addEventListener('popstate', handlePopState);

      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [isOpen, onClose]);
}