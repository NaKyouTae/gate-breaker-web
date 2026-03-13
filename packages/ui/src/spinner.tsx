'use client';

import React from 'react';

type SpinnerSize = 'sm' | 'md' | 'lg';

interface SpinnerProps {
  size?: SpinnerSize;
}

const sizePx: Record<SpinnerSize, number> = {
  sm: 18,
  md: 32,
  lg: 48,
};

export function Spinner({ size = 'md' }: SpinnerProps) {
  const px = sizePx[size];
  const borderWidth = size === 'sm' ? 2 : size === 'md' ? 3 : 4;

  const spinnerStyle: React.CSSProperties = {
    display: 'inline-block',
    width: `${px}px`,
    height: `${px}px`,
    border: `${borderWidth}px solid rgba(238, 238, 238, 0.12)`,
    borderTopColor: '#e94560',
    borderRadius: '50%',
    animation: 'gb-spinner-spin 0.7s linear infinite',
  };

  return (
    <>
      <span style={spinnerStyle} role="status" aria-label="Loading" />
      <style>{`@keyframes gb-spinner-spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
