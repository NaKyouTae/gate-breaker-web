'use client';

import type { CSSProperties } from 'react';

type AdminActionIconButtonProps = {
  kind: 'edit' | 'delete';
  onClick: () => void;
  disabled?: boolean;
};

const baseStyle: CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 8,
  border: '1px solid #333',
  backgroundColor: '#1f1f34',
  color: '#ddd',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  padding: 0,
};

export function AdminActionIconButton({ kind, onClick, disabled = false }: AdminActionIconButtonProps) {
  const isDelete = kind === 'delete';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={isDelete ? '삭제' : '수정'}
      title={isDelete ? '삭제' : '수정'}
      style={{
        ...baseStyle,
        border: isDelete ? '1px solid #5a2a33' : baseStyle.border,
        backgroundColor: isDelete ? '#3a1f28' : baseStyle.backgroundColor,
        color: isDelete ? '#ff8b9d' : baseStyle.color,
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {isDelete ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18" />
          <path d="M8 6V4h8v2" />
          <path d="M19 6l-1 14H6L5 6" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
        </svg>
      )}
    </button>
  );
}
