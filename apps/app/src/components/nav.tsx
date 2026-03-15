'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAnyModalOpen } from '@gate-breaker/ui';
import { useAuth } from '@/context/auth-context';
import { useCodexModal } from '@/context/codex-modal-context';

function NavIcon({ type, active }: { type: string; active?: boolean }) {
  const color = active ? '#c4b5fd' : '#9090a0';
  const size = 24;
  const props = { width: size, height: size, viewBox: '-1 -1 26 26', fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  switch (type) {
    case 'home':
      // Castle turret
      return (
        <svg {...props}>
          <rect x="3" y="12" width="4" height="10" fill={active ? 'rgba(124,58,237,0.3)' : 'none'} />
          <rect x="10" y="8" width="4" height="14" fill={active ? 'rgba(124,58,237,0.3)' : 'none'} />
          <rect x="17" y="12" width="4" height="10" fill={active ? 'rgba(124,58,237,0.3)' : 'none'} />
          <line x1="3" y1="12" x2="7" y2="12" />
          <line x1="10" y1="8" x2="14" y2="8" />
          <line x1="17" y1="12" x2="21" y2="12" />
          <line x1="5" y1="12" x2="5" y2="9" />
          <line x1="12" y1="8" x2="12" y2="5" />
          <line x1="19" y1="12" x2="19" y2="9" />
          <polygon points="4,9 5,7 6,9" fill={color} stroke="none" />
          <polygon points="11,5 12,3 13,5" fill={color} stroke="none" />
          <polygon points="18,9 19,7 20,9" fill={color} stroke="none" />
          <line x1="3" y1="22" x2="21" y2="22" />
        </svg>
      );
    case 'dungeon':
      // Crossed swords
      return (
        <svg {...props}>
          <line x1="4" y1="4" x2="20" y2="20" />
          <line x1="4" y1="4" x2="8" y2="4" />
          <line x1="4" y1="4" x2="4" y2="8" />
          <line x1="20" y1="4" x2="4" y2="20" />
          <line x1="20" y1="4" x2="16" y2="4" />
          <line x1="20" y1="4" x2="20" y2="8" />
          <circle cx="12" cy="12" r="2" fill={active ? 'rgba(124,58,237,0.4)' : 'none'} />
        </svg>
      );
    case 'inventory':
      // Treasure chest
      return (
        <svg {...props}>
          <rect x="3" y="11" width="18" height="10" rx="1" fill={active ? 'rgba(124,58,237,0.3)' : 'none'} />
          <path d="M3 14 H21" />
          <path d="M5 11 V7 a7 7 0 0 1 14 0 V11" />
          <circle cx="12" cy="17" r="1.5" fill={color} stroke="none" />
          <line x1="12" y1="14" x2="12" y2="15.5" />
        </svg>
      );
    case 'shop':
      // Potion bottle
      return (
        <svg {...props}>
          <path d="M9 3 H15 V6 L18 12 V20 a1 1 0 0 1-1 1 H7 a1 1 0 0 1-1-1 V12 L9 6 Z" fill={active ? 'rgba(124,58,237,0.3)' : 'none'} />
          <line x1="9" y1="3" x2="15" y2="3" />
          <path d="M6 14 H18" />
          <circle cx="10" cy="17" r="1" fill={color} stroke="none" />
          <circle cx="14" cy="16" r="0.7" fill={color} stroke="none" />
          <circle cx="12" cy="19" r="0.7" fill={color} stroke="none" />
        </svg>
      );
    case 'channel':
      // Speech scroll
      return (
        <svg {...props}>
          <path d="M21 5 a2 2 0 0 0-2-2 H5 a2 2 0 0 0-2 2 V15 a2 2 0 0 0 2 2 H7 V21 L12 17 H19 a2 2 0 0 0 2-2 Z" fill={active ? 'rgba(124,58,237,0.3)' : 'none'} />
          <line x1="8" y1="7" x2="16" y2="7" />
          <line x1="8" y1="10" x2="14" y2="10" />
          <line x1="8" y1="13" x2="11" y2="13" />
        </svg>
      );
    case 'codex':
      // Open book
      return (
        <svg {...props}>
          <path d="M2 4 C2 4 5 2 12 4 C19 2 22 4 22 4 V18 C22 18 19 16 12 18 C5 16 2 18 2 18 Z" fill={active ? 'rgba(124,58,237,0.3)' : 'none'} />
          <line x1="12" y1="4" x2="12" y2="18" />
          <line x1="6" y1="8" x2="10" y2="9" />
          <line x1="6" y1="11" x2="10" y2="12" />
          <line x1="14" y1="9" x2="18" y2="8" />
          <line x1="14" y1="12" x2="18" y2="11" />
        </svg>
      );
    default:
      return null;
  }
}

const navItems = [
  { href: '/shop', label: '상점', iconType: 'shop' },
  { href: '/dashboard', label: '게이트', iconType: 'home' },
  { href: '/inventory', label: '인벤토리', iconType: 'inventory' },
  { href: '/channel', label: '채널', iconType: 'channel' },
];


export function TopHud() {
  const { user, isAuthenticated } = useAuth();
  const pathname = usePathname();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profileOpen) return;
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [profileOpen]);

  if (!isAuthenticated || !user || pathname.startsWith('/battle')) {
    return null;
  }

  // EXP progress: server stores exp as within-level value (reset on level up)
  const requiredExpForLevel = Math.floor(100 * Math.pow(user.level, 1.5));
  const currentExpInLevel = Math.max(0, user.exp);
  const expPercent = requiredExpForLevel > 0 ? Math.min(100, Math.round((currentExpInLevel / requiredExpForLevel) * 100)) : 0;

  return (
    <div
      style={{
        position: 'fixed',
        top: 'max(8px, env(safe-area-inset-top, 8px))',
        left: '8px',
        right: '8px',
        zIndex: 100,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        pointerEvents: 'none',
      }}
    >
      {/* Left: Profile card */}
      <div ref={profileRef} style={{ position: 'relative', pointerEvents: 'auto' }}>
        <div
          role="button"
          tabIndex={0}
          onClick={() => setProfileOpen((v) => !v)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setProfileOpen((v) => !v); } }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(10,10,15,0.92)',
            borderRadius: '12px',
            padding: '6px 10px 6px 6px',
            border: '1px solid rgba(124,58,237,0.2)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.5)',
            cursor: 'pointer',
          }}
        >
          {/* Avatar with level badge */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                overflow: 'hidden',
                border: '2px solid rgba(167,139,250,0.5)',
                background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {user.profileImageUrl ? (
                <img
                  src={user.profileImageUrl}
                  alt={user.nickname}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span style={{ fontSize: '14px' }}>⚔️</span>
              )}
            </div>
            {/* Level badge - bottom center */}
            <div
              style={{
                position: 'absolute',
                bottom: '-6px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                borderRadius: '8px',
                padding: '1px 6px',
                fontSize: '10px',
                fontWeight: 800,
                color: '#fff',
                border: '1px solid rgba(10,10,15,0.8)',
                whiteSpace: 'nowrap',
                lineHeight: '14px',
              }}
            >
              {user.level}
            </div>
          </div>

          {/* Nickname + HP info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 }}>
            {/* Nickname row with HP text */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#e0d4f7',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '80px',
                  lineHeight: '14px',
                }}
              >
                {user.nickname}
              </span>
              {/* Heart icon + HP text */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="#ef4444" stroke="none">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#f87171', lineHeight: '12px', whiteSpace: 'nowrap' }}>
                  {user.hp}/{user.maxHp}
                </span>
              </div>
            </div>
            {/* EXP bar */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: '10px',
                borderRadius: '5px',
                background: 'rgba(255,255,255,0.1)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${expPercent}%`,
                  height: '100%',
                  borderRadius: '5px',
                  background: 'linear-gradient(90deg, #2d8a56, #3da06a)',
                  transition: 'width 0.3s ease',
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '8px',
                  fontWeight: 800,
                  color: '#fff',
                  textShadow: '0 1px 2px rgba(0,0,0,0.9)',
                  lineHeight: 1,
                }}
              >
                {currentExpInLevel.toLocaleString()} / {requiredExpForLevel.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Profile popup modal */}
        {profileOpen && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: 0,
              width: '220px',
              background: 'rgba(10,10,15,0.96)',
              border: '1px solid rgba(124,58,237,0.3)',
              borderRadius: '14px',
              padding: '16px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
              zIndex: 110,
            }}
          >
            {/* Header: avatar + name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  border: '2px solid rgba(167,139,250,0.5)',
                  background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {user.profileImageUrl ? (
                  <img src={user.profileImageUrl} alt={user.nickname} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: '18px' }}>⚔️</span>
                )}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.nickname}
                </div>
                <div style={{ fontSize: '12px', color: '#a78bfa', fontWeight: 700 }}>
                  Lv.{user.level}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* HP */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#ef4444" stroke="none">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>HP</span>
                </div>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#f87171' }}>
                  {user.hp} / {user.maxHp}
                </span>
              </div>

              <div style={{ height: '1px', background: 'rgba(124,58,237,0.15)', margin: '2px 0' }} />

              {/* ATK */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>⚔️ 공격력</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#fbbf24' }}>{user.attack}</span>
              </div>

              {/* DEF */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>🛡️ 방어력</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#60a5fa' }}>{user.defense}</span>
              </div>

              <div style={{ height: '1px', background: 'rgba(124,58,237,0.15)', margin: '2px 0' }} />

              {/* EXP */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>✨ 경험치</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#4ade80' }}>{currentExpInLevel.toLocaleString()} / {requiredExpForLevel.toLocaleString()}</span>
              </div>

              {/* Gold */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>💰 골드</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#fbbf24' }}>{user.gold.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right: Gold */}
      <div
        style={{
          pointerEvents: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          background: 'rgba(10,10,15,0.92)',
          borderRadius: '12px',
          padding: '8px 12px',
          border: '1px solid rgba(251,191,36,0.2)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.5)',
        }}
      >
        <span style={{ fontSize: '14px', lineHeight: 1 }}>💰</span>
        <span
          style={{
            fontSize: '13px',
            fontWeight: 800,
            color: '#fbbf24',
            letterSpacing: '0.3px',
          }}
        >
          {user.gold.toLocaleString()}
        </span>
      </div>
    </div>
  );
}

export function BottomNav() {
  const { isAuthenticated } = useAuth();
  const pathname = usePathname();

  if (!isAuthenticated || pathname.startsWith('/battle')) {
    return null;
  }

  return (
    <>
      <style>{`
        @keyframes navPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
        @keyframes navGlow {
          0%, 100% { box-shadow: 0 0 4px rgba(124,58,237,0.3); }
          50% { box-shadow: 0 0 12px rgba(124,58,237,0.6); }
        }
      `}</style>
      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background: 'linear-gradient(0deg, rgba(16,16,28,0.99) 0%, rgba(20,18,35,0.97) 100%)',
          backdropFilter: 'blur(12px)',
          borderTop: '1px solid rgba(124,58,237,0.3)',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.5), 0 -1px 8px rgba(124,58,237,0.1)',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          padding: '10px 0 calc(10px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 1,
                gap: '2px',
                padding: '4px 0',
                textDecoration: 'none',
                position: 'relative',
                transition: 'all 0.2s ease',
              }}
            >
              {isActive && (
                <div
                  style={{
                    position: 'absolute',
                    top: '-4px',
                    width: '20px',
                    height: '3px',
                    borderRadius: '2px',
                    background: 'linear-gradient(90deg, #7c3aed, #a78bfa)',
                    boxShadow: '0 0 8px rgba(124,58,237,0.5)',
                  }}
                />
              )}
              <div
                style={{
                  lineHeight: 0,
                  filter: isActive ? 'drop-shadow(0 0 6px rgba(124,58,237,0.5))' : 'none',
                  animation: isActive ? 'navPulse 2s ease-in-out infinite' : 'none',
                }}
              >
                <NavIcon type={item.iconType} active={isActive} />
              </div>
              <span style={{ fontSize: '10px', fontWeight: isActive ? 700 : 500, color: isActive ? '#c4b5fd' : '#8888a0', letterSpacing: '0.5px' }}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

export function FloatingCodex() {
  const { isAuthenticated } = useAuth();
  const { open } = useCodexModal();
  const pathname = usePathname();
  const anyModalOpen = useAnyModalOpen();

  const showOn = ['/dashboard'];
  if (!isAuthenticated || !showOn.includes(pathname) || anyModalOpen) {
    return null;
  }

  const size = 48;

  return (
    <>
      <style>{`
        @keyframes codex-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes codex-rune-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes codex-pulse {
          0%, 100% { box-shadow: 0 0 8px rgba(212,160,23,0.3), 0 4px 12px rgba(0,0,0,0.5), inset 0 0 6px rgba(251,191,36,0.1); }
          50% { box-shadow: 0 0 18px rgba(212,160,23,0.5), 0 4px 16px rgba(0,0,0,0.6), inset 0 0 10px rgba(251,191,36,0.15); }
        }
      `}</style>
      <button
        onClick={open}
        style={{
          position: 'fixed',
          top: '72px',
          right: '12px',
          zIndex: 99,
          width: size,
          height: size,
          borderRadius: '4px',
          background: 'linear-gradient(180deg, #1e1830 0%, #13101e 100%)',
          border: '1.5px solid rgba(212, 160, 23, 0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 8px rgba(212,160,23,0.3), 0 4px 12px rgba(0,0,0,0.5), inset 0 0 6px rgba(251,191,36,0.1)',
          cursor: 'pointer',
          padding: 0,
          animation: 'codex-float 4s ease-in-out infinite',
          overflow: 'visible',
        }}
      >
        {/* Gold corner dots */}
        <div style={{ position: 'absolute', top: 1, left: 1, width: 3, height: 3, background: '#fbbf24', opacity: 0.4, borderRadius: '50%', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 1, right: 1, width: 3, height: 3, background: '#fbbf24', opacity: 0.4, borderRadius: '50%', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: 1, left: 1, width: 3, height: 3, background: '#fbbf24', opacity: 0.3, borderRadius: '50%', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: 1, right: 1, width: 3, height: 3, background: '#fbbf24', opacity: 0.3, borderRadius: '50%', pointerEvents: 'none' }} />
        {/* Icon */}
        <div style={{ filter: 'drop-shadow(0 0 4px rgba(251,191,36,0.3))' }}>
          <NavIcon type="codex" active />
        </div>
        {/* Top glow line */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: '20%',
          right: '20%',
          height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(167,139,250,0.4), transparent)',
          pointerEvents: 'none',
        }} />
      </button>
    </>
  );
}

// Keep backward compatibility - default export for layout
export function Nav() {
  return (
    <>
      <TopHud />
      <FloatingCodex />
      <BottomNav />
    </>
  );
}
