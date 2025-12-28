import React, { createContext, useContext, useRef, useCallback, useEffect } from 'react';

type NavigationEntry = {
  id: string;
  type: 'modal' | 'tab';
  onBack: () => void;
};

type NavigationStackContextType = {
  register: (entry: NavigationEntry) => () => void;
  hasModals: () => boolean;
};

const NavigationStackContext = createContext<NavigationStackContextType | null>(null);

export function NavigationStackProvider({ children }: { children: React.ReactNode }) {
  const stackRef = useRef<NavigationEntry[]>([]);
  const historyDepthRef = useRef(0);

  const register = useCallback((entry: NavigationEntry): (() => void) => {
    const existingIndex = stackRef.current.findIndex(e => e.id === entry.id);
    if (existingIndex !== -1) {
      stackRef.current[existingIndex] = entry;
      return () => {
        stackRef.current = stackRef.current.filter(e => e.id !== entry.id);
      };
    }

    stackRef.current.push(entry);
    
    window.history.pushState({ navStackDepth: stackRef.current.length }, '', window.location.href);
    historyDepthRef.current++;

    return () => {
      const index = stackRef.current.findIndex(e => e.id === entry.id);
      if (index !== -1) {
        stackRef.current.splice(index, 1);
      }
    };
  }, []);

  const hasModals = useCallback(() => {
    return stackRef.current.some(e => e.type === 'modal');
  }, []);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (stackRef.current.length > 0) {
        const entry = stackRef.current.pop();
        if (entry) {
          historyDepthRef.current = Math.max(0, historyDepthRef.current - 1);
          entry.onBack();
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  return (
    <NavigationStackContext.Provider value={{ register, hasModals }}>
      {children}
    </NavigationStackContext.Provider>
  );
}

export function useNavigationStack() {
  const context = useContext(NavigationStackContext);
  if (!context) {
    throw new Error('useNavigationStack must be used within NavigationStackProvider');
  }
  return context;
}

export function useModalBack(isOpen: boolean, onClose: () => void, id: string) {
  const { register } = useNavigationStack();
  const registeredRef = useRef(false);
  const unregisterRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (isOpen && !registeredRef.current) {
      registeredRef.current = true;
      unregisterRef.current = register({
        id,
        type: 'modal',
        onBack: onClose,
      });
    } else if (!isOpen && registeredRef.current) {
      registeredRef.current = false;
      if (unregisterRef.current) {
        unregisterRef.current();
        unregisterRef.current = null;
      }
    }
  }, [isOpen, onClose, register, id]);

  useEffect(() => {
    return () => {
      if (unregisterRef.current) {
        unregisterRef.current();
      }
    };
  }, []);
}

export function useTabBack(currentTab: string, setTab: (tab: string) => void) {
  const { register, hasModals } = useNavigationStack();
  const registeredRef = useRef(false);
  const unregisterRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const isNotHome = currentTab !== 'summary';
    
    if (isNotHome && !registeredRef.current && !hasModals()) {
      registeredRef.current = true;
      unregisterRef.current = register({
        id: 'tab-navigation',
        type: 'tab',
        onBack: () => {
          registeredRef.current = false;
          setTab('summary');
        },
      });
    } else if (!isNotHome && registeredRef.current) {
      registeredRef.current = false;
      if (unregisterRef.current) {
        unregisterRef.current();
        unregisterRef.current = null;
      }
    }
  }, [currentTab, setTab, register, hasModals]);

  useEffect(() => {
    return () => {
      if (unregisterRef.current) {
        unregisterRef.current();
      }
    };
  }, []);
}
