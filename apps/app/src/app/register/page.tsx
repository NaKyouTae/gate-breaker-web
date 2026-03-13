'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Input, useToast } from '@gate-breaker/ui';
import { useAuth } from '@/context/auth-context';
import { GameBackground } from '@/components/game-background';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const { addToast } = useToast();

  const [loginId, setLoginId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!loginId.trim()) {
      newErrors.loginId = '아이디를 입력해주세요.';
    } else if (loginId.trim().length < 4) {
      newErrors.loginId = '아이디는 4자 이상이어야 합니다.';
    }

    if (!email.trim()) {
      newErrors.email = '이메일을 입력해주세요.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = '올바른 이메일 형식이 아닙니다.';
    }

    if (!password) {
      newErrors.password = '비밀번호를 입력해주세요.';
    } else if (password.length < 6) {
      newErrors.password = '비밀번호는 6자 이상이어야 합니다.';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = '비밀번호 확인을 입력해주세요.';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = '비밀번호가 일치하지 않습니다.';
    }

    if (!nickname.trim()) {
      newErrors.nickname = '닉네임을 입력해주세요.';
    } else if (nickname.trim().length < 2) {
      newErrors.nickname = '닉네임은 2자 이상이어야 합니다.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);
    try {
      await register({
        loginId: loginId.trim(),
        email: email.trim(),
        password,
        nickname: nickname.trim(),
      });
      addToast('회원가입이 완료되었습니다!', 'success');
      router.push('/dashboard');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '회원가입에 실패했습니다.';
      addToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GameBackground>
      {/* Spacer */}
      <div style={{ flex: 1, minHeight: '35vh' }} />

      <div
        style={{
          width: '100%',
          maxWidth: '360px',
          padding: '0 20px',
          marginBottom: '30px',
        }}
      >
        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h1
            style={{
              fontSize: '1.6rem',
              fontWeight: 900,
              background: 'linear-gradient(135deg, #c4b5fd, #a78bfa)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '6px',
              filter: 'drop-shadow(0 0 15px rgba(124,58,237,0.3))',
            }}
          >
            새로운 모험가
          </h1>
          <p style={{ fontSize: '0.75rem', color: '#5a5580', letterSpacing: '2px' }}>
            게이트 너머의 세계가 기다리고 있다
          </p>
        </div>

        {/* Glass card */}
        <div
          style={{
            background: 'rgba(20,20,35,0.88)',
            backdropFilter: 'blur(12px)',
            borderRadius: '16px',
            padding: '24px 20px',
            border: '1px solid rgba(124,58,237,0.15)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.5), 0 0 60px rgba(124,58,237,0.08)',
          }}
        >
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <Input
              label="아이디"
              placeholder="4자 이상"
              value={loginId}
              onChange={(e) => {
                setLoginId(e.target.value);
                if (errors.loginId) setErrors((prev) => ({ ...prev, loginId: '' }));
              }}
              error={errors.loginId}
              autoComplete="username"
            />
            <Input
              label="이메일"
              type="email"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
              }}
              error={errors.email}
              autoComplete="email"
            />
            <Input
              label="비밀번호"
              type="password"
              placeholder="6자 이상"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
              }}
              error={errors.password}
              autoComplete="new-password"
            />
            <Input
              label="비밀번호 확인"
              type="password"
              placeholder="비밀번호 재입력"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: '' }));
              }}
              error={errors.confirmPassword}
              autoComplete="new-password"
            />
            <Input
              label="닉네임"
              placeholder="게임에서 사용할 이름"
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value);
                if (errors.nickname) setErrors((prev) => ({ ...prev, nickname: '' }));
              }}
              error={errors.nickname}
            />
            <Button
              type="submit"
              size="lg"
              loading={loading}
              style={{ width: '100%', marginTop: '4px', borderRadius: '12px' }}
            >
              모험 시작
            </Button>
          </form>

          {/* Login link */}
          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <Link
              href="/login"
              style={{
                color: '#666',
                fontSize: '13px',
                transition: 'color 0.2s ease',
              }}
            >
              이미 계정이 있으신가요? <span style={{ fontWeight: 600, color: '#a78bfa' }}>로그인</span>
            </Link>
          </div>
        </div>
      </div>
    </GameBackground>
  );
}
