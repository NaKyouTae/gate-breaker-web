'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { user as userApi } from '@gate-breaker/api-client';
import type { User, UserStats } from '@gate-breaker/types';
import { Card, Spinner, Badge } from '@gate-breaker/ui';
import { useAuth } from '@/context/auth-context';

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

export default function DashboardPage() {
  const { isLoading: authLoading, isAuthenticated, refreshUser, logout } = useAuth();
  const router = useRouter();
  const [me, setMe] = useState<User | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const updated = await userApi.uploadProfileImage(file);
      setMe(updated);
      await refreshUser();
    } catch {
      // upload failed silently
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

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
        {/* Avatar - clickable to upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <div
          onClick={handleAvatarClick}
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: me.profileImageUrl ? 'none' : 'linear-gradient(135deg, #7c3aed, #6d28d9)',
            margin: '0 auto 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
            boxShadow: '0 0 20px rgba(124,58,237,0.3)',
            cursor: 'pointer',
            position: 'relative',
            border: '2px solid rgba(167,139,250,0.55)',
          }}
        >
          {me.profileImageUrl ? (
            <img
              src={me.profileImageUrl}
              alt={me.nickname}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: '50%',
              }}
            />
          ) : (
            uploading ? <Spinner size="sm" /> : '⚔️'
          )}
          {/* Desktop hover overlay */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0,
              transition: 'opacity 0.2s ease',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0'; }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </div>
          {/* Always-visible indicator for mobile/touch users */}
          <div
            style={{
              position: 'absolute',
              right: '-6px',
              bottom: '-6px',
              width: '24px',
              height: '24px',
              borderRadius: '999px',
              background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
              border: '2px solid #0b0b13',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 3px 10px rgba(124,58,237,0.45)',
              zIndex: 2,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </div>
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

      {/* Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px',
          marginBottom: '0',
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
        </Card>
      </div>

      <div style={{ marginTop: '12px', textAlign: 'center' }}>
        <button
          onClick={logout}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            color: '#8b8fa8',
            fontSize: '13px',
            textDecoration: 'underline',
            cursor: 'pointer',
          }}
        >
          로그아웃
        </button>
      </div>
    </div>
  );
}
