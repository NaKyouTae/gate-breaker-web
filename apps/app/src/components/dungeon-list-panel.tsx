'use client';

import type { Dungeon } from '@gate-breaker/types';
import { getStoneForDungeonIndex } from '@/lib/enhance-stone';

export interface OngoingBattleInfo {
  dungeonId: string;
  dungeonName: string;
  monsterName: string;
  currentMonsterNum?: number;
  totalMonsters?: number;
  isBoss?: boolean;
}

interface DungeonListPanelProps {
  dungeons: Dungeon[];
  userLevel: number;
  enteringId: string | null;
  ongoingBattle?: OngoingBattleInfo | null;
  onEnterDungeon: (dungeonId: string) => void;
  onResumeBattle?: () => void;
}

export function DungeonListPanel({
  dungeons,
  userLevel,
  enteringId,
  ongoingBattle = null,
  onEnterDungeon,
  onResumeBattle,
}: DungeonListPanelProps) {
  if (dungeons.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', color: '#666', fontSize: '14px' }}>
        등록된 던전이 없습니다.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {ongoingBattle && onResumeBattle && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(58, 36, 110, 0.92), rgba(17, 24, 39, 0.95))',
            border: '1px solid rgba(167, 139, 250, 0.35)',
            borderRadius: '12px',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            marginBottom: '4px',
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
            onClick={onResumeBattle}
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

      {dungeons.map((d, dungeonIndex) => {
        const canEnter = true;
        const isEntering = enteringId === d.id;
        const stoneConfig = getStoneForDungeonIndex(dungeonIndex);

        return (
          <div
            key={d.id}
            role={canEnter ? 'button' : undefined}
            tabIndex={canEnter ? 0 : -1}
            onClick={() => {
              if (!canEnter || enteringId !== null) return;
              onEnterDungeon(d.id);
            }}
            onKeyDown={(e) => {
              if (!canEnter || enteringId !== null) return;
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onEnterDungeon(d.id);
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
                  적정 레벨 Lv.{d.minLevel} ~ {d.maxLevel}
                </span>
              </div>
              <span style={{ fontSize: '12px', color: isEntering ? '#f8fafc' : '#a78bfa', fontWeight: 700 }}>
                {isEntering ? '입장 중...' : '입장 가능'}
              </span>
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

            {stoneConfig && (
              <div style={{
                marginTop: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
              }}>
                <span style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '4px',
                  background: `radial-gradient(circle, ${stoneConfig.glow}, transparent)`,
                  border: `1px solid ${stoneConfig.color}`,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  flexShrink: 0,
                }}>
                  💎
                </span>
                <span style={{ color: stoneConfig.color, fontWeight: 700 }}>
                  {stoneConfig.name}
                </span>
                <span style={{ color: '#666', fontSize: '11px' }}>
                  (성공률 +{stoneConfig.bonusRate}%)
                </span>
              </div>
            )}

            {d.monsters && d.monsters.length > 0 && (
              <div style={{ marginTop: '10px', borderTop: '1px solid rgba(148,163,184,0.15)', paddingTop: '10px' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '6px', fontWeight: 600 }}>
                  출현 몬스터
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {[...d.monsters].sort((a, b) => a.sortOrder - b.sortOrder).map((m) => (
                    <div
                      key={m.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        width: '48px',
                      }}
                    >
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          background: 'rgba(79, 70, 229, 0.18)',
                          border: '1px solid rgba(129, 140, 248, 0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                        }}
                      >
                        {m.imageUrl ? (
                          <img
                            src={m.imageUrl}
                            alt={m.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <span style={{ fontSize: '16px' }}>👹</span>
                        )}
                      </div>
                      <span
                        style={{
                          fontSize: '10px',
                          color: '#c4b5fd',
                          textAlign: 'center',
                          lineHeight: '1.2',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          width: '100%',
                        }}
                      >
                        {m.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
