'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAdminAuth } from '@/context/admin-auth-context';

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: '대시보드', icon: '📊' },
  { href: '/users', label: '유저 관리', icon: '👤' },
  { href: '/dungeons', label: '던전 관리', icon: '🏰' },
  { href: '/monsters', label: '몬스터 관리', icon: '👹' },
  { href: '/items', label: '아이템 관리', icon: '⚔️' },
  { href: '/shop', label: '상점 관리', icon: '🏪' },
  { href: '/drop-tables', label: '드롭 테이블', icon: '🎲' },
  { href: '/logs', label: '전투 로그', icon: '📜' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { adminUser, logout } = useAdminAuth();

  return (
    <aside
      style={{
        width: 240,
        height: '100vh',
        backgroundColor: '#12122a',
        borderRight: '1px solid #2a2a4a',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        left: 0,
        top: 0,
        zIndex: 100,
      }}
    >
      <div
        style={{
          padding: '24px 20px',
          borderBottom: '1px solid #2a2a4a',
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#6c5ce7' }}>Gate Breaker</h2>
        <p style={{ fontSize: 12, color: '#888', marginTop: 4 }}>관리자 패널</p>
      </div>

      <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
        {navItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 20px',
                fontSize: 14,
                color: isActive ? '#fff' : '#aaa',
                backgroundColor: isActive ? '#6c5ce720' : 'transparent',
                borderLeft: isActive ? '3px solid #6c5ce7' : '3px solid transparent',
                transition: 'all 0.2s',
                textDecoration: 'none',
              }}
            >
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div
        style={{
          padding: '16px 20px',
          borderTop: '1px solid #2a2a4a',
        }}
      >
        {adminUser && (
          <p style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>
            {adminUser.nickname || adminUser.loginId}
          </p>
        )}
        <button
          onClick={logout}
          style={{
            width: '100%',
            padding: '8px 12px',
            backgroundColor: 'transparent',
            border: '1px solid #2a2a4a',
            borderRadius: 6,
            color: '#aaa',
            fontSize: 13,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          로그아웃
        </button>
      </div>
    </aside>
  );
}
