'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/auth-context';

const navItems = [
  { href: '/dashboard', label: '홈', icon: '🏠' },
  { href: '/dungeon', label: '던전', icon: '⚔️' },
  { href: '/inventory', label: '가방', icon: '🎒' },
  { href: '/shop', label: '상점', icon: '🏪' },
  { href: '/channel', label: '채널', icon: '💬' },
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
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '3px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Level badge */}
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
              }}
            >
              {user.nickname}
            </span>
          </div>
          {/* EXP progress bar */}
          <div
            style={{
              position: 'relative',
              width: '140px',
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '12px' }}>💰</span>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#fbbf24' }}>
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
          padding: '4px 0 env(safe-area-inset-bottom, 8px)',
          height: '64px',
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
                  fontSize: '22px',
                  lineHeight: 1,
                  filter: isActive ? 'drop-shadow(0 0 6px rgba(124,58,237,0.5))' : 'none',
                  animation: isActive ? 'navPulse 2s ease-in-out infinite' : 'none',
                }}
              >
                {item.icon}
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
