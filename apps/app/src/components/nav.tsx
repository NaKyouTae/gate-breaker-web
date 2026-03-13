'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/auth-context';

function NavIcon({ type, active }: { type: string; active?: boolean }) {
  const color = active ? '#c4b5fd' : '#666';
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
  { href: '/dashboard', label: '프로필', iconType: 'home' },
  { href: '/dungeon', label: '던전', iconType: 'dungeon' },
  { href: '/inventory', label: '인벤토리', iconType: 'inventory' },
  { href: '/shop', label: '상점', iconType: 'shop' },
  { href: '/channel', label: '채널', iconType: 'channel' },
  { href: '/codex', label: '도감', iconType: 'codex' },
];

function MiniBar({ current, max, color }: { current: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((current / max) * 100, 100) : 0;
  return (
    <div
      style={{
        width: '100%',
        height: '6px',
        background: 'rgba(255,255,255,0.08)',
        borderRadius: '3px',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${pct}%`,
          height: '100%',
          background: color,
          borderRadius: '3px',
          transition: 'width 0.5s ease',
        }}
      />
    </div>
  );
}

function getRequiredExp(level: number): number {
  return Math.floor(100 * Math.pow(level, 1.5));
}

export function TopHud() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return null;
  }

  const requiredExp = getRequiredExp(user.level);
  const expPct = requiredExp > 0 ? Math.min((user.exp / requiredExp) * 100, 100) : 0;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: 'linear-gradient(180deg, rgba(10,10,15,0.97) 0%, rgba(10,10,15,0.92) 100%)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(124,58,237,0.2)',
        padding: '0 16px',
        height: '58px',
        boxSizing: 'border-box',
      }}
    >
      {/* Top row: nickname + gold + logout */}
      <div
        style={{
          display: 'flex',
          height: '100%',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '999px',
              overflow: 'hidden',
              border: '1px solid rgba(167,139,250,0.55)',
              background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {user.profileImageUrl ? (
              <img
                src={user.profileImageUrl}
                alt={user.nickname}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <span style={{ fontSize: '12px' }}>⚔️</span>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '4px', minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              <div
                style={{
                  background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                  borderRadius: '6px',
                  padding: '2px 8px',
                  fontSize: '11px',
                  fontWeight: 800,
                  color: '#fff',
                  letterSpacing: '0.5px',
                  boxShadow: '0 0 8px rgba(124,58,237,0.4)',
                  flexShrink: 0,
                }}
              >
                Lv.{user.level}
              </div>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#e0d4f7',
                  textShadow: '0 0 10px rgba(167,139,250,0.3)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {user.nickname}
              </span>
              <div
                style={{
                  position: 'relative',
                  width: '80px',
                  height: '14px',
                  background: 'rgba(255,255,255,0.08)',
                  borderRadius: '7px',
                  overflow: 'hidden',
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: `${user.maxHp > 0 ? Math.min((user.hp / user.maxHp) * 100, 100) : 0}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #dc2626, #ef4444)',
                    borderRadius: '7px',
                    transition: 'width 0.5s ease',
                    boxShadow: '0 0 4px rgba(220,38,38,0.5)',
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
                    fontWeight: 700,
                    color: '#fff',
                    textShadow: '0 0 2px rgba(0,0,0,0.8)',
                    lineHeight: 1,
                  }}
                >
                  {user.hp} / {user.maxHp}
                </span>
              </div>
            </div>
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: '12px',
                background: 'rgba(255,255,255,0.08)',
                borderRadius: '6px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${expPct}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #22c55e, #4ade80)',
                  borderRadius: '6px',
                  transition: 'width 0.5s ease',
                  boxShadow: '0 0 4px rgba(34,197,94,0.5)',
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
                  fontWeight: 700,
                  color: '#fff',
                  textShadow: '0 0 2px rgba(0,0,0,0.8)',
                  lineHeight: 1,
                }}
              >
                {user.exp.toLocaleString()} / {requiredExp.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginLeft: '10px', flexShrink: 0 }}>
          <span style={{ fontSize: '13px' }}>💰</span>
          <span style={{ fontSize: '14px', fontWeight: 800, color: '#fbbf24' }}>
            {user.gold.toLocaleString()}
          </span>
        </div>
      </div>

    </div>
  );
}

export function BottomNav() {
  const { isAuthenticated } = useAuth();
  const pathname = usePathname();

  if (!isAuthenticated) {
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
          background: 'linear-gradient(0deg, rgba(10,10,15,0.98) 0%, rgba(10,10,15,0.95) 100%)',
          backdropFilter: 'blur(10px)',
          borderTop: '1px solid rgba(124,58,237,0.15)',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          padding: '8px 0 calc(8px + env(safe-area-inset-bottom, 0px))',
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
              {/* Active indicator dot */}
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
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: isActive ? 700 : 400,
                  color: isActive ? '#c4b5fd' : '#555',
                  letterSpacing: '0.5px',
                  transition: 'color 0.2s ease',
                }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

// Keep backward compatibility - default export for layout
export function Nav() {
  return (
    <>
      <TopHud />
      <BottomNav />
    </>
  );
}
