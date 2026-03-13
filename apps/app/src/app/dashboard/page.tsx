'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { user as userApi } from '@gate-breaker/api-client';
import type { User, UserStats } from '@gate-breaker/types';
import { Card, Button, Spinner, Badge } from '@gate-breaker/ui';
import { useAuth } from '@/context/auth-context';

function StatBar({
  label,
  current,
  max,
  color,
}: {
  label: string;
  current: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? Math.min((current / max) * 100, 100) : 0;
  return (
    <div style={{ marginBottom: '12px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '4px',
          fontSize: '12px',
        }}
      >
        <span style={{ color: '#aaa' }}>{label}</span>
        <span style={{ color: '#eee', fontWeight: 600 }}>
          {current} / {max}
        </span>
      </div>
      <div
        style={{
          width: '100%',
          height: '10px',
          background: 'rgba(255,255,255,0.06)',
          borderRadius: '5px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: color,
            borderRadius: '5px',
            transition: 'width 0.5s ease',
          }}
        />
      </div>
    </div>
  );
}

function StatItem({ label, value, icon, color }: { label: string; value: string | number; icon?: string; color?: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 0',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        fontSize: '13px',
      }}
    >
      <span style={{ color: '#888' }}>
        {icon && <span style={{ marginRight: '6px' }}>{icon}</span>}
        {label}
      </span>
      <span style={{ color: color || '#eee', fontWeight: 700 }}>{value}</span>
    </div>
  );
}

function QuickActionButton({ icon, label, onClick, variant = 'default' }: {
  icon: string;
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'default';
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        padding: '16px 8px',
        background: variant === 'primary'
          ? 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(109,40,217,0.1))'
          : 'rgba(255,255,255,0.03)',
        border: variant === 'primary'
          ? '1px solid rgba(124,58,237,0.3)'
          : '1px solid rgba(255,255,255,0.06)',
        borderRadius: '12px',
        transition: 'all 0.2s ease',
        width: '100%',
      }}
    >
      <span style={{ fontSize: '24px' }}>{icon}</span>
      <span style={{
        fontSize: '12px',
        fontWeight: 600,
        color: variant === 'primary' ? '#c4b5fd' : '#aaa',
      }}>
        {label}
      </span>
    </button>
  );
}

export default function DashboardPage() {
  const { user: authUser, isLoading: authLoading, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const [me, setMe] = useState<User | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;

    async function fetchData() {
      try {
        const [meData, statsData] = await Promise.all([
          userApi.me(),
          userApi.stats(),
        ]);
        setMe(meData);
        setStats(statsData);
      } catch {
        // handled by api client (redirect on 401)
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [isAuthenticated]);

  if (authLoading || loading || !me || !stats) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
        }}
      >
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: '480px',
        margin: '0 auto',
        padding: '16px',
      }}
    >
      {/* Character Header */}
      <div
        style={{
          textAlign: 'center',
          marginBottom: '20px',
          padding: '20px 16px',
          background: 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(15,52,96,0.08))',
          borderRadius: '16px',
          border: '1px solid rgba(124,58,237,0.12)',
        }}
      >
        {/* Avatar placeholder */}
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
            margin: '0 auto 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
            boxShadow: '0 0 20px rgba(124,58,237,0.3)',
          }}
        >
          ⚔️
        </div>
        <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#eee' }}>
          {me.nickname}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '6px' }}>
          <Badge variant="epic">Lv.{me.level}</Badge>
          <span style={{ color: '#555', fontSize: '12px' }}>
            EXP {me.exp.toLocaleString()}
          </span>
        </div>
      </div>

      {/* HP / MP Bars */}
      <Card style={{ marginBottom: '12px' }}>
        <StatBar label="HP" current={me.hp} max={me.maxHp} color="#e94560" />
        <StatBar label="MP" current={me.mp} max={me.maxMp} color="#3b82f6" />
      </Card>

      {/* Quick Actions Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '8px',
          marginBottom: '12px',
        }}
      >
        <QuickActionButton icon="⚔️" label="던전" onClick={() => router.push('/dungeon')} variant="primary" />
        <QuickActionButton icon="🎒" label="인벤토리" onClick={() => router.push('/inventory')} />
        <QuickActionButton icon="🏪" label="상점" onClick={() => router.push('/shop')} />
      </div>

      {/* Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px',
          marginBottom: '12px',
        }}
      >
        <Card title="전투 능력치">
          <StatItem label="공격력" value={stats.total.attack} icon="⚔️" color="#e94560" />
          <StatItem label="방어력" value={stats.total.defense} icon="🛡️" color="#533483" />
          <StatItem
            label="치명타"
            value={`${(stats.total.criticalRate * 100).toFixed(1)}%`}
            icon="💥"
            color="#fbbf24"
          />
          {(stats.bonuses.attack > 0 || stats.bonuses.defense > 0) && (
            <div style={{ marginTop: '8px', fontSize: '11px', color: '#2ecc71' }}>
              장비: 공 +{stats.bonuses.attack} 방 +{stats.bonuses.defense}
            </div>
          )}
        </Card>

        <Card title="자원">
          <StatItem
            label="골드"
            value={`${me.gold.toLocaleString()}`}
            icon="💰"
            color="#fbbf24"
          />
          <StatItem
            label="경험치"
            value={me.exp.toLocaleString()}
            icon="✨"
            color="#2ecc71"
          />
          <StatItem label="레벨" value={me.level} icon="📊" color="#a78bfa" />
        </Card>
      </div>

      {/* Logout */}
      <button
        onClick={logout}
        style={{
          width: '100%',
          padding: '12px',
          fontSize: '13px',
          fontWeight: 600,
          color: '#666',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '10px',
          marginBottom: '80px',
          transition: 'all 0.2s ease',
        }}
      >
        로그아웃
      </button>
    </div>
  );
}
