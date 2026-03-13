'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { dungeon as dungeonApi, user as userApi } from '@gate-breaker/api-client';
import type { Dungeon, User } from '@gate-breaker/types';
import { Spinner, useToast } from '@gate-breaker/ui';
import { useAuth } from '@/context/auth-context';

export default function DungeonListPage() {
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const { addToast } = useToast();
  const [dungeons, setDungeons] = useState<Dungeon[]>([]);
  const [me, setMe] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [enteringId, setEnteringId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;

    async function fetchData() {
      try {
        const [dungeonList, meData] = await Promise.all([
          dungeonApi.list(),
          userApi.me(),
        ]);
        setDungeons(dungeonList);
        setMe(meData);
      } catch {
        // handled by api client
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [isAuthenticated]);

  const handleEnter = async (dungeonId: string) => {
    setEnteringId(dungeonId);
    try {
      await dungeonApi.enter(dungeonId);
      const dg = dungeons.find(dd => dd.id === dungeonId);
      const minLv = dg?.minLevel ?? 1;
      const maxLv = dg?.maxLevel ?? 1;
      router.push(`/battle?dungeonId=${dungeonId}&minLv=${minLv}&maxLv=${maxLv}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '던전 입장에 실패했습니다.';
      addToast(message, 'error');
    } finally {
      setEnteringId(null);
    }
  };

  if (authLoading || loading || !me) {
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
      {/* Dungeon List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {dungeons.map((d) => {
          const canEnter = me.level >= d.minLevel && me.level <= d.maxLevel;
          const isEntering = enteringId === d.id;

          return (
            <div
              key={d.id}
              role={canEnter ? 'button' : undefined}
              tabIndex={canEnter ? 0 : -1}
              onClick={() => {
                if (!canEnter || enteringId !== null) return;
                void handleEnter(d.id);
              }}
              onKeyDown={(e) => {
                if (!canEnter || enteringId !== null) return;
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  void handleEnter(d.id);
                }
              }}
              style={{
                background: canEnter
                  ? 'linear-gradient(135deg, rgba(124,58,237,0.09), rgba(26,26,46,0.9))'
                  : 'rgba(18,22,38,0.92)',
                border: canEnter
                  ? '1px solid rgba(124,58,237,0.28)'
                  : '1px solid rgba(148,163,184,0.22)',
                borderRadius: '12px',
                padding: '14px',
                cursor: canEnter ? 'pointer' : 'not-allowed',
                boxShadow: canEnter ? '0 8px 24px rgba(124,58,237,0.12)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div>
                  <h3
                    style={{
                      margin: '0 0 4px',
                      fontSize: '1rem',
                      fontWeight: 700,
                      color: canEnter ? '#f8fafc' : '#cbd5e1',
                    }}
                  >
                    {d.name}
                  </h3>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '5px 10px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 800,
                      letterSpacing: '0.2px',
                      color: '#c7d2fe',
                      background: 'rgba(79, 70, 229, 0.22)',
                      border: '1px solid rgba(129, 140, 248, 0.45)',
                      textShadow: '0 0 10px rgba(199, 210, 254, 0.18)',
                    }}
                  >
                    입장 레벨 Lv.{d.minLevel} ~ {d.maxLevel}
                  </span>
                </div>
                {canEnter ? (
                  <span style={{ fontSize: '12px', color: isEntering ? '#f8fafc' : '#a78bfa', fontWeight: 700 }}>
                    {isEntering ? '입장 중...' : '입장 가능'}
                  </span>
                ) : (
                  <span style={{ fontSize: '12px', color: '#fca5a5', fontWeight: 700 }}>
                    레벨 부족
                  </span>
                )}
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '16px',
                  fontSize: '12px',
                }}
              >
                <span style={{ color: canEnter ? '#94a3b8' : '#a3b0c3' }}>
                  💰 <span style={{ color: '#fbbf24', fontWeight: 700 }}>
                    {d.rewardGoldMin.toLocaleString()}~{d.rewardGoldMax.toLocaleString()}
                  </span>
                </span>
                <span style={{ color: canEnter ? '#94a3b8' : '#a3b0c3' }}>
                  ✨ <span style={{ color: '#4ade80', fontWeight: 700 }}>
                    {d.rewardExp.toLocaleString()} EXP
                  </span>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {dungeons.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: '#666',
            fontSize: '14px',
          }}
        >
          등록된 던전이 없습니다.
        </div>
      )}
    </div>
  );
}
