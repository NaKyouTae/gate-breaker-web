'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { auth } from '@gate-breaker/api-client';
import { GameBackground } from '@/components/game-background';

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  const handleKakaoLogin = () => {
    window.location.href = auth.kakaoUrl();
  };

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
    <div
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        zIndex: 1,
      }}
    >
      <GameBackground>
        <div
          style={{
            width: '100%',
            minHeight: '100%',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            padding: '0 20px 40px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '340px',
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <h1
                style={{
                  fontSize: '2rem',
                  fontWeight: 900,
                  background: 'linear-gradient(135deg, #c4b5fd, #a78bfa)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  marginBottom: '8px',
                  filter: 'drop-shadow(0 0 15px rgba(124,58,237,0.3))',
                }}
              >
                Gate Breaker
              </h1>
              <p
                style={{
                  fontSize: '0.8rem',
                  color: '#5a5580',
                  letterSpacing: '3px',
                  textTransform: 'uppercase',
                }}
              >
                게이트를 열어라
              </p>
            </div>

            <div
              style={{
                background: 'rgba(20,20,35,0.85)',
                backdropFilter: 'blur(12px)',
                borderRadius: '16px',
                padding: '28px 24px',
                border: '1px solid rgba(124,58,237,0.15)',
                boxShadow: '0 8px 40px rgba(0,0,0,0.5), 0 0 60px rgba(124,58,237,0.08)',
              }}
            >
              <button
                type="button"
                onClick={handleKakaoLogin}
                style={{
                  width: '100%',
                  padding: '16px 22px',
                  fontSize: '15px',
                  fontWeight: 700,
                  fontFamily: 'inherit',
                  background: '#FEE500',
                  color: '#000000',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 16px rgba(254,229,0,0.15)',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
                  <path
                    d="M9 1C4.58 1 1 3.8 1 7.27c0 2.23 1.46 4.18 3.68 5.3l-.94 3.46c-.08.3.26.54.52.36L8.05 13.6c.31.03.63.04.95.04 4.42 0 8-2.8 8-6.27S13.42 1 9 1z"
                    fill="#000000"
                  />
                </svg>
                카카오로 시작하기
              </button>
            </div>
          </div>
        </div>
      </GameBackground>
    </div>
  );
}
