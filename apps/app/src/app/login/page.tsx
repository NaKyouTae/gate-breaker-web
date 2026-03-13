'use client';

import Link from 'next/link';
import { auth } from '@gate-breaker/api-client';
import { GameBackground } from '@/components/game-background';

export default function LoginPage() {
  const handleKakaoLogin = () => {
    window.location.href = auth.kakaoUrl();
  };

  return (
    <GameBackground>
      {/* Spacer to push content below portal */}
      <div style={{ flex: 1, minHeight: '48vh' }} />

      {/* Login Card */}
      <div
        style={{
          width: '100%',
          maxWidth: '340px',
          padding: '0 20px',
          marginBottom: '40px',
        }}
      >
        {/* Title */}
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

        {/* Glass card */}
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
          {/* Kakao Login */}
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

          {/* Divider */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              margin: '20px 0',
            }}
          >
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
            <span style={{ fontSize: '11px', color: '#444', letterSpacing: '1px' }}>OR</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
          </div>

          {/* Register Link */}
          <Link
            href="/register"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              padding: '14px',
              fontSize: '14px',
              fontWeight: 600,
              color: '#a78bfa',
              background: 'rgba(124,58,237,0.06)',
              border: '1px solid rgba(124,58,237,0.15)',
              borderRadius: '12px',
              transition: 'all 0.2s ease',
              letterSpacing: '0.5px',
            }}
          >
            새 모험가 등록
          </Link>
        </div>
      </div>
    </GameBackground>
  );
}
