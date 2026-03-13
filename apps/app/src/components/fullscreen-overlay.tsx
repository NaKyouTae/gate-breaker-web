'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export function FullscreenOverlay({ children }: { children: ReactNode }) {
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setContainer(document.getElementById('fullscreen-portal'));
  }, []);

  if (!container) return null;
  return createPortal(children, container);
}
