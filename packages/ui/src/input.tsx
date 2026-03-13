'use client';

import React, { useState, type InputHTMLAttributes } from 'react';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'style' | 'size'> {
  label?: string;
  error?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function Input({
  label,
  error,
  className,
  style,
  disabled,
  ...rest
}: InputProps) {
  const [focused, setFocused] = useState(false);

  const wrapperStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    width: '100%',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '13px',
    fontWeight: 500,
    color: error ? '#e94560' : '#aaa',
    letterSpacing: '0.5px',
    textTransform: 'uppercase' as const,
  };

  const inputStyle: React.CSSProperties = {
    padding: '10px 14px',
    fontSize: '15px',
    fontFamily: 'inherit',
    color: '#eee',
    background: '#0a0a0f',
    border: `1px solid ${error ? '#e94560' : focused ? '#533483' : 'rgba(238, 238, 238, 0.15)'}`,
    borderRadius: '6px',
    outline: 'none',
    transition: 'all 0.2s ease',
    opacity: disabled ? 0.5 : 1,
    cursor: disabled ? 'not-allowed' : 'text',
    boxShadow: focused && !error ? '0 0 12px rgba(83, 52, 131, 0.25)' : error ? '0 0 12px rgba(233, 69, 96, 0.15)' : 'none',
    ...style,
  };

  const errorStyle: React.CSSProperties = {
    fontSize: '12px',
    color: '#e94560',
    margin: 0,
  };

  return (
    <div className={className} style={wrapperStyle}>
      {label && <label style={labelStyle}>{label}</label>}
      <input
        style={inputStyle}
        disabled={disabled}
        onFocus={(e) => {
          setFocused(true);
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          rest.onBlur?.(e);
        }}
        {...rest}
      />
      {error && <p style={errorStyle}>{error}</p>}
    </div>
  );
}
