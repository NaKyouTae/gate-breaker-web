'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

type CodexView =
  | { type: 'list' }
  | { type: 'item'; id: string }
  | { type: 'monster'; id: string };

interface CodexModalContextValue {
  isOpen: boolean;
  view: CodexView;
  open: () => void;
  close: () => void;
  goToItem: (id: string) => void;
  goToMonster: (id: string) => void;
  goToList: () => void;
}

const CodexModalContext = createContext<CodexModalContextValue | null>(null);

export function CodexModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<CodexView>({ type: 'list' });

  const open = useCallback(() => {
    setView({ type: 'list' });
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const goToItem = useCallback((id: string) => {
    setView({ type: 'item', id });
  }, []);

  const goToMonster = useCallback((id: string) => {
    setView({ type: 'monster', id });
  }, []);

  const goToList = useCallback(() => {
    setView({ type: 'list' });
  }, []);

  return (
    <CodexModalContext.Provider value={{ isOpen, view, open, close, goToItem, goToMonster, goToList }}>
      {children}
    </CodexModalContext.Provider>
  );
}

export function useCodexModal() {
  const ctx = useContext(CodexModalContext);
  if (!ctx) throw new Error('useCodexModal must be used within CodexModalProvider');
  return ctx;
}
