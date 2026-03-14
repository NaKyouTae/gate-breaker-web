'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/context/admin-auth-context';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { Sidebar } from './sidebar';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAdminAuth();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/');
    }
  }, [isLoading, isAuthenticated, router]);

  // 데스크톱으로 전환 시 사이드바 닫기
  useEffect(() => {
    if (!isMobile) setSidebarOpen(false);
  }, [isMobile]);

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          backgroundColor: '#0f0f1a',
        }}
      >
        <p style={{ color: '#888' }}>로딩 중...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0f0f1a' }}>
      <Sidebar
        isMobile={isMobile}
        isMobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, marginLeft: isMobile ? 0 : 240 }}>
        {/* 모바일 상단 헤더 */}
        {isMobile && (
          <header
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 50,
              height: 56,
              backgroundColor: '#12122a',
              borderBottom: '1px solid #2a2a4a',
              display: 'flex',
              alignItems: 'center',
              padding: '0 16px',
              gap: 12,
            }}
          >
            <button
              onClick={() => setSidebarOpen(true)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#eee',
                fontSize: 22,
                cursor: 'pointer',
                padding: '4px 8px',
                lineHeight: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ☰
            </button>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#6c5ce7' }}>Gate Breaker Admin</span>
          </header>
        )}

        <main
          style={{
            flex: 1,
            padding: isMobile ? '20px 16px' : 32,
            overflowY: 'auto',
            minHeight: 0,
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
