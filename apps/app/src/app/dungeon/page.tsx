'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { battle as battleApi, dungeon as dungeonApi, user as userApi } from '@gate-breaker/api-client';
import type { Dungeon, User } from '@gate-breaker/types';
import { Spinner, useToast } from '@gate-breaker/ui';
import { useAuth } from '@/context/auth-context';

interface OngoingBattleInfo {
  dungeonId: string;
  dungeonName: string;
  monsterName: string;
  currentMonsterNum?: number;
  totalMonsters?: number;
  isBoss?: boolean;
}

interface SavedDungeonProgress {
  dungeonId: string;
  totalMonsters: number;
  currentMonsterIndex: number;
}

function getSavedDungeonProgress(): SavedDungeonProgress | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem('dungeonProgress');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SavedDungeonProgress;
  } catch {
    return null;
  }
}

export default function DungeonListPage() {
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const { addToast } = useToast();
  const [dungeons, setDungeons] = useState<Dungeon[]>([]);
  const [me, setMe] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [enteringId, setEnteringId] = useState<string | null>(null);
  const [ongoingBattle, setOngoingBattle] = useState<OngoingBattleInfo | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;

    async function fetchData() {
      try {
        const [dungeonList, meData, battleStatus] = await Promise.all([
          dungeonApi.list(),
          userApi.me(),
          battleApi.status().catch(() => null),
        ]);
        setDungeons(dungeonList);
        setMe(meData);

        const status = battleStatus as {
          isInBattle?: boolean;
          id?: string;
          result?: string | null;
          dungeonId?: string | null;
          monster?: { name?: string };
        } | null;

        const hasActiveBattle = !!status && (
          status.isInBattle === true ||
          (!!status.id && !status.result)
        );

        if (hasActiveBattle && status?.dungeonId) {
          const matchedDungeon = dungeonList.find((d) => d.id === status.dungeonId);
          const savedProgress = getSavedDungeonProgress();
          const canUseSavedProgress =
            savedProgress &&
            savedProgress.dungeonId === status.dungeonId &&
            Number.isFinite(savedProgress.totalMonsters) &&
            Number.isFinite(savedProgress.currentMonsterIndex) &&
            savedProgress.totalMonsters > 0 &&
            savedProgress.currentMonsterIndex >= 0 &&
            savedProgress.currentMonsterIndex < savedProgress.totalMonsters;

          setOngoingBattle({
            dungeonId: status.dungeonId,
            dungeonName: matchedDungeon?.name ?? '알 수 없는 던전',
            monsterName: status.monster?.name ?? '몬스터',
            currentMonsterNum: canUseSavedProgress ? savedProgress.currentMonsterIndex + 1 : undefined,
            totalMonsters: canUseSavedProgress ? savedProgress.totalMonsters : undefined,
            isBoss: canUseSavedProgress
              ? savedProgress.currentMonsterIndex === savedProgress.totalMonsters - 1
              : undefined,
          });
        } else {
          setOngoingBattle(null);
        }
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
      const dgName = dg?.name ?? '';
      router.push(`/battle?dungeonId=${dungeonId}&minLv=${minLv}&maxLv=${maxLv}&dgName=${encodeURIComponent(dgName)}`);
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
        paddingBottom: ongoingBattle ? '156px' : '16px',
        position: 'relative',
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

      {ongoingBattle && (
        <div
          style={{
            position: 'fixed',
            left: '50%',
            transform: 'translateX(-50%)',
            bottom: 'calc(76px + env(safe-area-inset-bottom, 0px))',
            width: 'min(480px, calc(100vw - 24px))',
            background: 'linear-gradient(135deg, rgba(58, 36, 110, 0.92), rgba(17, 24, 39, 0.95))',
            border: '1px solid rgba(167, 139, 250, 0.35)',
            borderRadius: '12px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
            padding: '12px 14px',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '12px', color: '#c4b5fd', fontWeight: 700, marginBottom: '4px' }}>
              진행 중인 던전
            </div>
            <div style={{ color: '#f8fafc', fontWeight: 700, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {ongoingBattle.dungeonName}
            </div>
            <div style={{ color: '#a5b4fc', fontSize: '12px', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              현재 전투: {ongoingBattle.monsterName}
            </div>
            {typeof ongoingBattle.currentMonsterNum === 'number' && typeof ongoingBattle.totalMonsters === 'number' && (
              <div style={{ color: ongoingBattle.isBoss ? '#fca5a5' : '#c4b5fd', fontSize: '12px', marginTop: '2px', fontWeight: 700 }}>
                진척도: {ongoingBattle.currentMonsterNum}/{ongoingBattle.totalMonsters}
                {ongoingBattle.isBoss ? ' (보스)' : ''}
              </div>
            )}
          </div>
          <button
            onClick={() => {
              const params = new URLSearchParams();
              params.set('dungeonId', ongoingBattle.dungeonId);
              params.set('dgName', ongoingBattle.dungeonName);
              if (
                typeof ongoingBattle.totalMonsters === 'number' &&
                typeof ongoingBattle.currentMonsterNum === 'number'
              ) {
                params.set('resumeTotal', String(ongoingBattle.totalMonsters));
                params.set('resumeIndex', String(ongoingBattle.currentMonsterNum - 1));
              }
              router.push(`/battle?${params.toString()}`);
            }}
            style={{
              border: 'none',
              borderRadius: '10px',
              padding: '10px 14px',
              background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
              color: '#fff',
              fontWeight: 800,
              fontSize: '13px',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            재입장
          </button>
        </div>
      )}
    </div>
  );
}
