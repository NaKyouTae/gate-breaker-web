'use client';

import { Suspense, useEffect, useRef, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { user as userApi, battle as battleApi, dungeon as dungeonApi, inventory as inventoryApi } from '@gate-breaker/api-client';
import type { User, Dungeon, InventoryItem } from '@gate-breaker/types';
import { Spinner, Modal, useToast } from '@gate-breaker/ui';
import { useAuth } from '@/context/auth-context';
import { DungeonListPanel, type OngoingBattleInfo } from '@/components/dungeon-list-panel';

interface SavedDungeonProgress {
  dungeonId: string;
  totalMonsters: number;
  currentMonsterIndex: number;
}

const RARITY_GLOW: Record<string, string> = {
  COMMON: '#94a3b8',
  RARE: '#60a5fa',
  EPIC: '#a78bfa',
  LEGENDARY: '#f59e0b',
  MYTHIC: '#f43f5e',
};

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
      await dungeonApi.enter(dungeonId);
      const dg = dungeons.find(dd => dd.id === dungeonId);
      const minLv = dg?.minLevel ?? 1;
      const maxLv = dg?.maxLevel ?? 1;
      const dgName = dg?.name ?? '';
      setDungeonModalOpen(false);
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
          <div style={{ position: 'relative', width: 86, height: 86, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                background: equippedWeapon
                  ? `radial-gradient(circle, ${RARITY_GLOW[equippedWeapon.item.rarity] || '#a78bfa'}38 0%, transparent 68%)`
                  : 'radial-gradient(circle, rgba(148,163,184,0.18) 0%, transparent 68%)',
              }}
            />
            <div style={{ position: 'relative', width: 62, height: 66, transform: 'rotate(-28deg)' }}>
              <div
                style={{
                  position: 'absolute',
                  left: 28,
                  top: 2,
                  width: 9,
                  height: 41,
                  borderRadius: '4px 4px 8px 8px',
                  background: equippedWeapon
                    ? 'linear-gradient(160deg, #f8fafc 0%, #cbd5e1 42%, #7c8ba1 100%)'
                    : 'linear-gradient(160deg, #9ca3af 0%, #6b7280 42%, #4b5563 100%)',
                  boxShadow: 'inset -2px 0 0 rgba(0,0,0,0.28)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: 37,
                  top: 4,
                  width: 3,
                  height: 40,
                  borderRadius: 2,
                  background: equippedWeapon ? 'rgba(248,250,252,0.85)' : 'rgba(209,213,219,0.6)',
                  opacity: 0.75,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: 29,
                  top: 2,
                  width: 4,
                  height: 40,
                  borderRadius: 2,
                  background: equippedWeapon ? 'rgba(148,163,184,0.55)' : 'rgba(75,85,99,0.55)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: 24,
                  top: 42,
                  width: 18,
                  height: 6,
                  borderRadius: 4,
                  background: equippedWeapon
                    ? 'linear-gradient(180deg, #d6c3ff 0%, #7c3aed 100%)'
                    : 'linear-gradient(180deg, #9ca3af 0%, #6b7280 100%)',
                  boxShadow: '0 2px 7px rgba(0,0,0,0.4)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: 29,
                  top: 48,
                  width: 8,
                  height: 13,
                  borderRadius: 4,
                  background: equippedWeapon
                    ? 'linear-gradient(180deg, #8b5cf6 0%, #6d28d9 100%)'
                    : 'linear-gradient(180deg, #6b7280 0%, #4b5563 100%)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: 28,
                  top: 0,
                  width: 8,
                  height: 43,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: 14,
                    height: 43,
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.7) 50%, transparent 100%)',
                    animation: equippedWeapon ? 'bladeShine 2.2s ease-in-out infinite' : 'none',
                  }}
                />
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            {equippedWeapon ? (
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#a78bfa', textShadow: '0 0 8px rgba(167,139,250,0.4)' }}>
                {equippedWeapon.item.name}
                {equippedWeapon.enhanceLevel > 0 && (
                  <span style={{ color: '#fbbf24', marginLeft: 4 }}>+{equippedWeapon.enhanceLevel}</span>
                )}
              </div>
            ) : (
              <div style={{ fontSize: '0.68rem', color: '#737b8f', textAlign: 'center', lineHeight: 1.45 }}>
                <div>빈 검</div>
                <div style={{ fontSize: '0.58rem', color: '#565f73', marginTop: 2 }}>탭해서 무기 장착</div>
              </div>
            )}
            {equippedWeapon?.item.imageUrl && (
              <div style={{ marginTop: 6 }}>
                <img
                  src={equippedWeapon.item.imageUrl}
                  alt={equippedWeapon.item.name}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    border: `1px solid ${(RARITY_GLOW[equippedWeapon.item.rarity] || '#a78bfa')}88`,
                    objectFit: 'cover',
                  }}
                />
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
