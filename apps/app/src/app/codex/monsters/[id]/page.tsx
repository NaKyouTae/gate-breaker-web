'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { codex } from '@gate-breaker/api-client';
import { Spinner, useToast } from '@gate-breaker/ui';
import { useAuth } from '@/context/auth-context';
import type { CodexMonsterDetail, ItemRarity } from '@gate-breaker/types';

const RARITY_COLORS: Record<ItemRarity, string> = {
  COMMON: '#888',
  RARE: '#4a9eff',
  EPIC: '#b048f8',
  LEGENDARY: '#ff8c00',
  MYTHIC: '#ff2d55',
};

export default function CodexMonsterDetailPage() {
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const params = useParams();
  const { addToast } = useToast();
  const id = params.id as string;

  const [monster, setMonster] = useState<CodexMonsterDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const data = await codex.monsterDetail(id);
      setMonster(data);
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : '몬스터 정보를 불러올 수 없습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, addToast]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (isAuthenticated) {
      fetchData();
    }
  }, [authLoading, isAuthenticated, router, fetchData]);

  if (authLoading || loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (!monster) {
    return (
      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '16px', textAlign: 'center', color: '#555' }}>
        몬스터를 찾을 수 없습니다.
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '16px' }}>
      {/* Back button */}
      <Link
        href="/codex"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          color: '#a78bfa',
          fontSize: '0.8rem',
          fontWeight: 700,
          textDecoration: 'none',
          marginBottom: '16px',
          padding: '6px 14px 6px 10px',
          background: 'rgba(124,58,237,0.1)',
          border: '1px solid rgba(124,58,237,0.25)',
          borderRadius: '8px',
          letterSpacing: '0.5px',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        도감으로 돌아가기
      </Link>

      {/* Monster header */}
      <div
        style={{
          background: '#1a0f0f',
          borderRadius: '16px',
          border: '1px solid rgba(239,68,68,0.2)',
          padding: '20px',
          marginBottom: '12px',
        }}
      >
        {/* Image */}
        <div
          style={{
            width: '100%',
            aspectRatio: '16 / 9',
            borderRadius: '12px',
            overflow: 'hidden',
            background: '#0a0a12',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
            border: '1px solid rgba(239,68,68,0.15)',
            filter: monster.encountered ? 'none' : 'grayscale(1) brightness(0.2)',
          }}
        >
          {monster.imageUrl ? (
            <img
              src={monster.imageUrl}
              alt={monster.encountered ? monster.name : '???'}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span style={{ fontSize: '14px', color: '#444' }}>
              {monster.encountered ? 'NO IMG' : '?'}
            </span>
          )}
        </div>

        {/* Name & dungeon */}
        <div
          style={{
            fontSize: '1.2rem',
            fontWeight: 700,
            color: monster.encountered ? '#ef4444' : '#555',
            marginBottom: '6px',
          }}
        >
          {monster.encountered ? monster.name : '???'}
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span
            style={{
              padding: '2px 8px',
              borderRadius: '6px',
              background: 'rgba(239,68,68,0.1)',
              color: '#ef4444',
              fontSize: '0.75rem',
              fontWeight: 700,
            }}
          >
            {monster.dungeon.name}
          </span>
          <span style={{ fontSize: '0.75rem', color: '#666' }}>
            Lv.{monster.dungeon.minLevel}~{monster.dungeon.maxLevel}
          </span>
        </div>
        {!monster.encountered && (
          <div style={{ marginTop: '8px', fontSize: '0.8rem', color: '#555', fontStyle: 'italic' }}>
            아직 조우하지 못한 몬스터
          </div>
        )}
      </div>

      {/* Stats */}
      {monster.encountered && (
        <div
          style={{
            background: '#12122a',
            borderRadius: '12px',
            border: '1px solid #2a2a4a',
            padding: '14px',
            marginBottom: '12px',
          }}
        >
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#777', marginBottom: '10px' }}>
            능력치
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '8px',
            }}
          >
            <StatBox label="HP" value={monster.hp.toLocaleString()} color="#2ecc71" />
            <StatBox label="ATK" value={String(monster.attack)} color="#e94560" />
            <StatBox label="DEF" value={String(monster.defense)} color="#4a9eff" />
          </div>
        </div>
      )}

      {/* Rewards */}
      {monster.encountered && (
        <div
          style={{
            background: '#12122a',
            borderRadius: '12px',
            border: '1px solid #2a2a4a',
            padding: '14px',
            marginBottom: '12px',
          }}
        >
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#777', marginBottom: '10px' }}>
            처치 보상
          </div>
          <div style={{ display: 'flex', gap: '20px' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '2px' }}>경험치</div>
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#4ade80' }}>
                +{monster.expReward.toLocaleString()} EXP
              </span>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '2px' }}>골드</div>
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fbbf24' }}>
                +{monster.goldReward.toLocaleString()} G
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Drop items */}
      {monster.encountered && monster.drops.length > 0 && (
        <div
          style={{
            background: '#12122a',
            borderRadius: '12px',
            border: '1px solid #2a2a4a',
            padding: '14px',
          }}
        >
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#777', marginBottom: '10px' }}>
            드롭 아이템
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {monster.drops.map((drop) => (
              <Link
                key={drop.itemId}
                href={`/codex/items/${drop.itemId}`}
                style={{ textDecoration: 'none' }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 10px',
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: '8px',
                  }}
                >
                  {/* Item thumbnail */}
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '8px',
                      border: `1px solid ${RARITY_COLORS[drop.itemRarity]}33`,
                      overflow: 'hidden',
                      background: '#0a0a15',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {drop.itemImageUrl ? (
                      <img
                        src={drop.itemImageUrl}
                        alt={drop.itemName}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <span style={{ fontSize: '8px', color: '#444' }}>IMG</span>
                    )}
                  </div>
                  {/* Item name */}
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: RARITY_COLORS[drop.itemRarity],
                      }}
                    >
                      {drop.itemName}
                    </div>
                  </div>
                  {/* Drop rate */}
                  <div
                    style={{
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: 'rgba(167,139,250,0.1)',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: '#a78bfa',
                    }}
                  >
                    {(drop.dropRate * 100).toFixed(1)}%
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      style={{
        padding: '8px',
        background: `${color}10`,
        borderRadius: '8px',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '0.7rem', color: '#666', marginBottom: '2px' }}>{label}</div>
      <div style={{ fontSize: '1rem', fontWeight: 700, color }}>{value}</div>
    </div>
  );
}
