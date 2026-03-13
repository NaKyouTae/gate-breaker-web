'use client';

import React, { useState, type ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'style'> {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: 'linear-gradient(135deg, #e94560, #c23152)',
    color: '#eee',
    border: '1px solid #e94560',
  },
  secondary: {
    background: 'linear-gradient(135deg, #533483, #3d2566)',
    color: '#eee',
    border: '1px solid #533483',
  },
  danger: {
    background: 'linear-gradient(135deg, #ff2d55, #cc1a3a)',
    color: '#eee',
    border: '1px solid #ff2d55',
  },
  ghost: {
    background: 'transparent',
    color: '#eee',
    border: '1px solid rgba(238, 238, 238, 0.2)',
  },
};

const variantHoverStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: 'linear-gradient(135deg, #ff5a7a, #e94560)',
    boxShadow: '0 0 20px rgba(233, 69, 96, 0.4)',
  },
  secondary: {
    background: 'linear-gradient(135deg, #6b44a8, #533483)',
    boxShadow: '0 0 20px rgba(83, 52, 131, 0.4)',
  },
  danger: {
    background: 'linear-gradient(135deg, #ff4d6f, #ff2d55)',
    boxShadow: '0 0 20px rgba(255, 45, 85, 0.4)',
  },
  ghost: {
    background: 'rgba(238, 238, 238, 0.08)',
    borderColor: 'rgba(238, 238, 238, 0.4)',
  },
};

const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
  sm: { padding: '6px 14px', fontSize: '13px' },
  md: { padding: '10px 22px', fontSize: '15px' },
  lg: { padding: '14px 32px', fontSize: '17px' },
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  className,
  style,
  ...rest
}: ButtonProps) {
  const [hovered, setHovered] = useState(false);

  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    borderRadius: '6px',
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s ease',
    opacity: disabled ? 0.5 : 1,
    letterSpacing: '0.3px',
    ...sizeStyles[size],
    ...variantStyles[variant],
    ...(hovered && !disabled && !loading ? variantHoverStyles[variant] : {}),
    ...style,
  };

  return (
    <button
      className={className}
      style={baseStyle}
      disabled={disabled || loading}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      {...rest}
    >
      {loading && (
        <span
          style={{
            display: 'inline-block',
            width: '14px',
            height: '14px',
            border: '2px solid rgba(238, 238, 238, 0.3)',
            borderTopColor: '#eee',
            borderRadius: '50%',
            animation: 'gb-btn-spin 0.6s linear infinite',
          }}
        />
      )}
      {children}
      <style>{`@keyframes gb-btn-spin { to { transform: rotate(360deg); } }`}</style>
    </button>
  );
}
