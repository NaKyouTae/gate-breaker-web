'use client';

import React, { useState } from 'react';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export function Card({ children, title, className, style, onClick }: CardProps) {
  const [hovered, setHovered] = useState(false);

  const cardStyle: React.CSSProperties = {
    background: '#1a1a2e',
    border: '1px solid rgba(238, 238, 238, 0.08)',
    borderRadius: '10px',
    padding: '20px',
    color: '#eee',
    transition: 'all 0.2s ease',
    cursor: onClick ? 'pointer' : 'default',
    boxShadow: hovered && onClick
      ? '0 4px 24px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(83, 52, 131, 0.3)'
      : '0 2px 12px rgba(0, 0, 0, 0.3)',
    transform: hovered && onClick ? 'translateY(-2px)' : 'none',
    ...style,
  };

  const titleStyle: React.CSSProperties = {
    margin: '0 0 14px 0',
    fontSize: '18px',
    fontWeight: 700,
    color: '#eee',
    letterSpacing: '0.3px',
    borderBottom: '1px solid rgba(238, 238, 238, 0.08)',
    paddingBottom: '12px',
  };

  return (
    <div
      className={className}
      style={cardStyle}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {title && <h3 style={titleStyle}>{title}</h3>}
      {children}
    </div>
  );
}
