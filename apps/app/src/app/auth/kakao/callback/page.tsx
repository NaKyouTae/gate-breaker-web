'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Spinner, useToast } from '@gate-breaker/ui';

export default function KakaoCallbackPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');

    if (accessToken && refreshToken) {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      router.replace('/dashboard');
    } else {
      addToast('카카오 로그인에 실패했습니다.', 'error');
      router.replace('/login');
    }
  }, [router, addToast]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: '20px',
      }}
    >
      <Spinner size="lg" />
      <p
        style={{
          color: '#a0a0b0',
          fontSize: '1rem',
          letterSpacing: '0.5px',
        }}
      >
        카카오 로그인 처리 중...
      </p>
    </div>
  );
}
