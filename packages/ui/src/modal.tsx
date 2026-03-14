'use client';

import React, { useEffect, useCallback } from 'react';

// ===== Global modal open counter =====
let modalOpenCount = 0;
const listeners = new Set<() => void>();

function incrementModal() {
  modalOpenCount++;
  listeners.forEach((fn) => fn());
}

function decrementModal() {
  modalOpenCount = Math.max(0, modalOpenCount - 1);
  listeners.forEach((fn) => fn());
}

export function useAnyModalOpen(): boolean {
  const [open, setOpen] = React.useState(modalOpenCount > 0);
  useEffect(() => {
    const handler = () => setOpen(modalOpenCount > 0);
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, []);
  return open;
}

// ===== Sub-components =====

/** Fullscreen dark overlay with centered content */
export function ModalOverlay({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  useEffect(() => {
    incrementModal();
    document.body.style.overflow = 'hidden';
    return () => {
      decrementModal();
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(5, 3, 12, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          animation: 'gb-modal-fade-in 0.25s ease',
        }}
        onClick={onClick}
      >
        {children}
      </div>
      <style>{`
        @keyframes gb-modal-fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes gb-modal-scale-in { from { opacity: 0; transform: scale(0.96) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
      `}</style>
    </>
  );
}

/** Dungeon-themed modal frame with gold corners and glow effects */
export function ModalFrame({
  children,
  maxWidth = '520px',
  maxHeight = '90dvh',
  style,
}: {
  children: React.ReactNode;
  maxWidth?: string;
  maxHeight?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'relative',
        background: 'linear-gradient(180deg, #1e1830 0%, #16122a 50%, #13101e 100%)',
        border: '1.5px solid rgba(212, 160, 23, 0.3)',
        borderRadius: '4px',
        padding: 0,
        maxWidth,
        width: 'calc(100% - 32px)',
        maxHeight,
        boxSizing: 'border-box',
        color: '#eee',
        boxShadow:
          '0 0 30px rgba(124, 58, 237, 0.15), 0 0 60px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(251, 191, 36, 0.12)',
        animation: 'gb-modal-scale-in 0.25s ease',
        ...style,
      }}
    >
      {/* Gold corner ornaments */}
      <GoldCorner position="top-left" />
      <GoldCorner position="top-right" />
      <GoldCorner position="bottom-left" />
      <GoldCorner position="bottom-right" />

      {/* Top purple glow */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '60%',
        height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(167, 139, 250, 0.3), transparent)',
        pointerEvents: 'none',
      }} />

      {children}

      {/* Bottom gold line */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 16,
        right: 16,
        height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(212, 160, 23, 0.15), transparent)',
        pointerEvents: 'none',
      }} />
    </div>
  );
}

function GoldCorner({ position }: { position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' }) {
  const isTop = position.startsWith('top');
  const isLeft = position.endsWith('left');
  const opacity = isTop ? 0.5 : 0.35;

  const posStyle: React.CSSProperties = {
    position: 'absolute',
    width: 16,
    height: 16,
    pointerEvents: 'none',
    ...(isTop ? { top: -1 } : { bottom: -1 }),
    ...(isLeft ? { left: -1 } : { right: -1 }),
  };

  const hDir = isLeft ? '90deg' : '270deg';
  const vDir = isTop ? '180deg' : '0deg';
  const hPos = isLeft ? { left: 0 } : { right: 0 };
  const vPos = isTop ? { top: 0 } : { bottom: 0 };
  const dotPos = isTop
    ? (isLeft ? { top: 3, left: 3 } : { top: 3, right: 3 })
    : (isLeft ? { bottom: 3, left: 3 } : { bottom: 3, right: 3 });

  return (
    <div style={posStyle}>
      <div style={{ position: 'absolute', ...vPos, ...hPos, width: 16, height: 2, background: `linear-gradient(${hDir}, #fbbf24, #d4a017)`, opacity, borderRadius: '1px' }} />
      <div style={{ position: 'absolute', ...vPos, ...hPos, width: 2, height: 16, background: `linear-gradient(${vDir}, #fbbf24, #d4a017)`, opacity, borderRadius: '1px' }} />
      {isTop && (
        <div style={{ position: 'absolute', ...dotPos, width: 3, height: 3, borderRadius: '50%', background: '#fbbf24', opacity: 0.4 }} />
      )}
    </div>
  );
}

/** Dungeon-themed modal header with gold diamond ornament */
export function ModalHeader({
  title,
  onClose,
  extra,
}: {
  title: string;
  onClose: () => void;
  extra?: React.ReactNode;
}) {
  const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const el = e.currentTarget;
    el.style.color = '#d4c5a0';
    el.style.borderColor = 'rgba(212, 160, 23, 0.3)';
  }, []);

  const handleMouseLeave = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const el = e.currentTarget;
    el.style.color = '#665c4a';
    el.style.borderColor = 'rgba(255, 255, 255, 0.08)';
  }, []);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 'clamp(12px, 3vw, 16px) clamp(16px, 4vw, 24px)',
      borderBottom: '1px solid rgba(212, 160, 23, 0.15)',
      background: 'linear-gradient(180deg, rgba(251, 191, 36, 0.06) 0%, transparent 100%)',
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{
          display: 'inline-block',
          width: 8,
          height: 8,
          background: 'linear-gradient(135deg, #fbbf24, #b8860b)',
          transform: 'rotate(45deg)',
          opacity: 0.6,
          flexShrink: 0,
        }} />
        <h2 style={{
          margin: 0,
          fontSize: '18px',
          fontWeight: 700,
          letterSpacing: '1px',
          color: '#d4c5a0',
          textShadow: '0 0 12px rgba(251, 191, 36, 0.2)',
        }}>{title}</h2>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {extra}
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            color: '#665c4a',
            fontSize: '16px',
            cursor: 'pointer',
            padding: '4px 8px',
            lineHeight: 1,
            borderRadius: '2px',
            transition: 'all 0.2s',
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          aria-label="Close"
        >
          &#x2715;
        </button>
      </div>
    </div>
  );
}

/** Dungeon-themed close/action button for use in modal headers */
export function ModalHeaderButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        color: '#665c4a',
        fontSize: '12px',
        cursor: 'pointer',
        padding: '4px 10px',
        lineHeight: 1,
        borderRadius: '2px',
        transition: 'all 0.2s',
        fontWeight: 600,
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.color = '#d4c5a0';
        el.style.borderColor = 'rgba(212, 160, 23, 0.3)';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.color = '#665c4a';
        el.style.borderColor = 'rgba(255, 255, 255, 0.08)';
      }}
    >
      {children}
    </button>
  );
}

// ===== Main Modal component (unchanged API) =====

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={onClose}>
      <ModalFrame>
        {title && <ModalHeader title={title} onClose={onClose} />}
        <div style={{ padding: 'clamp(16px, 4vw, 24px)' }}>
          {children}
        </div>
      </ModalFrame>
    </ModalOverlay>
  );
}
