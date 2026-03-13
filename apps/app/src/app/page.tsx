'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { GameBackground } from '@/components/game-background';

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div style={{ color: '#666', fontSize: '1.2rem' }}>로딩 중...</div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <GameBackground>
      {/* Spacer to push content below the portal */}
      <div style={{ flex: 1, minHeight: '55vh' }} />

      {/* Title & tagline */}
      <div style={{ textAlign: 'center', marginBottom: '32px', padding: '0 20px' }}>
        <h1
          style={{
            fontSize: '2.6rem',
            fontWeight: 900,
            background: 'linear-gradient(135deg, #c4b5fd, #a78bfa, #7c3aed)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '12px',
            letterSpacing: '-1px',
            filter: 'drop-shadow(0 0 20px rgba(124,58,237,0.3))',
          }}
        >
          Gate Breaker
        </h1>
        <p
          style={{
            fontSize: '1rem',
            color: '#8a7fb0',
            fontWeight: 500,
            letterSpacing: '3px',
            textTransform: 'uppercase',
          }}
        >
          문을 부수고 던전을 정복하라
        </p>
      </div>

      {/* CTA Buttons */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          width: '100%',
          maxWidth: '280px',
          padding: '0 20px',
          marginBottom: '40px',
        }}
      >
        <Link
          href="/login"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px 32px',
            background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
            color: '#fff',
            borderRadius: '12px',
            fontSize: '1rem',
            fontWeight: 700,
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 24px rgba(124, 58, 237, 0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
            border: '1px solid rgba(167,139,250,0.3)',
            letterSpacing: '1px',
          }}
        >
          게임 시작
        </Link>
        <Link
          href="/register"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '14px 32px',
            background: 'rgba(124,58,237,0.08)',
            color: '#a78bfa',
            borderRadius: '12px',
            fontSize: '0.95rem',
            fontWeight: 600,
            border: '1px solid rgba(124,58,237,0.25)',
            transition: 'all 0.2s ease',
            letterSpacing: '1px',
          }}
        >
          새 모험가 등록
        </Link>
      </div>

      {/* Footer tagline */}
      <div
        style={{
          color: '#2a2a3a',
          fontSize: '0.75rem',
          letterSpacing: '2px',
          paddingBottom: '20px',
        }}
      >
        TEXT-BASED RPG GAME
      </div>
    </GameBackground>
  );
}
