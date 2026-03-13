'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { codex } from '@gate-breaker/api-client';
import { Spinner, useToast } from '@gate-breaker/ui';
import { useAuth } from '@/context/auth-context';
import type { CodexItem, CodexMonster, ItemRarity } from '@gate-breaker/types';

const RARITY_COLORS: Record<ItemRarity, string> = {
  COMMON: '#888',
  RARE: '#4a9eff',
  EPIC: '#b048f8',
  LEGENDARY: '#ff8c00',
  MYTHIC: '#ff2d55',
};

type CodexTab = 'items' | 'monsters';

export default function CodexPage() {
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const { addToast } = useToast();

  const [tab, setTab] = useState<CodexTab>('items');
  const [items, setItems] = useState<CodexItem[]>([]);
  const [monsters, setMonsters] = useState<CodexMonster[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [itemList, monsterList] = await Promise.all([
        codex.items(),
        codex.monsters(),
      ]);
      setItems(itemList);
      setMonsters(monsterList);
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : '도감 정보를 불러올 수 없습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

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

  const currentList = tab === 'items' ? items : monsters;
  const discoveredCount = tab === 'items'
    ? items.filter((i) => i.discovered).length
    : monsters.filter((m) => m.encountered).length;

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '16px' }}>
      {/* Tab switcher */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '12px',
        }}
      >
        {(['items', 'monsters'] as CodexTab[]).map((t) => {
          const isActive = tab === t;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1,
                padding: '10px 0',
                borderRadius: '12px',
                border: isActive ? '1px solid #7c3aed' : '1px solid #2a2a4a',
                background: isActive ? 'rgba(124,58,237,0.15)' : '#12122a',
                color: isActive ? '#c4b5fd' : '#777',
                fontSize: '0.9rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {t === 'items' ? '아이템' : '몬스터'}
            </button>
          );
        })}
      </div>

      {/* Progress */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          padding: '10px 14px',
          background: '#12122a',
          borderRadius: '10px',
          border: '1px solid #2a2a4a',
        }}
      >
        <span style={{ fontSize: '0.85rem', color: '#999' }}>
          {tab === 'items' ? '발견한 아이템' : '조우한 몬스터'}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '80px',
              height: '6px',
              background: 'rgba(255,255,255,0.08)',
              borderRadius: '3px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${currentList.length > 0 ? (discoveredCount / currentList.length) * 100 : 0}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #7c3aed, #a78bfa)',
                borderRadius: '3px',
                transition: 'width 0.5s ease',
              }}
            />
          </div>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#c4b5fd' }}>
            {discoveredCount}/{currentList.length}
          </span>
        </div>
      </div>

      {/* Grid */}
      {currentList.length === 0 ? (
        <div style={{ color: '#555', padding: '60px 0', textAlign: 'center' }}>
          {tab === 'items' ? '등록된 아이템이 없습니다.' : '등록된 몬스터가 없습니다.'}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: '10px',
          }}
        >
          {tab === 'items'
            ? items.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))
            : monsters.map((monster) => (
                <MonsterCard key={monster.id} monster={monster} />
              ))}
        </div>
      )}
    </div>
  );
}

function ItemCard({ item }: { item: CodexItem }) {
  const discovered = item.discovered;

  return (
    <Link
      href={`/codex/items/${item.id}`}
      style={{ textDecoration: 'none' }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        <div
          style={{
            width: '100%',
            aspectRatio: '1 / 1',
            borderRadius: '12px',
            border: discovered
              ? `1px solid ${RARITY_COLORS[item.rarity]}33`
              : '1px solid #3b3f5c',
            overflow: 'hidden',
            background: discovered ? '#111233' : 'linear-gradient(180deg, #171a2f 0%, #111322 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            boxShadow: discovered ? 'none' : 'inset 0 0 0 1px rgba(124,58,237,0.08)',
            filter: discovered ? 'none' : 'grayscale(0.7) brightness(0.55)',
          }}
        >
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={discovered ? item.name : '???'}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span
              style={{
                fontSize: discovered ? '10px' : '22px',
                color: discovered ? '#444' : '#c7d2fe',
                fontWeight: discovered ? 500 : 800,
                textShadow: discovered ? 'none' : '0 0 10px rgba(167,139,250,0.45)',
                lineHeight: 1,
              }}
            >
              {discovered ? 'NO IMG' : '?'}
            </span>
          )}
          {discovered && (
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '3px',
                background: RARITY_COLORS[item.rarity],
                opacity: 0.7,
              }}
            />
          )}
        </div>
        <span
          style={{
            fontSize: '0.7rem',
            fontWeight: 600,
            color: discovered ? RARITY_COLORS[item.rarity] : '#6f76a0',
            textAlign: 'center',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            width: '100%',
          }}
        >
          {discovered ? item.name : '???'}
        </span>
      </div>
    </Link>
  );
}

function MonsterCard({ monster }: { monster: CodexMonster }) {
  const encountered = monster.encountered;

  return (
    <Link
      href={`/codex/monsters/${monster.id}`}
      style={{ textDecoration: 'none' }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        <div
          style={{
            width: '100%',
            aspectRatio: '1 / 1',
            borderRadius: '12px',
            border: encountered ? '1px solid rgba(239,68,68,0.3)' : '1px solid #3b3f5c',
            overflow: 'hidden',
            background: encountered ? '#1a0f0f' : 'linear-gradient(180deg, #171a2f 0%, #111322 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            boxShadow: encountered ? 'none' : 'inset 0 0 0 1px rgba(124,58,237,0.08)',
            filter: encountered ? 'none' : 'grayscale(0.7) brightness(0.55)',
          }}
        >
          {monster.imageUrl ? (
            <img
              src={monster.imageUrl}
              alt={encountered ? monster.name : '???'}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span
              style={{
                fontSize: encountered ? '10px' : '22px',
                color: encountered ? '#444' : '#c7d2fe',
                fontWeight: encountered ? 500 : 800,
                textShadow: encountered ? 'none' : '0 0 10px rgba(167,139,250,0.45)',
                lineHeight: 1,
              }}
            >
              {encountered ? 'NO IMG' : '?'}
            </span>
          )}
        </div>
        <span
          style={{
            fontSize: '0.7rem',
            fontWeight: 600,
            color: encountered ? '#ef4444' : '#6f76a0',
            textAlign: 'center',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            width: '100%',
          }}
        >
          {encountered ? monster.name : '???'}
        </span>
      </div>
    </Link>
  );
}
