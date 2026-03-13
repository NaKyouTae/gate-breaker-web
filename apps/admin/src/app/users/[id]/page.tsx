'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { admin } from '@gate-breaker/api-client';
import { Spinner, useToast } from '@gate-breaker/ui';
import { AdminLayout } from '@/components/admin-layout';
import type { UserDetail } from '@gate-breaker/types';

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { addToast } = useToast();
  const id = params.id as string;

  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [banning, setBanning] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    admin.users
      .get(id)
      .then(setUser)
      .catch((err) => setError(err.message || '유저 정보를 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleBanToggle = async () => {
    if (!user) return;
    setBanning(true);
    try {
      const result = await admin.users.ban(user.id);
      addToast(result.message, 'success');
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : '처리에 실패했습니다.', 'error');
    } finally {
      setBanning(false);
    }
  };

  const statItems = user
    ? [
        { label: '레벨', value: user.level },
        { label: '경험치', value: user.exp.toLocaleString() },
        { label: '골드', value: user.gold.toLocaleString() },
        { label: 'HP', value: `${user.hp} / ${user.maxHp}` },
        { label: 'MP', value: `${user.mp} / ${user.maxMp}` },
        { label: '공격력', value: user.attack },
        { label: '방어력', value: user.defense },
        { label: '치명타율', value: `${(user.criticalRate * 100).toFixed(1)}%` },
        { label: '역할', value: user.role },
        { label: '가입일', value: new Date(user.createdAt).toLocaleDateString('ko-KR') },
      ]
    : [];

  return (
    <AdminLayout>
      <div style={{ marginBottom: 24 }}>
        <button
          onClick={() => router.push('/users')}
          style={{
            backgroundColor: 'transparent',
            border: '1px solid #2a2a4a',
            borderRadius: 6,
            padding: '8px 16px',
            color: '#aaa',
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          &larr; 유저 목록으로
        </button>
      </div>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}>
          <Spinner />
        </div>
      )}

      {error && (
        <p style={{ color: '#e94560', textAlign: 'center', padding: 32 }}>{error}</p>
      )}

      {!loading && !error && user && (
        <>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 32,
            }}
          >
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: '#eee' }}>{user.nickname}</h1>
              <p style={{ fontSize: 14, color: '#888', marginTop: 4 }}>{user.email}</p>
              <p style={{ fontSize: 12, color: '#555', marginTop: 2, fontFamily: 'monospace' }}>
                {user.id}
              </p>
            </div>
            <button
              onClick={handleBanToggle}
              disabled={banning}
              style={{
                backgroundColor: '#e94560',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                padding: '10px 24px',
                fontSize: 14,
                fontWeight: 600,
                cursor: banning ? 'not-allowed' : 'pointer',
                opacity: banning ? 0.6 : 1,
              }}
            >
              {banning ? '처리 중...' : '밴 토글'}
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 16,
            }}
          >
            {statItems.map((item) => (
              <div
                key={item.label}
                style={{
                  backgroundColor: '#1a1a2e',
                  borderRadius: 10,
                  padding: 20,
                  border: '1px solid #2a2a4a',
                }}
              >
                <p style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>{item.label}</p>
                <p style={{ fontSize: 20, fontWeight: 600, color: '#eee' }}>{item.value}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </AdminLayout>
  );
}
