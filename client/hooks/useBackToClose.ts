import { useEffect } from 'react';

export function useBackToClose(isOpen: boolean, onClose: () => void) {
  useEffect(() => {
    if (!isOpen) return;

    window.history.pushState({ modal: true }, '');

    const handlePopState = (event: PopStateEvent) => {
      event.preventDefault();
      onClose();
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isOpen, onClose]);
}
