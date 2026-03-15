'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { battle as battleApi, dungeon as dungeonApi, user as userApi } from '@gate-breaker/api-client';
import type { Dungeon, User } from '@gate-breaker/types';
import { Spinner, useToast } from '@gate-breaker/ui';
import { useAuth } from '@/context/auth-context';
import { DungeonListPanel, type OngoingBattleInfo } from '@/components/dungeon-list-panel';

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

        // If battle ended (DEFEAT/ESCAPE), auto-confirm to clean up server session
        if (status?.result && status.result !== 'VICTORY') {
          try { await battleApi.confirm(); } catch { /* ignore */ }
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('dungeonProgress');
          }
        }

        const hasActiveBattle = !!status && !status.result && (
          status.isInBattle === true ||
          !!status.id
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
      await dungeonApi.enter(dungeonId, 0);
      const dg = dungeons.find(dd => dd.id === dungeonId);
      const dgName = dg?.name ?? '';
      router.push(`/battle?dungeonId=${dungeonId}&dgName=${encodeURIComponent(dgName)}`);
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
      <DungeonListPanel
        dungeons={dungeons}
        userLevel={me.level}
        enteringId={enteringId}
        onEnterDungeon={(id) => void handleEnter(id)}
      />

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
