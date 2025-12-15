import { useEffect, useRef } from 'react';

export function useBackToHome(currentTab: string, setTab: (tab: string) => void) {
  const hasAddedHistoryRef = useRef(false);
  const previousTabRef = useRef(currentTab);

  useEffect(() => {
    const isNotHome = currentTab !== 'summary';
    
    if (isNotHome && !hasAddedHistoryRef.current) {
      window.history.pushState({ tabView: currentTab }, '', window.location.href);
      hasAddedHistoryRef.current = true;
    }
    
    if (currentTab === 'summary') {
      hasAddedHistoryRef.current = false;
    }

    previousTabRef.current = currentTab;
  }, [currentTab]);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (hasAddedHistoryRef.current) {
        hasAddedHistoryRef.current = false;
        setTab('summary');
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [setTab]);
}
