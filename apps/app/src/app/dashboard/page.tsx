'use client';

import { Suspense, useEffect, useRef, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { user as userApi, battle as battleApi, dungeon as dungeonApi, inventory as inventoryApi } from '@gate-breaker/api-client';
import type { User, Dungeon, InventoryItem } from '@gate-breaker/types';
import { Spinner, Modal, useToast } from '@gate-breaker/ui';
import { useAuth } from '@/context/auth-context';
import { DungeonListPanel, type OngoingBattleInfo } from '@/components/dungeon-list-panel';
import { getEnhanceColor } from '@/lib/enhance-color';

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

function DashboardContent() {
  const { isLoading: authLoading, isAuthenticated, refreshUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  const [me, setMe] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dungeon modal state
  const [dungeonModalOpen, setDungeonModalOpen] = useState(false);
  const [dungeons, setDungeons] = useState<Dungeon[]>([]);
  const [dungeonsLoading, setDungeonsLoading] = useState(false);
  const [enteringId, setEnteringId] = useState<string | null>(null);
  const [ongoingBattle, setOngoingBattle] = useState<OngoingBattleInfo | null>(null);
  const openedFromQueryRef = useRef(false);
  const [equippedWeapon, setEquippedWeapon] = useState<InventoryItem | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;

    async function fetchData() {
      try {
        const meData = await userApi.me();
        setMe(meData);
      } catch {
        // handled by api client (redirect on 401)
      } finally {
        setLoading(false);
      }
    }

    async function fetchEquippedWeapon() {
      try {
        const items = await inventoryApi.list();
        const weapon = items.find((i: InventoryItem) => i.item.type === 'WEAPON' && i.isEquipped);
        setEquippedWeapon(weapon || null);
      } catch { /* ignore */ }
    }

    fetchData();
    fetchEquippedWeapon();
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

  const fetchDungeons = useCallback(async () => {
    setDungeonsLoading(true);
    try {
      const [dungeonList, battleStatus] = await Promise.all([
        dungeonApi.list(),
        battleApi.status().catch(() => null),
      ]);
      setDungeons(dungeonList);

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
      addToast('던전 목록을 불러오는데 실패했습니다.', 'error');
    } finally {
      setDungeonsLoading(false);
    }
  }, [addToast]);

  const handleOpenDungeonModal = () => {
    setDungeonModalOpen(true);
    fetchDungeons();
  };

  useEffect(() => {
    if (!isAuthenticated || loading || openedFromQueryRef.current) return;
    if (searchParams.get('openDungeonModal') !== '1') return;
    openedFromQueryRef.current = true;
    setDungeonModalOpen(true);
    fetchDungeons();
    router.replace('/dashboard');
  }, [fetchDungeons, isAuthenticated, loading, router, searchParams]);

  const handleEnterDungeon = async (dungeonId: string) => {
    setEnteringId(dungeonId);
    try {
      await dungeonApi.enter(dungeonId, 0);
      const dg = dungeons.find(dd => dd.id === dungeonId);
      const dgName = dg?.name ?? '';
      setDungeonModalOpen(false);
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
        minHeight: 'calc(100dvh - 120px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Floating Sword Display */}
      <style>{`
        @keyframes swordLevitate {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes swordGlow {
          0%, 100% { filter: drop-shadow(0 0 8px rgba(148,163,184,0.25)); }
          50% { filter: drop-shadow(0 0 18px rgba(167,139,250,0.55)); }
        }
        @keyframes bladeShine {
          0% { transform: translateX(-12px) skewX(-15deg); opacity: 0; }
          35% { opacity: 0.45; }
          60% { transform: translateX(26px) skewX(-15deg); opacity: 0; }
          100% { transform: translateX(26px) skewX(-15deg); opacity: 0; }
        }
      `}</style>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '8px 0',
          gap: '16px',
        }}
      >
        <div
          onClick={() => {
            if (!equippedWeapon) router.push('/inventory?tab=weapon');
          }}
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            animation: 'swordLevitate 3s ease-in-out infinite, swordGlow 3s ease-in-out infinite',
            cursor: equippedWeapon ? 'default' : 'pointer',
          }}
        >
          <div style={{ position: 'relative', width: 240, height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: -40 }}>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                background: equippedWeapon
                  ? `radial-gradient(circle, ${getEnhanceColor(equippedWeapon.enhanceLevel).glow} 0%, transparent 68%)`
                  : 'radial-gradient(circle, rgba(148,163,184,0.18) 0%, transparent 68%)',
              }}
            />
            {equippedWeapon?.item.imageUrl ? (
              <img
                src={equippedWeapon.item.imageUrl}
                alt={equippedWeapon.item.name}
                style={{
                  width: 220,
                  height: 220,
                  objectFit: 'contain',
                  borderRadius: 16,
                  filter: 'drop-shadow(0 0 16px rgba(167,139,250,0.5))',
                }}
              />
            ) : (
              <div style={{ fontSize: 80, filter: 'drop-shadow(0 0 8px rgba(148,163,184,0.3))' }}>⚔️</div>
            )}
          </div>
          <div style={{ textAlign: 'center' }}>
            {equippedWeapon ? (
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#a78bfa', textShadow: '0 0 8px rgba(167,139,250,0.4)' }}>
                <span style={{ color: '#fbbf24', marginRight: 6 }}>+{equippedWeapon.enhanceLevel}</span>
                {equippedWeapon.item.name}
              </div>
            ) : (
              <div style={{ fontSize: '0.68rem', color: '#737b8f', textAlign: 'center', lineHeight: 1.45 }}>
                <div>빈 검</div>
                <div style={{ fontSize: '0.58rem', color: '#565f73', marginTop: 2 }}>탭해서 무기 장착</div>
              </div>
            )}
            {!equippedWeapon && (
              <div style={{ marginTop: 4, fontSize: '0.52rem', color: '#4b5563' }}>
                전투 전 장착 권장
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleOpenDungeonModal}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            width: '120px',
            height: '48px',
            background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
            border: '2px solid rgba(167,139,250,0.55)',
            borderRadius: '12px',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(124,58,237,0.4)',
            padding: '0 10px',
          }}
        >
          <svg width="24" height="24" viewBox="-1 -1 26 26" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="4" x2="20" y2="20" />
            <line x1="4" y1="4" x2="8" y2="4" />
            <line x1="4" y1="4" x2="4" y2="8" />
            <line x1="20" y1="4" x2="4" y2="20" />
            <line x1="20" y1="4" x2="16" y2="4" />
            <line x1="20" y1="4" x2="20" y2="8" />
          </svg>
          <span style={{ fontSize: '15px', fontWeight: 800, color: '#fff', lineHeight: 1 }}>
            던전
          </span>
        </button>
      </div>

      {/* Dungeon Modal */}
      <Modal isOpen={dungeonModalOpen} onClose={() => setDungeonModalOpen(false)} title="던전">
        <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {dungeonsLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
              <Spinner size="lg" />
            </div>
          ) : (
            <DungeonListPanel
              dungeons={dungeons}
              userLevel={me.level}
              enteringId={enteringId}
              ongoingBattle={ongoingBattle}
              onEnterDungeon={(id) => void handleEnterDungeon(id)}
              onResumeBattle={() => {
                if (!ongoingBattle) return;
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
                setDungeonModalOpen(false);
                router.push(`/battle?${params.toString()}`);
              }}
            />
          )}
        </div>
      </Modal>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Spinner size="lg" />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
