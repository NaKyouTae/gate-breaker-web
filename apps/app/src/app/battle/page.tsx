'use client';

import { Suspense, useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { battle as battleApi, dungeon as dungeonApi, inventory as inventoryApi } from '@gate-breaker/api-client';
import type { BattleSession, InventoryItem } from '@gate-breaker/types';
import { Button, Spinner, Modal, useToast } from '@gate-breaker/ui';
import { useAuth } from '@/context/auth-context';

/* ─── HP Bar ─── */
function HpBar({
  current,
  max,
  height = 8,
  showNumbers = false,
}: {
  current: number;
  max: number;
  height?: number;
  showNumbers?: boolean;
}) {
  const pct = max > 0 ? Math.min(Math.max((current / max) * 100, 0), 100) : 0;
  let barColor = '#2ecc71';
  if (pct <= 25) barColor = '#e94560';
  else if (pct <= 50) barColor = '#f39c12';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span
          style={{
            fontSize: '10px',
            fontWeight: 800,
            color: '#fbbf24',
            background: 'linear-gradient(180deg, #fbbf24, #f59e0b)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '1px',
          }}
        >
          HP
        </span>
        <div
          style={{
            flex: 1,
            height: `${height}px`,
            background: 'rgba(255,255,255,0.06)',
            borderRadius: '4px',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: '100%',
              background: barColor,
              borderRadius: '3px',
              transition: 'width 0.6s ease, background-color 0.4s ease',
              boxShadow: `0 0 6px ${barColor}44`,
            }}
          />
        </div>
      </div>
      {showNumbers && (
        <div style={{ textAlign: 'right', fontSize: '13px', fontWeight: 700, color: '#eee', marginTop: '1px', fontFamily: 'monospace' }}>
          {Math.max(0, current)}<span style={{ color: '#888', margin: '0 3px' }}>/</span>{max}
        </div>
      )}
    </div>
  );
}

/* ─── Dungeon progress state ─── */
interface DungeonProgress {
  dungeonId: string;
  dungeonName: string;
  totalMonsters: number;
  currentMonsterIndex: number;
  defeatedMonsters: string[];
  isBossNext: boolean;
  monsterLevels: number[];
}

const DUNGEON_MENU_ROUTE = '/dashboard';

function getDungeonProgress(): DungeonProgress | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem('dungeonProgress');
  return raw ? JSON.parse(raw) : null;
}

function saveDungeonProgress(progress: DungeonProgress) {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('dungeonProgress', JSON.stringify(progress));
  }
}

function clearDungeonProgress() {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('dungeonProgress');
  }
}

function BattleContent() {
  const { isLoading: authLoading, isAuthenticated, user: authUser, refreshUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  const [session, setSession] = useState<BattleSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [showDefeatModal, setShowDefeatModal] = useState(false);
  const [dungeonProgress, setDungeonProgress] = useState<DungeonProgress | null>(null);
  const [showDungeonClear, setShowDungeonClear] = useState(false);
  const [totalRewards, setTotalRewards] = useState<{ exp: number; gold: number; items: { name: string; rarity: string }[] }>({ exp: 0, gold: 0, items: [] });
  const logEndRef = useRef<HTMLDivElement>(null);
  const [attackShake, setAttackShake] = useState(false);
  const [playerAttackAnim, setPlayerAttackAnim] = useState(false);
  const [monsterAnim, setMonsterAnim] = useState<'idle' | 'exiting' | 'entering'>('idle');
  const [transitioning, setTransitioning] = useState(false);
  const [showVictoryBanner, setShowVictoryBanner] = useState(false);
  const [monsterHitFlash, setMonsterHitFlash] = useState(false);
  const [damageNumber, setDamageNumber] = useState<number | null>(null);
  const [monsterAttacking, setMonsterAttacking] = useState(false);
  const [playerHitFlash, setPlayerHitFlash] = useState(false);
  const [playerDamageNumber, setPlayerDamageNumber] = useState<number | null>(null);
  const [showEscapeScreen, setShowEscapeScreen] = useState(false);
  const [showBagModal, setShowBagModal] = useState(false);
  const [bagItems, setBagItems] = useState<InventoryItem[]>([]);
  const [bagLoading, setBagLoading] = useState(false);
  const [usingItem, setUsingItem] = useState(false);
  const [autoAttack, setAutoAttack] = useState(false);
  const autoAttackRef = useRef(false);
  autoAttackRef.current = autoAttack;
  const [speedUp, setSpeedUp] = useState(false);
  const speedUpRef = useRef(false);
  speedUpRef.current = speedUp;
  const actingRef = useRef(false);
  actingRef.current = acting;
  const transitioningRef = useRef(false);
  // Use refs to access latest state in async functions without re-creating callbacks
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const dungeonProgressRef = useRef(dungeonProgress);
  dungeonProgressRef.current = dungeonProgress;

  const delay = useCallback((ms: number) => {
    const actual = speedUpRef.current ? ms / 2 : ms;
    return new Promise(r => setTimeout(r, actual));
  }, []);

  const tryRecoverSession = useCallback(async () => {
    const progress = getDungeonProgress();
    if (!progress) return false;
    try {
      await dungeonApi.enter(progress.dungeonId);
      const newSession = await battleApi.status();
      setSession(newSession);
      addToast('전투가 재개되었습니다.', 'info');
      return true;
    } catch {
      return false;
    }
  }, [addToast]);

  // Initialize dungeon progress on first enter
  useEffect(() => {
    const dungeonId = searchParams.get('dungeonId');
    const existing = getDungeonProgress();
    const resumeTotalRaw = Number(searchParams.get('resumeTotal'));
    const resumeIndexRaw = Number(searchParams.get('resumeIndex'));
    const hasResumeProgress =
      Number.isFinite(resumeTotalRaw) &&
      Number.isFinite(resumeIndexRaw) &&
      resumeTotalRaw > 0 &&
      resumeIndexRaw >= 0 &&
      resumeIndexRaw < resumeTotalRaw;

    if (dungeonId && (!existing || existing.dungeonId !== dungeonId)) {
      const minLv = Number(searchParams.get('minLv')) || 1;
      const maxLv = Number(searchParams.get('maxLv')) || minLv;
      const dgName = searchParams.get('dgName') || '';
      const monsterCount = Math.floor(Math.random() * 3) + 3;
      const total = hasResumeProgress ? resumeTotalRaw : monsterCount + 1;
      const currentMonsterIndex = hasResumeProgress ? resumeIndexRaw : 0;
      const regularLevels = Array.from({ length: total - 1 }, () =>
        minLv + Math.floor(Math.random() * (maxLv - minLv + 1)),
      ).sort((a, b) => a - b);
      const bossLevel = Math.max(...regularLevels, maxLv) + Math.floor(Math.random() * 2) + 1;
      const monsterLevels = [...regularLevels, bossLevel];
      const progress: DungeonProgress = {
        dungeonId,
        dungeonName: dgName,
        totalMonsters: total,
        currentMonsterIndex,
        defeatedMonsters: Array.from({ length: currentMonsterIndex }, (_, i) => `defeated-${i + 1}`),
        isBossNext: currentMonsterIndex === total - 2,
        monsterLevels,
      };
      saveDungeonProgress(progress);
      setDungeonProgress(progress);
    } else if (existing) {
      if (
        dungeonId &&
        existing.dungeonId === dungeonId &&
        hasResumeProgress &&
        (existing.currentMonsterIndex !== resumeIndexRaw || existing.totalMonsters !== resumeTotalRaw)
      ) {
        const synced: DungeonProgress = {
          ...existing,
          dungeonName: searchParams.get('dgName') || existing.dungeonName || '',
          currentMonsterIndex: resumeIndexRaw,
          totalMonsters: resumeTotalRaw,
          defeatedMonsters: Array.from({ length: resumeIndexRaw }, (_, i) => `defeated-${i + 1}`),
          isBossNext: resumeIndexRaw === resumeTotalRaw - 2,
        };
        saveDungeonProgress(synced);
        setDungeonProgress(synced);
      } else {
        setDungeonProgress(existing);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.replace('/login');
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    async function fetchStatus() {
      try {
        const data = await battleApi.status();
        setSession(data);
        // Only show defeat modal for non-victory results
        if (data.result && data.result !== 'VICTORY') setShowDefeatModal(true);
      } catch {
        addToast('진행 중인 전투가 없습니다.', 'warning');
        clearDungeonProgress();
        router.replace(DUNGEON_MENU_ROUTE);
      } finally {
        setLoading(false);
      }
    }
    fetchStatus();
  }, [isAuthenticated, router, addToast]);

  // Periodic health check
  useEffect(() => {
    if (!isAuthenticated || !session || session.result) return;
    const interval = setInterval(async () => {
      try {
        const data = await battleApi.status();
        setSession(data);
        if (data.result && data.result !== 'VICTORY') setShowDefeatModal(true);
      } catch {
        const recovered = await tryRecoverSession();
        if (!recovered) {
          addToast('전투 세션이 만료되었습니다.', 'warning');
          clearDungeonProgress();
          router.replace(DUNGEON_MENU_ROUTE);
        }
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, session, tryRecoverSession, addToast, router]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.log]);

  // Stable function that reads from refs - no dependency on session/dungeonProgress
  const processVictoryTransition = useCallback(async () => {
    const currentSession = sessionRef.current;
    const currentProgress = dungeonProgressRef.current;
    if (!currentSession || !currentProgress || transitioningRef.current) return;
    if (currentSession.result !== 'VICTORY') return;

    transitioningRef.current = true;
    setTransitioning(true);

    // Accumulate rewards
    if (currentSession.rewards) {
      setTotalRewards(prev => ({
        exp: prev.exp + currentSession.rewards!.exp,
        gold: prev.gold + currentSession.rewards!.gold,
        items: [...prev.items, ...(currentSession.rewards!.items?.map(i => ({ name: i.name, rarity: i.rarity })) || [])],
      }));
    }

    const nextIndex = currentProgress.currentMonsterIndex + 1;
    const isLastMonster = nextIndex >= currentProgress.totalMonsters;

    // Show victory banner
    setShowVictoryBanner(true);
    await delay(800);
    setShowVictoryBanner(false);

    // Monster death animation (for ALL monsters including last)
    setMonsterAnim('exiting');
    await delay(700);

    if (isLastMonster) {
      try { await battleApi.confirm(); } catch { /* ignore */ }
      clearDungeonProgress();
      setTransitioning(false);
      transitioningRef.current = false;
      setShowDungeonClear(true);
      return;
    }

    // Update progress
    const isBossNext = nextIndex === currentProgress.totalMonsters - 1;
    const updatedProgress: DungeonProgress = {
      ...currentProgress,
      currentMonsterIndex: nextIndex,
      defeatedMonsters: [...currentProgress.defeatedMonsters, currentSession.monster.name],
      isBossNext,
    };
    saveDungeonProgress(updatedProgress);
    setDungeonProgress(updatedProgress);

    // Confirm and enter next battle
    try {
      await battleApi.confirm();
      // Small pause before entering next battle
      await delay(300);
      await dungeonApi.enter(currentProgress.dungeonId);
      const newSession = await battleApi.status();
      setSession(newSession);
      // Monster enter animation
      setMonsterAnim('entering');
      await delay(600);
      setMonsterAnim('idle');
    } catch (err) {
      console.error('Failed to transition to next monster:', err);
      addToast('다음 몬스터 조우에 실패했습니다.', 'error');
      clearDungeonProgress();
      router.push(DUNGEON_MENU_ROUTE);
    } finally {
      setTransitioning(false);
      transitioningRef.current = false;
    }
  }, [router, addToast]);

  // Watch for victory and auto-trigger transition
  useEffect(() => {
    if (!session?.result || session.result !== 'VICTORY') return;
    if (transitioningRef.current) return;
    if (!dungeonProgressRef.current) return;

    const timer = setTimeout(() => {
      processVictoryTransition();
    }, speedUpRef.current ? 400 : 800);
    return () => clearTimeout(timer);
    // Only depend on session.result changing - processVictoryTransition is stable
  }, [session?.result, processVictoryTransition]);

  const handleAttack = useCallback(async () => {
    if (acting || !session || session.result || transitioningRef.current) return;
    setActing(true);

    const prevEnemyHp = session.enemyHp;
    const prevPlayerHp = session.playerHp;

    // Phase 1: Player attack animation
    setPlayerAttackAnim(true);
    setTimeout(() => setPlayerAttackAnim(false), 300);

    try {
      await battleApi.attack();
      const updated = await battleApi.status();

      const enemyDmg = prevEnemyHp - updated.enemyHp;
      const playerDmg = prevPlayerHp - updated.playerHp;

      // Hide only the last enemy_attack (current round's counter-attack), keep previous ones
      const allLogs = updated.log;
      const lastEnemyIdx = allLogs.findLastIndex(
        (e) => e.type === 'enemy_attack' || (e.type === 'critical' && e.message?.includes('이(가)')),
      );
      const playerLogs = lastEnemyIdx >= 0
        ? [...allLogs.slice(0, lastEnemyIdx), ...allLogs.slice(lastEnemyIdx + 1)]
        : [...allLogs];

      // Show monster taking damage first (with player-only logs)
      if (enemyDmg > 0) {
        setSession(prev => prev ? { ...updated, playerHp: prevPlayerHp, log: playerLogs } : updated);
        setAttackShake(true);
        setMonsterHitFlash(true);
        setDamageNumber(enemyDmg);
        await delay(600);
        setAttackShake(false);
        setMonsterHitFlash(false);
        setDamageNumber(null);
      } else {
        setSession(prev => prev ? { ...updated, playerHp: prevPlayerHp, log: playerLogs } : updated);
      }

      // If battle ended with victory, set final state and done
      if (updated.result === 'VICTORY') {
        setSession(updated);
        setActing(false);
        return;
      }

      // Phase 2: Monster counter-attack after delay
      if (playerDmg > 0) {
        await delay(900);
        setMonsterAttacking(true);
        await delay(300);
        setMonsterAttacking(false);
        setPlayerHitFlash(true);
        setPlayerDamageNumber(playerDmg);
        // Now update player HP and show full logs including monster attack
        setSession({ ...updated, log: allLogs });
        await delay(500);
        setPlayerHitFlash(false);
        setPlayerDamageNumber(null);
      } else {
        // Monster missed or no counter-attack
        await delay(900);
        setSession({ ...updated, log: allLogs });
      }

      // Handle defeat/escape after monster's counter-attack animation
      if (updated.result) {
        setShowDefeatModal(true);
      }
    } catch (err: unknown) {
      const recovered = await tryRecoverSession();
      if (!recovered) {
        const msg = err instanceof Error ? err.message : '공격에 실패했습니다.';
        addToast(msg, 'error');
        clearDungeonProgress();
        router.replace(DUNGEON_MENU_ROUTE);
      }
    } finally {
      setActing(false);
    }
  }, [acting, session, addToast, tryRecoverSession, router]);

  // Auto-attack loop
  useEffect(() => {
    const isDungeonVictory = session?.result === 'VICTORY' && !!dungeonProgressRef.current;
    if (!autoAttack || !session || (!!session.result && !isDungeonVictory)) {
      return;
    }
    const interval = setInterval(() => {
      if (!autoAttackRef.current) return;
      if (actingRef.current || transitioningRef.current) return;
      const currentResult = sessionRef.current?.result;
      if (currentResult && !(currentResult === 'VICTORY' && !!dungeonProgressRef.current)) {
        setAutoAttack(false);
        return;
      }
      if (!currentResult) {
        handleAttack();
      }
    }, speedUp ? 750 : 1500);
    return () => clearInterval(interval);
  }, [autoAttack, speedUp, session?.result, handleAttack]);

  // Turn off auto-attack on battle end (not on dungeon victory)
  useEffect(() => {
    if (session?.result && !(session.result === 'VICTORY' && !!dungeonProgressRef.current)) {
      setAutoAttack(false);
    }
  }, [session?.result]);

  const handleEscape = useCallback(async () => {
    if (acting || !session || session.result || transitioningRef.current) return;
    setActing(true);
    try {
      await battleApi.escape();
      const updated = await battleApi.status();
      setSession(updated);
      if (updated.result === 'ESCAPE') {
        try { await battleApi.confirm(); } catch { /* ignore */ }
        clearDungeonProgress();
        setShowEscapeScreen(true);
      } else if (updated.result) {
        setShowDefeatModal(true);
      }
    } catch (err: unknown) {
      const recovered = await tryRecoverSession();
      if (!recovered) {
        const msg = err instanceof Error ? err.message : '도주에 실패했습니다.';
        addToast(msg, 'error');
        clearDungeonProgress();
        router.replace(DUNGEON_MENU_ROUTE);
      }
    } finally {
      setActing(false);
    }
  }, [acting, session, addToast, tryRecoverSession, router]);

  const handleDefeatConfirm = useCallback(async () => {
    try { await battleApi.confirm(); } catch { /* ignore */ }
    clearDungeonProgress();
    await refreshUser();
    router.push(DUNGEON_MENU_ROUTE);
  }, [router, refreshUser]);

  const handleEscapeConfirm = useCallback(async () => {
    setShowEscapeScreen(false);
    await refreshUser();
    router.push(DUNGEON_MENU_ROUTE);
  }, [router, refreshUser]);

  const handleOpenBag = useCallback(async () => {
    if (acting || !session || session.result || transitioningRef.current) return;
    setBagLoading(true);
    setShowBagModal(true);
    try {
      const items = await inventoryApi.list();
      setBagItems(items.filter(i => i.item.type === 'CONSUMABLE' && i.quantity > 0));
    } catch {
      addToast('가방을 열 수 없습니다.', 'error');
      setShowBagModal(false);
    } finally {
      setBagLoading(false);
    }
  }, [acting, session, addToast]);

  const handleUseItem = useCallback(async () => {
    if (usingItem || !session || session.result) return;
    setUsingItem(true);
    const prevPlayerHp = session.playerHp;
    try {
      await battleApi.item();
      const updated = await battleApi.status();

      const healAmount = updated.playerHp - prevPlayerHp;

      setSession(updated);
      setShowBagModal(false);

      if (healAmount > 0) {
        addToast(`HP가 ${healAmount} 회복되었습니다!`, 'success');
      }

      // Refresh bag items
      const items = await inventoryApi.list();
      setBagItems(items.filter(i => i.item.type === 'CONSUMABLE' && i.quantity > 0));

      if (updated.result && updated.result !== 'VICTORY') {
        setShowDefeatModal(true);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '아이템 사용에 실패했습니다.';
      addToast(msg, 'error');
    } finally {
      setUsingItem(false);
    }
  }, [usingItem, session, addToast]);

  const handleDungeonClearConfirm = useCallback(async () => {
    setShowDungeonClear(false);
    setTotalRewards({ exp: 0, gold: 0, items: [] });
    await refreshUser();
    router.push(DUNGEON_MENU_ROUTE);
  }, [router, refreshUser]);

  if (authLoading || loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#13101e' }}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (!session) return null;

  const progress = dungeonProgress;
  const currentMonsterNum = progress ? progress.currentMonsterIndex + 1 : 1;
  const totalMonsters = progress ? progress.totalMonsters : 1;
  const isBossMonster = progress ? progress.currentMonsterIndex === progress.totalMonsters - 1 : false;
  const monsterLevel = progress?.monsterLevels?.[progress.currentMonsterIndex] ?? null;

  const resultTitle = session.result === 'DEFEAT' ? '패배...' : session.result === 'ESCAPE' ? '도주 성공' : '';
  const resultColor = session.result === 'DEFEAT' ? '#e94560' : '#f39c12';

  const getMonsterAnimStyle = (): React.CSSProperties => {
    if (monsterAnim === 'exiting') return { animation: 'monsterExit 0.6s ease-in forwards' };
    if (monsterAnim === 'entering') return { animation: 'monsterEnter 0.6s ease-out forwards' };
    return { animation: attackShake ? 'monsterShake 0.4s ease' : 'monsterFloat 3s ease-in-out infinite' };
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 150,
        display: 'flex',
        justifyContent: 'center',
        background: '#050508',
      }}
    >
    <div
      style={{
        width: '100%',
        maxWidth: '430px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: '#13101e',
        backgroundImage: 'url(/bg-dungeon.svg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        backgroundRepeat: 'no-repeat',
        boxShadow: '0 0 60px rgba(124,58,237,0.08), 0 0 40px rgba(0,0,0,0.5)',
        position: 'relative',
      }}
    >
      <style>{`
        @keyframes monsterFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes monsterShake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        @keyframes monsterExit {
          0% { opacity: 1; transform: translateY(0) scale(1); }
          30% { opacity: 0.7; transform: translateY(-10px) scale(1.1); }
          100% { opacity: 0; transform: translateY(50px) scale(0.2) rotate(20deg); }
        }
        @keyframes monsterEnter {
          0% { opacity: 0; transform: translateX(100px) scale(0.4); }
          60% { opacity: 1; transform: translateX(-8px) scale(1.05); }
          100% { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes monsterInfoExit {
          0% { opacity: 1; transform: translateX(0); }
          100% { opacity: 0; transform: translateX(-40px); }
        }
        @keyframes monsterInfoEnter {
          0% { opacity: 0; transform: translateX(40px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        @keyframes playerAttack {
          0% { transform: translateX(0); }
          30% { transform: translateX(16px) translateY(-8px); }
          100% { transform: translateX(0); }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 8px rgba(233,69,96,0.3); }
          50% { box-shadow: 0 0 20px rgba(233,69,96,0.6); }
        }
        @keyframes clearFadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes clearTrophyBounce {
          0% { transform: scale(0) rotate(-10deg); opacity: 0; }
          50% { transform: scale(1.2) rotate(5deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes clearSlideUp {
          0% { opacity: 0; transform: translateY(30px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes clearPulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        @keyframes sparkle {
          0%, 100% { opacity: 0; transform: scale(0); }
          50% { opacity: 1; transform: scale(1); }
        }
        @keyframes monsterHitFlash {
          0% { filter: brightness(1); }
          20% { filter: brightness(3) saturate(0) ; }
          40% { filter: brightness(1.5) saturate(0.5); }
          100% { filter: brightness(1); }
        }
        @keyframes damageFloat {
          0% { opacity: 1; transform: translateY(0) scale(1); }
          60% { opacity: 1; transform: translateY(-30px) scale(1.2); }
          100% { opacity: 0; transform: translateY(-50px) scale(0.8); }
        }
        @keyframes monsterLunge {
          0% { transform: translateX(0); }
          30% { transform: translateX(-30px) translateY(4px); }
          100% { transform: translateX(0); }
        }
        @keyframes playerHitFlash {
          0% { filter: brightness(1); }
          20% { filter: brightness(2) hue-rotate(-30deg); }
          40% { filter: brightness(1.3); }
          100% { filter: brightness(1); }
        }
        @keyframes playerHitShake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(5px); }
          40% { transform: translateX(-5px); }
          60% { transform: translateX(3px); }
          80% { transform: translateX(-3px); }
        }
        @keyframes victoryBannerIn {
          0% { opacity: 0; transform: scale(0.5) translateY(10px); }
          40% { opacity: 1; transform: scale(1.15) translateY(-2px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes victoryBannerOut {
          0% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.8) translateY(-20px); }
        }
        @keyframes victorySlash {
          0% { width: 0; opacity: 0; }
          30% { width: 120%; opacity: 1; }
          100% { width: 120%; opacity: 0; }
        }
      `}</style>

      {/* ─── Top: Dungeon Progress + Enemy ─── */}
      <div style={{ flexShrink: 0, paddingTop: 'env(safe-area-inset-top)' }}>
        {/* Dungeon Name + Progress Bar */}
        {progress && (
          <div
            style={{
              padding: '10px 16px',
              background: 'linear-gradient(180deg, rgba(19,16,30,0.95), rgba(19,16,30,0.7))',
              borderBottom: '1px solid rgba(124,58,237,0.12)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              backdropFilter: 'blur(8px)',
            }}
          >
            {progress.dungeonName && (
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#a78bfa', letterSpacing: '0.5px' }}>
                {progress.dungeonName}
              </span>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '10px', color: '#a78bfa', fontWeight: 700, whiteSpace: 'nowrap', letterSpacing: '0.5px' }}>
              {currentMonsterNum}/{totalMonsters}
            </span>
            <div style={{ flex: 1, display: 'flex', gap: '3px' }}>
              {Array.from({ length: totalMonsters }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: '4px',
                    borderRadius: '2px',
                    background:
                      i < progress.currentMonsterIndex
                        ? 'linear-gradient(90deg, #7c3aed, #a78bfa)'
                        : i === progress.currentMonsterIndex
                          ? 'linear-gradient(90deg, #fbbf24, #f59e0b)'
                          : i === totalMonsters - 1
                            ? 'rgba(233,69,96,0.25)'
                            : 'rgba(255,255,255,0.08)',
                    transition: 'background 0.3s ease',
                    boxShadow: i < progress.currentMonsterIndex
                      ? '0 0 6px rgba(124,58,237,0.3)'
                      : i === progress.currentMonsterIndex
                        ? '0 0 6px rgba(251,191,36,0.4)'
                        : 'none',
                  }}
                />
              ))}
            </div>
            {isBossMonster && (
              <span style={{ fontSize: '9px', fontWeight: 800, color: '#e94560', letterSpacing: '1px' }}>BOSS</span>
            )}
            </div>
          </div>
        )}

        {/* Enemy Area */}
        <div
          style={{
            padding: '12px 16px 16px',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              background: 'rgba(17, 18, 40, 0.75)',
              border: isBossMonster ? '1.5px solid rgba(233,69,96,0.4)' : '1.5px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '10px 14px',
              width: '55%',
              backdropFilter: 'blur(8px)',
              animation: monsterAnim === 'exiting'
                ? 'monsterInfoExit 0.6s ease-in forwards'
                : monsterAnim === 'entering'
                  ? 'monsterInfoEnter 0.6s ease-out forwards'
                  : isBossMonster ? 'pulseGlow 2s ease-in-out infinite' : undefined,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '13px', fontWeight: 800, color: isBossMonster ? '#e94560' : '#eee' }}>
                {isBossMonster && '👑 '}{session.monster.name}
              </span>
              <span style={{ fontSize: '10px', color: '#888', fontWeight: 600 }}>Lv.{monsterLevel ?? '??'}</span>
            </div>
            <HpBar current={session.enemyHp} max={session.enemyMaxHp} height={7} showNumbers />
          </div>

          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div
              style={{
                width: isBossMonster ? '80px' : '70px',
                height: isBossMonster ? '80px' : '70px',
                borderRadius: '50%',
                background: isBossMonster
                  ? 'radial-gradient(circle, rgba(233,69,96,0.25), rgba(233,69,96,0.03))'
                  : 'radial-gradient(circle, rgba(124,58,237,0.25), rgba(124,58,237,0.03))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isBossMonster ? '36px' : '30px',
                filter: isBossMonster
                  ? 'drop-shadow(0 0 14px rgba(233,69,96,0.5))'
                  : 'drop-shadow(0 0 8px rgba(124,58,237,0.4))',
                ...getMonsterAnimStyle(),
                ...(monsterHitFlash ? { animation: 'monsterHitFlash 0.5s ease-out, monsterShake 0.4s ease' } : {}),
                ...(monsterAttacking ? { animation: 'monsterLunge 0.5s ease' } : {}),
              }}
            >
              {session.monster.imageUrl ? (
                <img
                  src={session.monster.imageUrl}
                  alt={session.monster.name}
                  style={{
                    width: isBossMonster ? '66px' : '58px',
                    height: isBossMonster ? '66px' : '58px',
                    objectFit: 'cover',
                    borderRadius: '50%',
                    border: isBossMonster ? '2px solid rgba(233,69,96,0.6)' : '2px solid rgba(124,58,237,0.45)',
                  }}
                />
              ) : (
                isBossMonster ? '👹' : '👾'
              )}
            </div>
            {damageNumber !== null && (
              <div
                style={{
                  position: 'absolute',
                  top: '-8px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontSize: '18px',
                  fontWeight: 900,
                  color: '#e94560',
                  textShadow: '0 0 8px rgba(233,69,96,0.8), 0 2px 4px rgba(0,0,0,0.8)',
                  animation: 'damageFloat 0.6s ease-out forwards',
                  pointerEvents: 'none',
                  fontFamily: 'monospace',
                  zIndex: 10,
                }}
              >
                -{damageNumber}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Flexible Space ─── */}
      <div style={{ flex: 1 }} />

      {/* ─── Bottom Fixed: Player + Log + Buttons ─── */}
      <div style={{ flexShrink: 0, paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {/* Player Area */}
        <div
          style={{
            padding: '0 16px 6px',
            display: 'flex',
            alignItems: 'flex-end',
            gap: '10px',
            ...(playerHitFlash ? { animation: 'playerHitShake 0.4s ease' } : {}),
          }}
        >
          <div
            style={{
              position: 'relative',
              width: '60px', height: '60px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '32px',
              filter: 'drop-shadow(0 0 8px rgba(167,139,250,0.4))',
              flexShrink: 0,
              animation: playerAttackAnim ? 'playerAttack 0.3s ease'
                : playerHitFlash ? 'playerHitFlash 0.5s ease-out' : undefined,
            }}
          >
            ⚔️
            {playerDamageNumber !== null && (
              <div
                style={{
                  position: 'absolute',
                  top: '-8px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontSize: '16px',
                  fontWeight: 900,
                  color: '#ff6b6b',
                  textShadow: '0 0 8px rgba(255,107,107,0.8), 0 2px 4px rgba(0,0,0,0.8)',
                  animation: 'damageFloat 0.6s ease-out forwards',
                  pointerEvents: 'none',
                  fontFamily: 'monospace',
                  zIndex: 10,
                }}
              >
                -{playerDamageNumber}
              </div>
            )}
          </div>
          <div
            style={{
              flex: 1,
              background: 'rgba(17, 18, 40, 0.75)',
              border: playerHitFlash ? '1.5px solid rgba(233,69,96,0.6)' : '1.5px solid rgba(167, 139, 250, 0.2)',
              borderRadius: '12px',
              padding: '10px 14px',
              backdropFilter: 'blur(8px)',
              transition: 'border-color 0.3s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#a78bfa' }}>{authUser?.nickname || '플레이어'}</span>
              <span style={{ fontSize: '10px', color: '#888', fontWeight: 600 }}>Lv.{authUser?.level || '?'}</span>
            </div>
            <HpBar current={session.playerHp} max={session.playerMaxHp} height={7} showNumbers />
            <div style={{ marginTop: '3px', display: 'flex', gap: '10px', fontSize: '10px', color: '#666' }}>
              <span>ATK <span style={{ color: '#e94560', fontWeight: 700 }}>{session.playerAttack}</span></span>
              <span>DEF <span style={{ color: '#a78bfa', fontWeight: 700 }}>{session.playerDefense}</span></span>
            </div>
          </div>
        </div>

        {/* Battle Log - 2 lines height */}
        <div
          style={{
            margin: '6px 14px',
            background: 'rgba(17, 18, 40, 0.6)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '10px',
            padding: '6px 12px',
            height: '76px',
            overflowY: 'auto',
            backdropFilter: 'blur(4px)',
          }}
        >
          {session.log.length === 0 ? (
            <p style={{ color: '#444', fontSize: '11px', textAlign: 'center', margin: '4px 0' }}>전투를 시작하세요.</p>
          ) : (
            session.log.slice(-4).map((entry, idx) => {
              const logColor =
                entry.type === 'player_attack' ? '#4a9eff'
                  : entry.type === 'enemy_attack' ? '#e94560'
                    : entry.type === 'critical' ? '#fbbf24' : '#888';
              return (
                <div key={idx} style={{ padding: '0', fontSize: '10px', lineHeight: 1.5, color: logColor }}>
                  {entry.message}
                </div>
              );
            })
          )}
          <div ref={logEndRef} />
        </div>

        {/* Action Buttons */}
        <div style={{ padding: '6px 14px 10px' }}>
          {/* Auto Attack Toggle */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              marginBottom: '6px',
              paddingRight: '2px',
            }}
          >
            <button
              onClick={() => setAutoAttack(prev => !prev)}
              disabled={!!session.result || transitioning}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'none',
                border: 'none',
                cursor: session.result || transitioning ? 'default' : 'pointer',
                padding: '4px 8px',
                borderRadius: '6px',
                opacity: session.result || transitioning ? 0.35 : 1,
              }}
            >
              <span style={{ fontSize: '11px', color: autoAttack ? '#fbbf24' : '#666', fontWeight: 600 }}>
                자동 공격
              </span>
              <div
                style={{
                  width: '34px',
                  height: '18px',
                  borderRadius: '9px',
                  background: autoAttack ? 'linear-gradient(135deg, #fbbf24, #f59e0b)' : '#333',
                  border: `1px solid ${autoAttack ? '#f59e0b' : '#555'}`,
                  position: 'relative',
                  transition: 'all 0.2s ease',
                }}
              >
                <div
                  style={{
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    background: autoAttack ? '#fff' : '#888',
                    position: 'absolute',
                    top: '1px',
                    left: autoAttack ? '17px' : '1px',
                    transition: 'all 0.2s ease',
                    boxShadow: autoAttack ? '0 0 4px rgba(251,191,36,0.5)' : 'none',
                  }}
                />
              </div>
            </button>
            {/* Speed x2 Toggle */}
            <button
              onClick={() => setSpeedUp(prev => !prev)}
              disabled={!!session.result || transitioning}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'none',
                border: 'none',
                cursor: session.result || transitioning ? 'default' : 'pointer',
                padding: '4px 8px',
                borderRadius: '6px',
                opacity: session.result || transitioning ? 0.35 : 1,
              }}
            >
              <span style={{ fontSize: '11px', color: speedUp ? '#fbbf24' : '#666', fontWeight: 600 }}>
                x2
              </span>
              <div
                style={{
                  width: '34px',
                  height: '18px',
                  borderRadius: '9px',
                  background: speedUp ? 'linear-gradient(135deg, #fbbf24, #f59e0b)' : '#333',
                  border: `1px solid ${speedUp ? '#f59e0b' : '#555'}`,
                  position: 'relative',
                  transition: 'all 0.2s ease',
                }}
              >
                <div
                  style={{
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    background: speedUp ? '#fff' : '#888',
                    position: 'absolute',
                    top: '1px',
                    left: speedUp ? '17px' : '1px',
                    transition: 'all 0.2s ease',
                    boxShadow: speedUp ? '0 0 4px rgba(251,191,36,0.5)' : 'none',
                  }}
                />
              </div>
            </button>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
              background: 'rgba(17, 18, 40, 0.7)',
              border: '1.5px solid rgba(124, 58, 237, 0.2)',
              borderRadius: '14px',
              padding: '12px',
              backdropFilter: 'blur(8px)',
            }}
          >
            <Button
              variant="primary" size="lg"
              onClick={handleAttack}
              loading={acting}
              disabled={!!session.result || transitioning}
              style={{ borderRadius: '8px', fontWeight: 800, fontSize: '14px', letterSpacing: '2px', padding: '10px 0' }}
            >
              ▶ 공격
            </Button>
            <Button
              variant="ghost" size="lg"
              onClick={handleOpenBag}
              disabled={acting || !!session.result || transitioning}
              style={{ borderRadius: '8px', fontWeight: 700, fontSize: '13px', padding: '10px 0' }}
            >
              🎒 가방
            </Button>
            <Button
              variant="danger" size="lg"
              onClick={handleEscape}
              disabled={acting || !!session.result || transitioning || isBossMonster}
              style={{ borderRadius: '8px', fontWeight: 700, fontSize: '13px', padding: '10px 0', opacity: isBossMonster ? 0.35 : undefined, gridColumn: 'span 2' }}
            >
              {isBossMonster ? '도주 불가' : '도망치다'}
            </Button>
          </div>
        </div>
      </div>

      {/* ─── Bag Modal ─── */}
      <Modal isOpen={showBagModal} onClose={() => setShowBagModal(false)} title="🎒 가방">
        <div>
          <p style={{ fontSize: '11px', color: '#888', marginBottom: '10px', textAlign: 'center' }}>소비 아이템</p>
          {bagLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
              <Spinner size="md" />
            </div>
          ) : bagItems.length === 0 ? (
            <p style={{ color: '#555', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
              사용 가능한 소비 아이템이 없습니다.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '260px', overflowY: 'auto' }}>
              {bagItems.map(inv => (
                <div
                  key={inv.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                  }}
                >
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '6px',
                    background: 'rgba(46,204,113,0.15)', border: '1px solid rgba(46,204,113,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0,
                  }}>
                    {inv.item.imageUrl ? (
                      <img src={inv.item.imageUrl} alt={inv.item.name} style={{ width: '28px', height: '28px', objectFit: 'cover', borderRadius: '4px' }} />
                    ) : '🧪'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#eee' }}>{inv.item.name}</div>
                    <div style={{ fontSize: '10px', color: '#888', marginTop: '2px' }}>
                      {inv.item.description || 'HP를 회복합니다.'} · <span style={{ color: '#aaa' }}>x{inv.quantity}</span>
                    </div>
                  </div>
                  <Button
                    variant="primary" size="sm"
                    onClick={handleUseItem}
                    loading={usingItem}
                    disabled={usingItem}
                    style={{ borderRadius: '6px', fontSize: '12px', fontWeight: 700, padding: '6px 14px', flexShrink: 0 }}
                  >
                    사용
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* ─── Defeat Fullscreen ─── */}
      {showDefeatModal && session.result === 'DEFEAT' && (
        <div
          onClick={handleDefeatConfirm}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            background: 'linear-gradient(180deg, rgba(5,5,15,0.97), rgba(15,5,10,0.99), rgba(5,5,15,0.97))',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 24px',
            animation: 'clearFadeIn 0.5s ease',
            cursor: 'pointer',
          }}
        >
          <div style={{ fontSize: '72px', animation: 'clearTrophyBounce 0.8s ease-out', marginBottom: '16px' }}>💀</div>
          <p
            style={{
              fontSize: '2rem', fontWeight: 900,
              color: '#e94560',
              textShadow: '0 0 20px rgba(233,69,96,0.4)',
              margin: '0 0 32px',
              animation: 'clearSlideUp 0.6s ease-out 0.3s both',
              textAlign: 'center',
            }}
          >
            패배...
          </p>
          <div
            style={{
              width: '100%', maxWidth: '340px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(233,69,96,0.15)',
              borderRadius: '12px',
              padding: '20px',
              animation: 'clearSlideUp 0.6s ease-out 0.5s both',
            }}
          >
            <h4 style={{ margin: '0 0 14px', fontSize: '13px', fontWeight: 700, color: '#e94560', textAlign: 'center', letterSpacing: '2px' }}>
              PENALTY
            </h4>
            {session.penalty && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '14px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ color: '#888' }}>이전 경험치</span>
                  <span style={{ color: '#aaa', fontWeight: 700 }}>{session.penalty.previousExp.toLocaleString()} EXP</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '14px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ color: '#888' }}>경험치 패널티 <span style={{ color: '#e94560' }}>(-10%)</span></span>
                  <span style={{ color: '#e94560', fontWeight: 700 }}>-{session.penalty.expLost.toLocaleString()} EXP</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '14px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ color: '#888' }}>현재 경험치</span>
                  <span style={{ color: '#f39c12', fontWeight: 700 }}>{session.penalty.currentExp.toLocaleString()} EXP</span>
                </div>
                {session.penalty.goldLost > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '14px' }}>
                    <span style={{ color: '#888' }}>골드 손실</span>
                    <span style={{ color: '#e94560', fontWeight: 700 }}>-{session.penalty.goldLost.toLocaleString()} G</span>
                  </div>
                )}
              </>
            )}
            {!session.penalty && (
              <p style={{ color: '#888', fontSize: '14px', margin: 0, textAlign: 'center' }}>
                전투에서 패배하였습니다.
              </p>
            )}
          </div>
          <p
            style={{
              position: 'absolute',
              bottom: 'calc(40px + env(safe-area-inset-bottom))',
              color: '#555',
              fontSize: '12px',
              fontWeight: 500,
              animation: 'clearPulse 2s ease-in-out infinite',
              letterSpacing: '1px',
            }}
          >
            화면을 터치하여 나가기
          </p>
        </div>
      )}

      {/* ─── Escape Fullscreen ─── */}
      {showEscapeScreen && (
        <div
          onClick={handleEscapeConfirm}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            background: 'linear-gradient(180deg, rgba(5,5,15,0.97), rgba(10,10,20,0.99), rgba(5,5,15,0.97))',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 24px',
            animation: 'clearFadeIn 0.5s ease',
            cursor: 'pointer',
          }}
        >
          <div style={{ fontSize: '72px', animation: 'clearTrophyBounce 0.8s ease-out', marginBottom: '16px' }}>🏃</div>
          <p
            style={{
              fontSize: '2rem', fontWeight: 900,
              color: '#f39c12',
              textShadow: '0 0 20px rgba(243,156,18,0.4)',
              margin: '0 0 32px',
              animation: 'clearSlideUp 0.6s ease-out 0.3s both',
              textAlign: 'center',
            }}
          >
            도주 성공!
          </p>
          <div
            style={{
              width: '100%', maxWidth: '340px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(243,156,18,0.15)',
              borderRadius: '12px',
              padding: '20px',
              animation: 'clearSlideUp 0.6s ease-out 0.5s both',
              textAlign: 'center',
            }}
          >
            <p style={{ color: '#888', fontSize: '14px', margin: 0 }}>
              던전에서 무사히 탈출했습니다.
            </p>
            <p style={{ color: '#555', fontSize: '12px', margin: '8px 0 0' }}>
              보상 없이 던전을 떠납니다.
            </p>
          </div>
          <p
            style={{
              position: 'absolute',
              bottom: 'calc(40px + env(safe-area-inset-bottom))',
              color: '#555',
              fontSize: '12px',
              fontWeight: 500,
              animation: 'clearPulse 2s ease-in-out infinite',
              letterSpacing: '1px',
            }}
          >
            화면을 터치하여 나가기
          </p>
        </div>
      )}

      {/* ─── Victory Banner ─── */}
      {showVictoryBanner && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 150,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)',
            pointerEvents: 'none',
            animation: 'clearFadeIn 0.2s ease',
          }}
        >
          <div style={{ position: 'relative', textAlign: 'center' }}>
            {/* Slash effect */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '-10%',
                height: '2px',
                background: 'linear-gradient(90deg, transparent, #fbbf24, #e94560, #fbbf24, transparent)',
                animation: 'victorySlash 0.6s ease-out forwards',
                transform: 'translateY(-50%)',
              }}
            />
            <p
              style={{
                fontSize: '2rem',
                fontWeight: 900,
                color: '#fbbf24',
                textShadow: '0 0 20px rgba(251,191,36,0.6), 0 2px 8px rgba(0,0,0,0.8)',
                margin: 0,
                letterSpacing: '6px',
                animation: 'victoryBannerIn 0.4s ease-out',
              }}
            >
              처치!
            </p>
          </div>
        </div>
      )}

      {/* ─── Dungeon Clear Fullscreen ─── */}
      {showDungeonClear && (
        <div
          onClick={handleDungeonClearConfirm}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            background: 'linear-gradient(180deg, rgba(5,5,15,0.97), rgba(10,10,20,0.99), rgba(5,5,15,0.97))',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 24px',
            animation: 'clearFadeIn 0.5s ease',
            cursor: 'pointer',
          }}
        >
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                width: '6px', height: '6px',
                borderRadius: '50%',
                background: '#fbbf24',
                top: `${15 + Math.random() * 70}%`,
                left: `${10 + Math.random() * 80}%`,
                animation: `sparkle ${1.5 + Math.random()}s ease-in-out ${Math.random() * 2}s infinite`,
                boxShadow: '0 0 8px rgba(251,191,36,0.6)',
              }}
            />
          ))}

          <div style={{ fontSize: '72px', animation: 'clearTrophyBounce 0.8s ease-out', marginBottom: '16px' }}>🏆</div>

          <p
            style={{
              fontSize: '2rem', fontWeight: 900,
              background: 'linear-gradient(135deg, #fbbf24, #f59e0b, #fbbf24)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              margin: '0 0 32px',
              animation: 'clearSlideUp 0.6s ease-out 0.3s both',
              textAlign: 'center',
            }}
          >
            던전 클리어!
          </p>

          <div
            style={{
              width: '100%', maxWidth: '340px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(251,191,36,0.15)',
              borderRadius: '12px',
              padding: '20px',
              animation: 'clearSlideUp 0.6s ease-out 0.5s both',
            }}
          >
            <h4 style={{ margin: '0 0 14px', fontSize: '13px', fontWeight: 700, color: '#fbbf24', textAlign: 'center', letterSpacing: '2px' }}>
              REWARDS
            </h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '14px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ color: '#888' }}>처치한 몬스터</span>
              <span style={{ color: '#a78bfa', fontWeight: 700 }}>{totalMonsters}마리</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '14px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ color: '#888' }}>총 골드</span>
              <span style={{ color: '#fbbf24', fontWeight: 700 }}>+{totalRewards.gold.toLocaleString()} G</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '14px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ color: '#888' }}>총 경험치</span>
              <span style={{ color: '#2ecc71', fontWeight: 700 }}>+{totalRewards.exp.toLocaleString()} EXP</span>
            </div>
            {totalRewards.items.length > 0 && (
              <div style={{ marginTop: '10px' }}>
                <span style={{ color: '#888', fontSize: '12px' }}>획득 아이템:</span>
                {totalRewards.items.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '12px' }}>
                    <span style={{ color: '#c4b5fd' }}>{item.name}</span>
                    <span style={{ color: '#666' }}>{item.rarity}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p
            style={{
              position: 'absolute',
              bottom: 'calc(40px + env(safe-area-inset-bottom))',
              color: '#555',
              fontSize: '12px',
              fontWeight: 500,
              animation: 'clearPulse 2s ease-in-out infinite',
              letterSpacing: '1px',
            }}
          >
            화면을 터치하여 나가기
          </p>
        </div>
      )}
    </div>
    </div>
  );
}

export default function BattlePage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#13101e' }}>
        <Spinner size="lg" />
      </div>
    }>
      <BattleContent />
    </Suspense>
  );
}
