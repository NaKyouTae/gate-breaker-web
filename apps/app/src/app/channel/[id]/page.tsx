'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { channel } from '@gate-breaker/api-client';
import type { Channel, ChatMessage, Dungeon } from '@gate-breaker/types';
import { Badge, Button, Input, Modal, Spinner, useToast } from '@gate-breaker/ui';
import { useAuth } from '@/context/auth-context';
import { useSocket } from '@/hooks/use-socket';
import { EnhanceEffect, type EnhanceEffectType } from '@/components/enhance-effect';

interface EnhanceListItem {
  inventoryId: string;
  itemName: string;
  itemType: string;
  rarity: string;
  enhanceLevel: number;
  isEquipped: boolean;
}

interface SystemMessage {
  channelId: string;
  userId: string;
  nickname: string;
  message: string;
  timestamp: number;
  type: 'enhance' | 'dungeon-invite' | 'dungeon-start';
  data: Record<string, unknown>;
}

type ChatEntry =
  | (ChatMessage & { kind: 'chat' })
  | (SystemMessage & { kind: 'system' });

const SLASH_COMMANDS = [
  { command: '/강화', description: '장비 강화 시도' },
  { command: '/던전입장', description: '던전 초대 생성' },
];

const RARITY_COLORS: Record<string, string> = {
  COMMON: '#888',
  RARE: '#4a9eff',
  EPIC: '#b048f8',
  LEGENDARY: '#ff8c00',
  MYTHIC: '#ff2d55',
};
const ITEM_TYPE_ICONS: Record<string, string> = {
  WEAPON: '⚔️',
  ARMOR: '🛡️',
  GLOVE: '🧤',
  SHOE: '👢',
  RING: '💍',
  NECKLACE: '📿',
  MATERIAL: '🧱',
  CONSUMABLE: '🧪',
};

const MAX_CHANNEL_ENTRIES = 50;

function formatChatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const yy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${yy}-${mm}-${dd} ${hh}:${min}`;
}

export default function ChannelDetailPage() {
  const params = useParams();
  const router = useRouter();
  const channelId = params.id as string;
  const socketRef = useSocket('/channel');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { user, isLoading: authLoading, isAuthenticated, refreshUser } = useAuth();
  const { addToast } = useToast();

  const [channelInfo, setChannelInfo] = useState<Channel | null>(null);
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Slash command state (unused, kept for reference)
  const [showCommands, setShowCommands] = useState(false);

  // Enhance state
  const [enhancePickerOpen, setEnhancePickerOpen] = useState(false);
  const [enhanceItems, setEnhanceItems] = useState<EnhanceListItem[]>([]);
  const [enhanceLoading, setEnhanceLoading] = useState(false);
  const [effectType, setEffectType] = useState<EnhanceEffectType | null>(null);
  const [pendingEnhanceEntries, setPendingEnhanceEntries] = useState<
    (SystemMessage & { kind: 'system' })[]
  >([]);

  // Dungeon state
  const [dungeonPickerOpen, setDungeonPickerOpen] = useState(false);
  const [dungeons, setDungeons] = useState<Dungeon[]>([]);
  const [dungeonLoading, setDungeonLoading] = useState(false);

  const refreshPageData = useCallback(async () => {
    try {
      const [c, logs] = await Promise.all([channel.get(channelId), channel.chat(channelId)]);
      setChannelInfo(c);
      setEntries(
        logs.map((m) => {
          if (m.type && m.data) {
            return {
              kind: 'system' as const,
              channelId,
              userId: m.userId,
              nickname: m.nickname,
              message: m.message,
              timestamp: Number(m.timestamp),
              type: m.type,
              data: m.data,
            };
          }

          return {
            kind: 'chat' as const,
            userId: m.userId,
            nickname: m.nickname,
            message: m.message,
            timestamp: Number(m.timestamp),
          };
        }),
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : '채널 정보를 불러오지 못했습니다.';
      addToast(msg, 'error');
      router.replace('/channel');
    } finally {
      setLoading(false);
    }
  }, [addToast, channelId, router]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
      return;
    }

    if (isAuthenticated) {
      refreshPageData();
    }
  }, [authLoading, isAuthenticated, refreshPageData, router]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !channelId) return;

    socket.emit('channel:join', { channelId });

    const onChat = (payload: { channelId: string } & ChatMessage) => {
      if (payload.channelId !== channelId) return;
      setEntries((prev) => [
        ...prev,
        {
          kind: 'chat' as const,
          userId: payload.userId,
          nickname: payload.nickname,
          message: payload.message,
          timestamp: Number(payload.timestamp),
        },
      ].slice(-MAX_CHANNEL_ENTRIES));
    };

    const onSystem = (payload: SystemMessage) => {
      if (payload.channelId !== channelId) return;

      // For my enhance result, wait until animation ends before appending system chat.
      if (payload.type === 'enhance' && payload.userId === user?.id) {
        setPendingEnhanceEntries((prev) => [
          ...prev,
          { ...payload, kind: 'system' as const },
        ]);
        return;
      }

      setEntries((prev) => [...prev, { ...payload, kind: 'system' as const }].slice(-MAX_CHANNEL_ENTRIES));
    };

    const onMemberChanged = (payload: { channelId: string }) => {
      if (payload.channelId !== channelId) return;
      refreshPageData();
    };

    const onError = (payload: { message?: string }) => {
      if (payload?.message) addToast(payload.message, 'error');
    };

    socket.on('channel:chat', onChat);
    socket.on('channel:system', onSystem);
    socket.on('channel:member-joined', onMemberChanged);
    socket.on('channel:member-left', onMemberChanged);
    socket.on('channel:error', onError);

    return () => {
      socket.emit('channel:leave', { channelId });
      socket.off('channel:chat', onChat);
      socket.off('channel:system', onSystem);
      socket.off('channel:member-joined', onMemberChanged);
      socket.off('channel:member-left', onMemberChanged);
      socket.off('channel:error', onError);
    };
  }, [addToast, channelId, refreshPageData, socketRef, user?.id]);

  // Prevent page-level scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const main = document.querySelector('main') as HTMLElement | null;
    if (main) main.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
      if (main) main.style.overflow = '';
    };
  }, []);

  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => Number(a.timestamp) - Number(b.timestamp)),
    [entries],
  );
  const memberLevelMap = useMemo(
    () =>
      new Map(
        (channelInfo?.members ?? []).map((m) => [
          m.userId,
          { nickname: m.user?.nickname ?? m.userId.slice(0, 8), level: m.user?.level ?? null },
        ]),
      ),
    [channelInfo?.members],
  );

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sortedEntries]);

  // Command suggestions
  useEffect(() => {
    if (effectType || pendingEnhanceEntries.length === 0) return;

    const next = pendingEnhanceEntries[0];
    const success = Boolean(next.data.success);
    setEffectType(success ? 'success' : 'failure');
  }, [effectType, pendingEnhanceEntries]);

  const filteredCommands = useMemo(() => {
    if (!message.startsWith('/')) return [];
    return SLASH_COMMANDS.filter((c) => c.command.startsWith(message));
  }, [message]);

  useEffect(() => {
    setShowCommands(message.startsWith('/') && filteredCommands.length > 0);
  }, [message, filteredCommands]);

  const handleSend = async () => {
    const value = message.trim();
    if (!value) return;

    // Handle slash commands
    if (value === '/강화') {
      setMessage('');
      openEnhancePicker();
      return;
    }
    if (value === '/던전입장') {
      setMessage('');
      openDungeonPicker();
      return;
    }

    setSending(true);
    try {
      const socket = socketRef.current;
      if (socket?.connected) {
        socket.emit('channel:chat', { channelId, message: value });
      } else {
        addToast('소켓 연결이 불안정합니다. 잠시 후 다시 시도해주세요.', 'warning');
      }
      setMessage('');
    } finally {
      setSending(false);
    }
  };

  const handleSelectCommand = (cmd: string) => {
    setMessage(cmd);
    setShowCommands(false);
    // Auto-execute
    if (cmd === '/강화') {
      setMessage('');
      openEnhancePicker();
    } else if (cmd === '/던전입장') {
      setMessage('');
      openDungeonPicker();
    }
  };

  // ── Enhance ──
  const openEnhancePicker = () => {
    const socket = socketRef.current;
    if (!socket?.connected) {
      addToast('소켓 연결이 불안정합니다.', 'warning');
      return;
    }

    setEnhanceLoading(true);
    setEnhancePickerOpen(true);

    const onList = (items: EnhanceListItem[]) => {
      setEnhanceItems(items);
      setEnhanceLoading(false);
    };
    socket.once('channel:enhance-list', onList);
    socket.emit('channel:enhance-list');
  };

  const handleEnhanceItem = (inventoryId: string) => {
    const socket = socketRef.current;
    if (!socket?.connected) return;

    setEnhancePickerOpen(false);
    socket.emit('channel:enhance', { channelId, inventoryId });
  };

  const handleEffectComplete = () => {
    setEffectType(null);
    setPendingEnhanceEntries((prev) => {
      if (prev.length === 0) return prev;
      const [done, ...rest] = prev;
      setEntries((entryPrev) => [...entryPrev, done].slice(-MAX_CHANNEL_ENTRIES));
      return rest;
    });
    refreshUser();
  };

  // ── Dungeon ──
  const openDungeonPicker = () => {
    const socket = socketRef.current;
    if (!socket?.connected) {
      addToast('소켓 연결이 불안정합니다.', 'warning');
      return;
    }

    setDungeonLoading(true);
    setDungeonPickerOpen(true);

    const onList = (list: Dungeon[]) => {
      setDungeons(list);
      setDungeonLoading(false);
    };
    socket.once('channel:dungeon-list', onList);
    socket.emit('channel:dungeon-list');
  };

  const handleSelectDungeon = (dungeonId: string) => {
    const socket = socketRef.current;
    if (!socket?.connected) return;

    setDungeonPickerOpen(false);
    socket.emit('channel:dungeon-invite', { channelId, dungeonId });
  };

  const handleLeave = async () => {
    setLeaving(true);
    try {
      await channel.leave(channelId);
      addToast('채널에서 나갔습니다.', 'success');
      router.push('/channel');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '채널 퇴장에 실패했습니다.';
      addToast(msg, 'error');
    } finally {
      setLeaving(false);
    }
  };

  if (authLoading || loading || !channelInfo) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '16px 12px 0', display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 130px)', overflow: 'hidden', position: 'relative' }}>
      {/* Enhance effect overlay */}
      {effectType && (
        <EnhanceEffect type={effectType} onComplete={handleEffectComplete} />
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: '1.3rem', color: '#eee', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{channelInfo.name}</h1>
          <span style={{ color: '#888', fontSize: 13, flexShrink: 0 }}>{channelInfo.members.length}/{channelInfo.maxMembers}</span>
        </div>
        <button
          onClick={() => setSettingsOpen(true)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 6,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#2a2a4a'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
          aria-label="채널 설정"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>

      {/* Chat area */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: '#1a1a2e',
        border: '1px solid #2a2a4a',
        borderRadius: 10,
        overflow: 'hidden',
        minHeight: 0,
      }}>
        <div className="chat-scroll" style={{
          flex: 1,
          overflowY: 'auto',
          padding: 12,
          minHeight: 0,
        }}>
          {sortedEntries.length === 0 ? (
            <div style={{ color: '#666', textAlign: 'center', paddingTop: 30 }}>아직 채팅이 없습니다.</div>
          ) : (
            sortedEntries.map((entry, idx) => {
              const timeText = formatChatTime(Number(entry.timestamp));
              if (entry.kind === 'system') {
                const mineSystem = entry.userId === user?.id;
                return (
                  <div
                    key={`sys-${entry.timestamp}-${idx}`}
                    style={{
                      marginBottom: 6,
                      display: 'flex',
                      justifyContent: mineSystem ? 'flex-end' : 'flex-start',
                      paddingLeft: mineSystem ? 72 : 0,
                      paddingRight: mineSystem ? 0 : 72,
                    }}
                  >
                    <div style={{ maxWidth: '86%' }}>
                      <SystemMessageBubble msg={entry} />
                      <div style={{ marginTop: 4, textAlign: 'right', color: '#666', fontSize: 10 }}>
                        {timeText}
                      </div>
                    </div>
                  </div>
                );
              }
              const mine = entry.userId === user?.id;
              const prev = idx > 0 ? sortedEntries[idx - 1] : null;
              const showSender =
                !mine &&
                (!prev || prev.kind !== 'chat' || prev.userId !== entry.userId);
              const sender = memberLevelMap.get(entry.userId);

              return (
                <div
                  key={`${entry.userId}-${entry.timestamp}-${idx}`}
                  style={{
                    marginBottom: 6,
                    display: 'flex',
                    justifyContent: mine ? 'flex-end' : 'flex-start',
                    paddingLeft: mine ? 72 : 0,
                    paddingRight: mine ? 0 : 72,
                  }}
                >
                  {mine ? (
                    <div style={{ maxWidth: '76%' }}>
                      <div
                        style={{
                          background: '#3d2566',
                          color: '#eee',
                          borderRadius: 12,
                          padding: '7px 10px',
                          wordBreak: 'break-word',
                          fontSize: 13,
                          lineHeight: 1.35,
                        }}
                      >
                        {entry.message}
                      </div>
                      <div style={{ marginTop: 4, textAlign: 'right', color: '#666', fontSize: 10 }}>
                        {timeText}
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, maxWidth: '86%' }}>
                      <div style={{ width: 28, flexShrink: 0 }}>
                        {showSender ? (
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: '50%',
                              background: '#2a2a4a',
                              border: '1px solid #3a3a5a',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 12,
                              fontWeight: 700,
                              color: '#ddd',
                            }}
                          >
                            {(sender?.nickname ?? entry.nickname).slice(0, 1)}
                          </div>
                        ) : null}
                      </div>

                      <div style={{ minWidth: 0 }}>
                        {showSender && (
                          <div style={{ color: '#b8b8c8', fontSize: 11, marginBottom: 2 }}>
                            {sender?.nickname ?? entry.nickname}
                            {sender?.level ? ` · Lv.${sender.level}` : ''}
                          </div>
                        )}
                        <div
                          style={{
                            display: 'inline-block',
                            background: '#0f0f17',
                            color: '#eee',
                            borderRadius: 12,
                            border: '1px solid #2a2a4a',
                            padding: '7px 10px',
                            wordBreak: 'break-word',
                            fontSize: 13,
                            lineHeight: 1.35,
                          }}
                        >
                          {entry.message}
                        </div>
                        <div style={{ marginTop: 4, textAlign: 'right', color: '#666', fontSize: 10 }}>
                          {timeText}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Command buttons */}
        <div style={{ display: 'flex', gap: 8, padding: '8px 12px', borderTop: '1px solid #2a2a4a', flexShrink: 0 }}>
          {SLASH_COMMANDS.map((cmd) => (
            <button
              key={cmd.command}
              onClick={() => handleSelectCommand(cmd.command)}
              style={{
                background: '#2a2a4a',
                border: '1px solid #3a3a5a',
                borderRadius: 20,
                padding: '6px 14px',
                color: '#a78bfa',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'background 0.15s, border-color 0.15s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#3a3a5a'; (e.currentTarget as HTMLElement).style.borderColor = '#7c3aed'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#2a2a4a'; (e.currentTarget as HTMLElement).style.borderColor = '#3a3a5a'; }}
            >
              {cmd.command.replace('/', '')}
            </button>
          ))}
        </div>

        {/* Chat input */}
        <div style={{ display: 'flex', gap: 8, padding: '10px 12px', borderTop: '1px solid #2a2a4a', flexShrink: 0 }}>
          <Input
            placeholder="메시지를 입력하세요"
            value={message}
            maxLength={200}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button
            onClick={handleSend}
            disabled={sending}
            style={{
              background: '#7c3aed',
              border: 'none',
              borderRadius: 8,
              padding: '8px 12px',
              cursor: sending ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              opacity: sending ? 0.5 : 1,
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => { if (!sending) (e.currentTarget as HTMLElement).style.background = '#6d28d9'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#7c3aed'; }}
            aria-label="전송"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>

      {/* Enhance floating picker */}
      {enhancePickerOpen && (
        <div
          onClick={() => setEnhancePickerOpen(false)}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.24)',
            zIndex: 30,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              left: 10,
              right: 10,
              bottom: 112,
              background: '#14142a',
              border: '1px solid #30305a',
              borderRadius: 14,
              boxShadow: '0 12px 30px rgba(0,0,0,0.45)',
              padding: '10px',
              maxHeight: '50dvh',
              overflowY: 'auto',
            }}
          >
            <div style={{ color: '#c9c9df', fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
              강화할 장비 선택
            </div>

            {enhanceLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
                <Spinner />
              </div>
            ) : enhanceItems.length === 0 ? (
              <div style={{ color: '#666', textAlign: 'center', padding: '22px 0' }}>
                강화 가능한 장비가 없습니다.
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: 8,
                }}
              >
                {enhanceItems.map((item) => (
                  <button
                    key={item.inventoryId}
                    onClick={() => handleEnhanceItem(item.inventoryId)}
                    style={{
                      border: '1px solid #33385f',
                      background: '#0f1022',
                      borderRadius: 10,
                      cursor: 'pointer',
                      color: '#eee',
                      padding: 8,
                      textAlign: 'left',
                      transition: 'border-color 0.15s, transform 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = '#7c3aed';
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = '#33385f';
                      (e.currentTarget as HTMLElement).style.transform = 'none';
                    }}
                  >
                    <div
                      style={{
                        position: 'relative',
                        width: '100%',
                        aspectRatio: '1 / 1',
                        borderRadius: 8,
                        border: `1px solid ${(RARITY_COLORS[item.rarity] ?? '#666')}66`,
                        background: 'linear-gradient(180deg, #1c1f3e, #14162b)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 6,
                      }}
                    >
                      <span style={{ fontSize: 26 }}>{ITEM_TYPE_ICONS[item.itemType] ?? '🧩'}</span>
                      <span
                        style={{
                          position: 'absolute',
                          top: 5,
                          right: 5,
                          padding: '2px 5px',
                          borderRadius: 6,
                          background: 'rgba(0,0,0,0.6)',
                          border: '1px solid rgba(255,255,255,0.18)',
                          color: '#f8fafc',
                          fontSize: 10,
                          fontWeight: 800,
                          lineHeight: 1,
                        }}
                      >
                        +{item.enhanceLevel}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: RARITY_COLORS[item.rarity] ?? '#ddd', fontWeight: 700, lineHeight: 1.3 }}>
                      {item.itemName}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Settings modal */}
      <Modal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} title="채널 설정">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <div style={{ color: '#888', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', marginBottom: 10, letterSpacing: 1 }}>채널 정보</div>
            <div style={{ background: '#0f0f17', borderRadius: 10, border: '1px solid #2a2a4a', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#888', fontSize: 13 }}>채널명</span>
                <span style={{ color: '#eee', fontSize: 13 }}>{channelInfo.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#888', fontSize: 13 }}>인원</span>
                <span style={{ color: '#eee', fontSize: 13 }}>{channelInfo.members.length} / {channelInfo.maxMembers}명</span>
              </div>
              {channelInfo.dungeon && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#888', fontSize: 13 }}>던전</span>
                  <span style={{ color: '#eee', fontSize: 13 }}>{channelInfo.dungeon.name ?? '-'}</span>
                </div>
              )}
            </div>
          </div>
          <div>
            <div style={{ color: '#888', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', marginBottom: 10, letterSpacing: 1 }}>참여 멤버</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {channelInfo.members.map((member) => (
                <div key={member.id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 14px',
                  background: '#0f0f17',
                  borderRadius: 10,
                  border: '1px solid #2a2a4a',
                }}>
                  <div>
                    <div style={{ color: '#eee', fontSize: 14, fontWeight: 600 }}>
                      {member.user?.nickname ?? member.userId.slice(0, 8)}
                    </div>
                    <div style={{ color: '#777', fontSize: 12, marginTop: 2 }}>Lv.{member.user?.level ?? '?'}</div>
                  </div>
                  <Badge variant={member.role === 'HOST' ? 'warning' : 'info'}>{member.role}</Badge>
                </div>
              ))}
            </div>
          </div>
          <div style={{ borderTop: '1px solid #2a2a4a', paddingTop: 16 }}>
            <Button variant="danger" size="sm" loading={leaving} onClick={handleLeave} style={{ width: '100%' }}>
              채널 나가기
            </Button>
          </div>
        </div>
      </Modal>

      {/* Dungeon picker modal */}
      <Modal isOpen={dungeonPickerOpen} onClose={() => setDungeonPickerOpen(false)} title="던전 선택">
        {dungeonLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '30px 0' }}><Spinner /></div>
        ) : dungeons.length === 0 ? (
          <div style={{ color: '#666', textAlign: 'center', padding: '30px 0' }}>입장 가능한 던전이 없습니다.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {dungeons.map((d) => {
              const canEnter = user && user.level >= d.minLevel && user.level <= d.maxLevel;
              return (
                <button
                  key={d.id}
                  onClick={() => canEnter && handleSelectDungeon(d.id)}
                  disabled={!canEnter}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 14px',
                    background: '#0f0f17',
                    borderRadius: 10,
                    border: '1px solid #2a2a4a',
                    cursor: canEnter ? 'pointer' : 'not-allowed',
                    opacity: canEnter ? 1 : 0.4,
                    color: '#eee',
                    textAlign: 'left',
                    transition: 'border-color 0.15s',
                  }}
                  onMouseEnter={(e) => { if (canEnter) (e.currentTarget as HTMLElement).style.borderColor = '#7c3aed'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#2a2a4a'; }}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{d.name}</div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 3, fontSize: 12, color: '#888' }}>
                      <span>Lv.{d.minLevel}~{d.maxLevel}</span>
                      <span style={{ color: '#fbbf24' }}>{d.rewardGoldMin.toLocaleString()}~{d.rewardGoldMax.toLocaleString()}G</span>
                      <span style={{ color: '#2ecc71' }}>EXP {d.rewardExp}</span>
                    </div>
                  </div>
                  {canEnter && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </Modal>
    </div>
  );
}

// ── System message bubble ──
function SystemMessageBubble({ msg }: { msg: SystemMessage }) {
  if (msg.type === 'enhance') {
    const d = msg.data;
    const success = d.success as boolean;
    const destroyed = d.destroyed as boolean;
    const itemName = d.itemName as string;
    const enhanceLevel = d.enhanceLevel as number;
    const goldCost = d.goldCost as number;
    const remainingGold = d.remainingGold as number;

    let title: string;
    if (destroyed) {
      title = `@${msg.nickname} \u3010 \u5F37\u5316 \u5931\u6557 \u2014 \u30A2\u30A4\u30C6\u30E0 \u7834\u58CA\u3011`;
    } else if (success) {
      title = `@${msg.nickname} \u3010 \u5F37\u5316 \u6210\u529F +${enhanceLevel - 1} \u2192 +${enhanceLevel}\u3011`;
    } else {
      title = `@${msg.nickname} \u3010 \u5F37\u5316 \u5931\u6557 +${enhanceLevel} \u7DAD\u6301\u3011`;
    }

    // Korean version
    if (destroyed) {
      title = `@${msg.nickname} 【 강화 실패 — 아이템 파괴 】`;
    } else if (success) {
      title = `@${msg.nickname} 【 강화 성공 +${enhanceLevel - 1} → +${enhanceLevel}】`;
    } else {
      title = `@${msg.nickname} 【 강화 실패 +${enhanceLevel} 유지】`;
    }

    return (
      <div style={{ display: 'inline-block', width: '100%', maxWidth: '86%', padding: '12px 14px', background: success ? 'rgba(251, 191, 36, 0.06)' : 'rgba(233, 69, 96, 0.06)', border: `1px solid ${success ? 'rgba(251, 191, 36, 0.15)' : 'rgba(233, 69, 96, 0.15)'}`, borderRadius: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: success ? '#fbbf24' : '#e94560', marginBottom: 8 }}>
          {title}
        </div>
        <div style={{ fontSize: 12, color: '#aaa', lineHeight: 1.8 }}>
          <div>&#x1F4B0; 사용 골드: -{goldCost?.toLocaleString()}G</div>
          <div>&#x1F4B0; 보유 골드: {remainingGold?.toLocaleString()}G</div>
          <div>{destroyed ? '\u{1F4A5}' : '\u2694\uFE0F'} {destroyed ? '파괴됨' : `획득: [+${enhanceLevel}] ${itemName}`}</div>
        </div>
      </div>
    );
  }

  if (msg.type === 'dungeon-invite') {
    const d = msg.data as Record<string, unknown>;
    const dungeonName = d.dungeonName as string;
    const hostNickname = d.hostNickname as string;

    return (
      <div style={{ display: 'inline-block', width: '100%', maxWidth: '86%', padding: '12px 14px', background: 'rgba(96, 165, 250, 0.06)', border: '1px solid rgba(96, 165, 250, 0.15)', borderRadius: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#60a5fa', marginBottom: 6 }}>
          &#x2694;&#xFE0F; 던전 초대
        </div>
        <div style={{ fontSize: 13, color: '#ccc' }}>
          <strong>{hostNickname}</strong>님이 <strong style={{ color: '#fbbf24' }}>{dungeonName}</strong> 던전에 초대했습니다.
        </div>
      </div>
    );
  }

  if (msg.type === 'dungeon-start') {
    const d = msg.data as Record<string, unknown>;
    const dungeonName = d.dungeonName as string;
    const hostNickname = d.hostNickname as string;
    const successCount = d.successCount as number;
    const failCount = d.failCount as number;

    return (
      <div style={{ display: 'inline-block', width: '100%', maxWidth: '86%', padding: '12px 14px', background: 'rgba(46, 204, 113, 0.06)', border: '1px solid rgba(46, 204, 113, 0.18)', borderRadius: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#2ecc71', marginBottom: 6 }}>
          🏰 던전 입장 결과
        </div>
        <div style={{ fontSize: 13, color: '#ccc', lineHeight: 1.7 }}>
          <div><strong>{hostNickname}</strong>님이 <strong style={{ color: '#fbbf24' }}>{dungeonName}</strong> 던전을 시작했습니다.</div>
          <div>입장 성공: <strong style={{ color: '#2ecc71' }}>{successCount}명</strong> / 실패: <strong style={{ color: '#e94560' }}>{failCount}명</strong></div>
        </div>
      </div>
    );
  }

  return null;
}
