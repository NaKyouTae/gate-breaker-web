'use client';

import React from 'react';

type BadgeVariant =
  | 'common'
  | 'rare'
  | 'epic'
  | 'legendary'
  | 'mythic'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
}

const variantColors: Record<BadgeVariant, string> = {
  common: '#888888',
  rare: '#4a9eff',
  epic: '#b048f8',
  legendary: '#ff8c00',
  mythic: '#ff2d55',
  info: '#0f3460',
  success: '#2ecc71',
  warning: '#f39c12',
  danger: '#e94560',
};

export function Badge({ children, variant = 'common' }: BadgeProps) {
  const color = variantColors[variant];

  const badgeStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '3px 10px',
    fontSize: '12px',
    fontWeight: 600,
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    color,
    background: `${color}18`,
    border: `1px solid ${color}40`,
    borderRadius: '4px',
    lineHeight: 1.5,
    whiteSpace: 'nowrap',
  };

  return <span style={badgeStyle}>{children}</span>;
}
