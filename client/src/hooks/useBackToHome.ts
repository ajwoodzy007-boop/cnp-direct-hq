import { useEffect, useRef, useCallback } from 'react';

export function useBackToHome(currentTab: string, setTab: (tab: string) => void) {
  const initializedRef = useRef(false);
  const currentTabRef = useRef(currentTab);
  
  currentTabRef.current = currentTab;

  const stableSetTab = useCallback((tab: string) => {
    setTab(tab);
  }, [setTab]);

  useEffect(() => {
    if (currentTab !== 'summary' && !initializedRef.current) {
      window.history.replaceState({ tabView: 'summary', isHome: true }, '', window.location.href);
      window.history.pushState({ tabView: currentTab, isHome: false }, '', window.location.href);
      initializedRef.current = true;
    }
    
    if (currentTab === 'summary') {
      initializedRef.current = false;
    }
  }, [currentTab]);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state?.modalOpen) {
        return;
      }
      
      if (event.state?.isHome === true && currentTabRef.current !== 'summary') {
        initializedRef.current = false;
        stableSetTab('summary');
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [stableSetTab]);
}
