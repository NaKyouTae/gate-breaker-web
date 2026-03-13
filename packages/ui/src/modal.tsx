'use client';

import React, { useEffect } from 'react';

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

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    animation: 'gb-modal-fade-in 0.2s ease',
  };

  const contentStyle: React.CSSProperties = {
    background: '#1a1a2e',
    border: '1px solid rgba(238, 238, 238, 0.1)',
    borderRadius: '12px',
    padding: '24px',
    minWidth: '340px',
    maxWidth: '520px',
    width: '90%',
    maxHeight: '85vh',
    overflowY: 'auto',
    color: '#eee',
    boxShadow: '0 8px 40px rgba(0, 0, 0, 0.6)',
    animation: 'gb-modal-scale-in 0.2s ease',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '18px',
    borderBottom: '1px solid rgba(238, 238, 238, 0.08)',
    paddingBottom: '14px',
  };

  const titleStyle: React.CSSProperties = {
    margin: 0,
    fontSize: '20px',
    fontWeight: 700,
    letterSpacing: '0.3px',
  };

  const closeBtnStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: '#888',
    fontSize: '22px',
    cursor: 'pointer',
    padding: '4px 8px',
    lineHeight: 1,
    borderRadius: '4px',
    transition: 'color 0.15s',
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={contentStyle} onClick={(e) => e.stopPropagation()}>
        {title && (
          <div style={headerStyle}>
            <h2 style={titleStyle}>{title}</h2>
            <button
              style={closeBtnStyle}
              onClick={onClose}
              onMouseEnter={(e) => { (e.target as HTMLElement).style.color = '#eee'; }}
              onMouseLeave={(e) => { (e.target as HTMLElement).style.color = '#888'; }}
              aria-label="Close"
            >
              &#x2715;
            </button>
          </div>
        )}
        {children}
      </div>
      <style>{`
        @keyframes gb-modal-fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes gb-modal-scale-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
}
