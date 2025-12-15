import { useEffect, useRef } from 'react';
import { getOpenModalCount } from './modalState';

export function useBackToHome(currentTab: string, setTab: (tab: string) => void) {
  const hasAddedHistoryRef = useRef(false);

  useEffect(() => {
    const isNotHome = currentTab !== 'summary';
    
    if (isNotHome && !hasAddedHistoryRef.current) {
      window.history.pushState({ tabView: currentTab }, '', window.location.href);
      hasAddedHistoryRef.current = true;
    }
    
    if (currentTab === 'summary') {
      hasAddedHistoryRef.current = false;
    }
  }, [currentTab]);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state?.modalOpen) {
        return;
      }
      
      if (getOpenModalCount() > 0) {
        return;
      }
      
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
