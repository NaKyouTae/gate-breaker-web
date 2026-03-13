'use client';

import React, { useEffect, useState } from 'react';
import { admin } from '@gate-breaker/api-client';
import { Spinner } from '@gate-breaker/ui';
import { AdminLayout } from '@/components/admin-layout';
import type { DashboardStats } from '@gate-breaker/types';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    admin
      .dashboard()
      .then(setStats)
      .catch((err) => setError(err.message || '데이터를 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, []);

  const statCards = stats
    ? [
        { label: '전체 유저', value: stats.totalUsers },
        { label: '오늘 활성 유저', value: stats.activeToday ?? stats.activeUsers ?? 0 },
        { label: '오늘 전투 수', value: stats.battlesToday ?? stats.totalBattles ?? 0 },
        { label: '아이템 수', value: stats.totalItems ?? 0 },
      ]
    : [];

  return (
    <AdminLayout>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 32, color: '#eee' }}>
        대시보드
      </h1>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}>
          <Spinner />
        </div>
      )}

      {error && (
        <p style={{ color: '#e94560', textAlign: 'center', padding: 32 }}>{error}</p>
      )}

      {!loading && !error && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 24,
          }}
        >
          {statCards.map((card) => (
            <div
              key={card.label}
              style={{
                backgroundColor: '#1a1a2e',
                borderRadius: 12,
                padding: 28,
                border: '1px solid #2a2a4a',
              }}
            >
              <p style={{ fontSize: 14, color: '#888', marginBottom: 8 }}>{card.label}</p>
              <p style={{ fontSize: 36, fontWeight: 700, color: '#eee' }}>
                {card.value.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
