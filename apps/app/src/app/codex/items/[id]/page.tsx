'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { codex } from '@gate-breaker/api-client';
import { Spinner, useToast } from '@gate-breaker/ui';
import { useAuth } from '@/context/auth-context';
import type { CodexItemDetail, ItemRarity, ItemType } from '@gate-breaker/types';

const RARITY_COLORS: Record<ItemRarity, string> = {
  COMMON: '#888',
  RARE: '#4a9eff',
  EPIC: '#b048f8',
  LEGENDARY: '#ff8c00',
  MYTHIC: '#ff2d55',
};

const RARITY_LABELS: Record<ItemRarity, string> = {
  COMMON: '일반',
  RARE: '레어',
  EPIC: '에픽',
  LEGENDARY: '전설',
  MYTHIC: '신화',
};

const TYPE_LABELS: Record<ItemType, string> = {
  WEAPON: '무기',
  ARMOR: '갑옷',
  GLOVE: '장갑',
  SHOE: '신발',
  RING: '반지',
  NECKLACE: '목걸이',
  MATERIAL: '재료',
  CONSUMABLE: '소모품',
};

export default function CodexItemDetailPage() {
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const params = useParams();
  const { addToast } = useToast();
  const id = params.id as string;

  const [item, setItem] = useState<CodexItemDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const data = await codex.itemDetail(id);
      setItem(data);
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : '아이템 정보를 불러올 수 없습니다.', 'error');
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

  if (!item) {
    return (
      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '16px', textAlign: 'center', color: '#555' }}>
        아이템을 찾을 수 없습니다.
      </div>
    );
  }

  const rarityColor = RARITY_COLORS[item.rarity];

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

      {/* Item header */}
      <div
        style={{
          background: '#12122a',
          borderRadius: '16px',
          border: `1px solid ${rarityColor}33`,
          padding: '20px',
          marginBottom: '12px',
        }}
      >
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          {/* Image */}
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: '12px',
              border: `1px solid ${rarityColor}44`,
              overflow: 'hidden',
              background: '#0a0a15',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              filter: item.discovered ? 'none' : 'grayscale(1) brightness(0.3)',
            }}
          >
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt={item.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <span style={{ fontSize: '12px', color: '#444' }}>NO IMG</span>
            )}
          </div>

          {/* Info */}
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: '1.1rem',
                fontWeight: 700,
                color: item.discovered ? rarityColor : '#555',
                marginBottom: '6px',
              }}
            >
              {item.discovered ? item.name : '???'}
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: '6px',
                  background: `${rarityColor}20`,
                  color: rarityColor,
                  fontSize: '0.75rem',
                  fontWeight: 700,
                }}
              >
                {RARITY_LABELS[item.rarity]}
              </span>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: '6px',
                  background: 'rgba(255,255,255,0.05)',
                  color: '#999',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}
              >
                {TYPE_LABELS[item.type]}
              </span>
            </div>
            {!item.discovered && (
              <span style={{ fontSize: '0.8rem', color: '#555', fontStyle: 'italic' }}>
                아직 발견하지 못한 아이템
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        {item.discovered && item.description && (
          <div
            style={{
              marginTop: '14px',
              padding: '10px 12px',
              background: 'rgba(0,0,0,0.3)',
              borderRadius: '8px',
              fontSize: '0.85rem',
              color: '#aaa',
              lineHeight: 1.5,
            }}
          >
            {item.description}
          </div>
        )}
      </div>

      {/* Stats */}
      {item.discovered && (item.baseAttack > 0 || item.baseDefense > 0 || item.baseHp > 0) && (
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
            기본 스탯
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            {item.baseAttack > 0 && (
              <StatBox label="ATK" value={item.baseAttack} color="#e94560" />
            )}
            {item.baseDefense > 0 && (
              <StatBox label="DEF" value={item.baseDefense} color="#4a9eff" />
            )}
            {item.baseHp > 0 && (
              <StatBox label="HP" value={item.baseHp} color="#2ecc71" />
            )}
          </div>
        </div>
      )}

      {/* Price info */}
      {item.discovered && (
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
            가격 정보
          </div>
          <div style={{ display: 'flex', gap: '20px' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '2px' }}>판매가</div>
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fbbf24' }}>
                {item.sellPrice.toLocaleString()} G
              </span>
            </div>
            {item.shopAvailable && item.buyPrice != null && (
              <div>
                <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '2px' }}>상점 구매가</div>
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fbbf24' }}>
                  {item.buyPrice.toLocaleString()} G
                </span>
              </div>
            )}
            {!item.shopAvailable && (
              <div>
                <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '2px' }}>상점</div>
                <span style={{ fontSize: '0.85rem', color: '#555' }}>판매하지 않음</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Drop sources */}
      {item.discovered && item.dropSources.length > 0 && (
        <div
          style={{
            background: '#12122a',
            borderRadius: '12px',
            border: '1px solid #2a2a4a',
            padding: '14px',
          }}
        >
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#777', marginBottom: '10px' }}>
            드롭 위치
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {item.dropSources.map((source) => (
              <Link
                key={source.monsterId}
                href={`/codex/monsters/${source.monsterId}`}
                style={{ textDecoration: 'none' }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 10px',
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: '8px',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ddd' }}>
                      {source.monsterName}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#666' }}>
                      {source.dungeonName}
                    </div>
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#a78bfa' }}>
                    {(source.dropRate * 100).toFixed(1)}%
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      style={{
        flex: 1,
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
