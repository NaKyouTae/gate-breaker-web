'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  addToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const typeColors: Record<ToastType, string> = {
  success: '#2ecc71',
  error: '#e94560',
  info: '#0f3460',
  warning: '#f39c12',
};

const typeBgColors: Record<ToastType, string> = {
  success: 'rgba(46, 204, 113, 0.12)',
  error: 'rgba(233, 69, 96, 0.12)',
  info: 'rgba(15, 52, 96, 0.25)',
  warning: 'rgba(243, 156, 18, 0.15)',
};

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

function Toast({ item, onRemove }: { item: ToastItem; onRemove: (id: number) => void }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setExiting(true), 2700);
    const removeTimer = setTimeout(() => onRemove(item.id), 3000);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, [item.id, onRemove]);

  const color = typeColors[item.type];

  const toastStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 18px',
    background: typeBgColors[item.type],
    backdropFilter: 'blur(12px)',
    border: `1px solid ${color}50`,
    borderLeft: `3px solid ${color}`,
    borderRadius: '8px',
    color: '#eee',
    fontSize: '14px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
    opacity: exiting ? 0 : 1,
    transform: exiting ? 'translateX(30px)' : 'translateX(0)',
    transition: 'opacity 0.3s ease, transform 0.3s ease',
    animation: 'gb-toast-slide-in 0.3s ease',
  };

  return <div style={toastStyle}>{item.message}</div>;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    top: '20px',
    right: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    zIndex: 10000,
    pointerEvents: 'none',
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div style={containerStyle}>
        {toasts.map((item) => (
          <Toast key={item.id} item={item} onRemove={removeToast} />
        ))}
      </div>
      <style>{`@keyframes gb-toast-slide-in { from { opacity: 0; transform: translateX(30px); } to { opacity: 1; transform: translateX(0); } }`}</style>
    </ToastContext.Provider>
  );
}

export { Toast };
