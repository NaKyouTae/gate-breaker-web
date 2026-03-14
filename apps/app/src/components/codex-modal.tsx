'use client';

import { useEffect, useState, useCallback } from 'react';
import { codex } from '@gate-breaker/api-client';
import { Spinner, useToast, ModalOverlay, ModalFrame, ModalHeader, ModalHeaderButton } from '@gate-breaker/ui';
import { useAuth } from '@/context/auth-context';
import { useCodexModal } from '@/context/codex-modal-context';
import type { CodexItem, CodexMonster, CodexItemDetail, CodexMonsterDetail, ItemRarity, ItemType } from '@gate-breaker/types';

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

export function CodexModal() {
  const { isOpen, view, close, goToItem, goToMonster, goToList } = useCodexModal();

  if (!isOpen) return null;

  const headerTitle = view.type === 'list' ? '도감' : view.type === 'item' ? '아이템 상세' : '몬스터 상세';

  return (
    <ModalOverlay onClick={close}>
      <ModalFrame
        maxWidth="480px"
        maxHeight="85dvh"
        style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      >
        <ModalHeader
          title={headerTitle}
          onClose={close}
          extra={view.type !== 'list' ? <ModalHeaderButton onClick={goToList}>목록</ModalHeaderButton> : undefined}
        />

        {/* Content */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {view.type === 'list' && <CodexListView onItemClick={goToItem} onMonsterClick={goToMonster} />}
          {view.type !== 'list' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 24px' }}>
              {view.type === 'item' && <CodexItemDetailView id={view.id} onMonsterClick={goToMonster} />}
              {view.type === 'monster' && <CodexMonsterDetailView id={view.id} onItemClick={goToItem} />}
            </div>
          )}
        </div>
      </ModalFrame>
    </ModalOverlay>
  );
}

// ===== List View =====
function CodexListView({
  onItemClick,
  onMonsterClick,
}: {
  onItemClick: (id: string) => void;
  onMonsterClick: (id: string) => void;
}) {
  const { isAuthenticated } = useAuth();
  const { addToast } = useToast();

  const [tab, setTab] = useState<'items' | 'monsters'>('items');
  const [items, setItems] = useState<CodexItem[]>([]);
  const [monsters, setMonsters] = useState<CodexMonster[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [itemList, monsterList] = await Promise.all([codex.items(), codex.monsters()]);
      setItems(itemList);
      setMonsters(monsterList);
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : '도감 정보를 불러올 수 없습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (isAuthenticated) fetchData();
  }, [isAuthenticated, fetchData]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
        <Spinner size="lg" />
      </div>
    );
  }

  const currentList = tab === 'items' ? items : monsters;
  const discoveredCount = tab === 'items'
    ? items.filter((i) => i.discovered).length
    : monsters.filter((m) => m.encountered).length;

  return (
    <>
      {/* Fixed header: tabs + progress */}
      <div style={{ padding: '10px 16px 0', flexShrink: 0 }}>
        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          {(['items', 'monsters'] as const).map((t) => {
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
            marginBottom: '12px',
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
      </div>

      {/* Scrollable grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 24px' }}>
      {currentList.length === 0 ? (
        <div style={{ color: '#555', padding: '60px 0', textAlign: 'center' }}>
          {tab === 'items' ? '등록된 아이템이 없습니다.' : '등록된 몬스터가 없습니다.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '10px' }}>
          {tab === 'items'
            ? items.map((item) => (
                <ItemCard key={item.id} item={item} onClick={() => onItemClick(item.id)} />
              ))
            : monsters.map((monster) => (
                <MonsterCard key={monster.id} monster={monster} onClick={() => onMonsterClick(monster.id)} />
              ))}
        </div>
      )}
      </div>
    </>
  );
}

function ItemCard({ item, onClick }: { item: CodexItem; onClick: () => void }) {
  const discovered = item.discovered;

  return (
    <div onClick={onClick} style={{ cursor: 'pointer' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
        <div
          style={{
            width: '100%',
            aspectRatio: '1 / 1',
            borderRadius: '12px',
            border: discovered ? `1px solid ${RARITY_COLORS[item.rarity]}33` : '1px solid #3b3f5c',
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
            <img src={item.imageUrl} alt={discovered ? item.name : '???'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: discovered ? '10px' : '22px', color: discovered ? '#444' : '#c7d2fe', fontWeight: discovered ? 500 : 800, textShadow: discovered ? 'none' : '0 0 10px rgba(167,139,250,0.45)', lineHeight: 1 }}>
              {discovered ? 'NO IMG' : '?'}
            </span>
          )}
          {discovered && (
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', background: RARITY_COLORS[item.rarity], opacity: 0.7 }} />
          )}
        </div>
        <span style={{ fontSize: '0.7rem', fontWeight: 600, color: discovered ? RARITY_COLORS[item.rarity] : '#6f76a0', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
          {discovered ? item.name : '???'}
        </span>
      </div>
    </div>
  );
}

function MonsterCard({ monster, onClick }: { monster: CodexMonster; onClick: () => void }) {
  const encountered = monster.encountered;

  return (
    <div onClick={onClick} style={{ cursor: 'pointer' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
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
            <img src={monster.imageUrl} alt={encountered ? monster.name : '???'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: encountered ? '10px' : '22px', color: encountered ? '#444' : '#c7d2fe', fontWeight: encountered ? 500 : 800, textShadow: encountered ? 'none' : '0 0 10px rgba(167,139,250,0.45)', lineHeight: 1 }}>
              {encountered ? 'NO IMG' : '?'}
            </span>
          )}
        </div>
        <span style={{ fontSize: '0.7rem', fontWeight: 600, color: encountered ? '#ef4444' : '#6f76a0', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
          {encountered ? monster.name : '???'}
        </span>
      </div>
    </div>
  );
}

// ===== Item Detail View =====
function CodexItemDetailView({ id, onMonsterClick }: { id: string; onMonsterClick: (id: string) => void }) {
  const { addToast } = useToast();
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
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (!item) {
    return <div style={{ textAlign: 'center', color: '#555', padding: '40px 0' }}>아이템을 찾을 수 없습니다.</div>;
  }

  const rarityColor = RARITY_COLORS[item.rarity];

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto' }}>
      {/* Item header */}
      <div style={{ background: '#12122a', borderRadius: '16px', border: `1px solid ${rarityColor}33`, padding: '20px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <div style={{ width: 88, height: 88, borderRadius: '12px', border: `1px solid ${rarityColor}44`, overflow: 'hidden', background: '#0a0a15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, filter: item.discovered ? 'none' : 'grayscale(1) brightness(0.3)' }}>
            {item.imageUrl ? (
              <img src={item.imageUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: '12px', color: '#444' }}>NO IMG</span>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: item.discovered ? rarityColor : '#555', marginBottom: '6px' }}>
              {item.discovered ? item.name : '???'}
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
              <span style={{ padding: '2px 8px', borderRadius: '6px', background: `${rarityColor}20`, color: rarityColor, fontSize: '0.75rem', fontWeight: 700 }}>
                {RARITY_LABELS[item.rarity]}
              </span>
              <span style={{ padding: '2px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', color: '#999', fontSize: '0.75rem', fontWeight: 600 }}>
                {TYPE_LABELS[item.type]}
              </span>
            </div>
            {!item.discovered && (
              <span style={{ fontSize: '0.8rem', color: '#555', fontStyle: 'italic' }}>아직 발견하지 못한 아이템</span>
            )}
          </div>
        </div>
        {item.discovered && item.description && (
          <div style={{ marginTop: '14px', padding: '10px 12px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', fontSize: '0.85rem', color: '#aaa', lineHeight: 1.5 }}>
            {item.description}
          </div>
        )}
      </div>

      {/* Stats */}
      {item.discovered && (item.baseAttack > 0 || item.baseDefense > 0 || item.baseHp > 0) && (
        <div style={{ background: '#12122a', borderRadius: '12px', border: '1px solid #2a2a4a', padding: '14px', marginBottom: '12px' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#777', marginBottom: '10px' }}>기본 스탯</div>
          <div style={{ display: 'flex', gap: '16px' }}>
            {item.baseAttack > 0 && <StatBox label="ATK" value={String(item.baseAttack)} color="#e94560" />}
            {item.baseDefense > 0 && <StatBox label="DEF" value={String(item.baseDefense)} color="#4a9eff" />}
            {item.baseHp > 0 && <StatBox label="HP" value={String(item.baseHp)} color="#2ecc71" />}
          </div>
        </div>
      )}

      {/* Price info */}
      {item.discovered && (
        <div style={{ background: '#12122a', borderRadius: '12px', border: '1px solid #2a2a4a', padding: '14px', marginBottom: '12px' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#777', marginBottom: '10px' }}>가격 정보</div>
          <div style={{ display: 'flex', gap: '20px' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '2px' }}>판매가</div>
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fbbf24' }}>{item.sellPrice.toLocaleString()} G</span>
            </div>
            {item.shopAvailable && item.buyPrice != null && (
              <div>
                <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '2px' }}>상점 구매가</div>
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fbbf24' }}>{item.buyPrice.toLocaleString()} G</span>
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
        <div style={{ background: '#12122a', borderRadius: '12px', border: '1px solid #2a2a4a', padding: '14px' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#777', marginBottom: '10px' }}>드롭 위치</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {item.dropSources.map((source) => (
              <div
                key={source.monsterId}
                onClick={() => onMonsterClick(source.monsterId)}
                style={{ cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ddd' }}>{source.monsterName}</div>
                    <div style={{ fontSize: '0.75rem', color: '#666' }}>{source.dungeonName}</div>
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#a78bfa' }}>{(source.dropRate * 100).toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Monster Detail View =====
function CodexMonsterDetailView({ id, onItemClick }: { id: string; onItemClick: (id: string) => void }) {
  const { addToast } = useToast();
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
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (!monster) {
    return <div style={{ textAlign: 'center', color: '#555', padding: '40px 0' }}>몬스터를 찾을 수 없습니다.</div>;
  }

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto' }}>
      {/* Monster header */}
      <div style={{ background: '#1a0f0f', borderRadius: '16px', border: '1px solid rgba(239,68,68,0.2)', padding: '20px', marginBottom: '12px' }}>
        <div style={{ width: '100%', aspectRatio: '16 / 9', borderRadius: '12px', overflow: 'hidden', background: '#0a0a12', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', border: '1px solid rgba(239,68,68,0.15)', filter: monster.encountered ? 'none' : 'grayscale(1) brightness(0.2)' }}>
          {monster.imageUrl ? (
            <img src={monster.imageUrl} alt={monster.encountered ? monster.name : '???'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: '14px', color: '#444' }}>{monster.encountered ? 'NO IMG' : '?'}</span>
          )}
        </div>
        <div style={{ fontSize: '1.2rem', fontWeight: 700, color: monster.encountered ? '#ef4444' : '#555', marginBottom: '6px' }}>
          {monster.encountered ? monster.name : '???'}
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ padding: '2px 8px', borderRadius: '6px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '0.75rem', fontWeight: 700 }}>
            {monster.dungeon.name}
          </span>
          <span style={{ fontSize: '0.75rem', color: '#666' }}>
            Lv.{monster.dungeon.minLevel}~{monster.dungeon.maxLevel}
          </span>
        </div>
        {!monster.encountered && (
          <div style={{ marginTop: '8px', fontSize: '0.8rem', color: '#555', fontStyle: 'italic' }}>아직 조우하지 못한 몬스터</div>
        )}
      </div>

      {/* Stats */}
      {monster.encountered && (
        <div style={{ background: '#12122a', borderRadius: '12px', border: '1px solid #2a2a4a', padding: '14px', marginBottom: '12px' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#777', marginBottom: '10px' }}>능력치</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            <StatBox label="HP" value={monster.hp.toLocaleString()} color="#2ecc71" />
            <StatBox label="ATK" value={String(monster.attack)} color="#e94560" />
            <StatBox label="DEF" value={String(monster.defense)} color="#4a9eff" />
          </div>
        </div>
      )}

      {/* Rewards */}
      {monster.encountered && (
        <div style={{ background: '#12122a', borderRadius: '12px', border: '1px solid #2a2a4a', padding: '14px', marginBottom: '12px' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#777', marginBottom: '10px' }}>처치 보상</div>
          <div style={{ display: 'flex', gap: '20px' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '2px' }}>경험치</div>
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#4ade80' }}>+{monster.expReward.toLocaleString()} EXP</span>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '2px' }}>골드</div>
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fbbf24' }}>+{monster.goldReward.toLocaleString()} G</span>
            </div>
          </div>
        </div>
      )}

      {/* Drop items */}
      {monster.encountered && monster.drops.length > 0 && (
        <div style={{ background: '#12122a', borderRadius: '12px', border: '1px solid #2a2a4a', padding: '14px' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#777', marginBottom: '10px' }}>드롭 아이템</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {monster.drops.map((drop) => (
              <div
                key={drop.itemId}
                onClick={() => onItemClick(drop.itemId)}
                style={{ cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '8px', border: `1px solid ${RARITY_COLORS[drop.itemRarity]}33`, overflow: 'hidden', background: '#0a0a15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {drop.itemImageUrl ? (
                      <img src={drop.itemImageUrl} alt={drop.itemName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: '8px', color: '#444' }}>IMG</span>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: RARITY_COLORS[drop.itemRarity] }}>{drop.itemName}</div>
                  </div>
                  <div style={{ padding: '3px 8px', borderRadius: '6px', background: 'rgba(167,139,250,0.1)', fontSize: '0.8rem', fontWeight: 700, color: '#a78bfa' }}>
                    {(drop.dropRate * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ flex: 1, padding: '8px', background: `${color}10`, borderRadius: '8px', textAlign: 'center' }}>
      <div style={{ fontSize: '0.7rem', color: '#666', marginBottom: '2px' }}>{label}</div>
      <div style={{ fontSize: '1rem', fontWeight: 700, color }}>{value}</div>
    </div>
  );
}
