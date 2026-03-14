'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { channel } from '@gate-breaker/api-client';
import type { Channel } from '@gate-breaker/types';
import { Input, Card, Modal, Spinner, useToast } from '@gate-breaker/ui';
import { useAuth } from '@/context/auth-context';

export default function ChannelListPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [joining, setJoining] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createMax, setCreateMax] = useState(6);
  const [creating, setCreating] = useState(false);

  const fetchChannels = useCallback(async () => {
    try {
      setLoading(true);
      const data = await channel.list();
      setChannels(data);
    } catch {
      addToast('채널 목록을 불러오는데 실패했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  const handleSearch = useCallback(async (query: string) => {
    try {
      setLoading(true);
      if (query.trim()) {
        const data = await channel.search(query.trim());
        setChannels(data);
      } else {
        const data = await channel.list();
        setChannels(data);
      }
    } catch {
      addToast('검색에 실패했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, handleSearch]);

  useEffect(() => {
    if (searchOpen) {
      searchInputRef.current?.focus();
    }
  }, [searchOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  const handleJoin = async (ch: Channel) => {
    try {
      setJoining(ch.id);
      await channel.join(ch.id);
      addToast(`"${ch.name}" 채널에 참여했습니다.`, 'success');
      router.push(`/channel/${ch.id}`);
    } catch {
      addToast('채널 참여에 실패했습니다.', 'error');
    } finally {
      setJoining(null);
    }
  };

  const handleCreate = async () => {
    if (!createName.trim()) {
      addToast('채널 이름을 입력해주세요.', 'error');
      return;
    }
    try {
      setCreating(true);
      const created = await channel.create(createName.trim(), createMax);
      addToast(`"${created.name}" 채널이 생성되었습니다.`, 'success');
      setCreateOpen(false);
      setCreateName('');
      setCreateMax(6);
      router.push(`/channel/${created.id}`);
    } catch {
      addToast('채널 생성에 실패했습니다.', 'error');
    } finally {
      setCreating(false);
    }
  };

  const isFull = (ch: Channel) => ch.members.length >= ch.maxMembers;
  const isInDungeon = (ch: Channel) => ch.status === 'IN_DUNGEON';
  const isAlreadyMember = (ch: Channel) =>
    ch.members.some((m) => m.userId === user?.id);
  const isClickable = (ch: Channel) => isAlreadyMember(ch) || (!isFull(ch) && !isInDungeon(ch));

  return (
    <div style={{ padding: '16px' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto' }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '10px',
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              width: searchOpen ? '220px' : '0px',
              opacity: searchOpen ? 1 : 0,
              overflow: 'hidden',
              transition: 'width 0.2s ease, opacity 0.2s ease',
            }}
          >
            <input
              ref={searchInputRef}
              placeholder="채널 이름 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                height: '38px',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                background: 'rgba(255, 255, 255, 0.04)',
                backdropFilter: 'blur(4px)',
                color: '#eee',
                padding: '0 12px',
                outline: 'none',
                fontSize: '0.85rem',
                transition: 'border-color 0.2s ease',
              }}
            />
          </div>

          <button
            className="icon-btn"
            onClick={() => setSearchOpen((prev) => !prev)}
            aria-label="검색 열기"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </button>

          <button
            className="icon-btn accent"
            onClick={() => setCreateOpen(true)}
            aria-label="채널 만들기"
            style={{ fontSize: '22px', lineHeight: 1, fontWeight: 700 }}
          >
            +
          </button>
        </div>

        {/* Channel List */}
        {loading ? (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '80px 0',
            }}
          >
            <Spinner size="lg" />
          </div>
        ) : channels.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '80px 0',
              color: '#666',
              fontSize: '1.1rem',
            }}
          >
            {searchQuery ? '검색 결과가 없습니다.' : '생성된 채널이 없습니다.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {channels.map((ch) => {
              const full = isFull(ch);
              const inDungeon = isInDungeon(ch);
              const alreadyIn = isAlreadyMember(ch);
              const canJoin = !full && !inDungeon && !alreadyIn;
              const clickable = isClickable(ch);
              const hostName =
                ch.members.find((m) => m.role === 'HOST')?.user?.nickname ||
                ch.members[0]?.user?.nickname ||
                '-';

              return (
                <Card
                  key={ch.id}
                  style={{
                    padding: '18px 22px',
                    cursor: clickable ? 'pointer' : 'not-allowed',
                    opacity: clickable || joining === ch.id ? 1 : 0.75,
                  }}
                  onClick={() => {
                    if (joining) return;
                    if (alreadyIn) {
                      router.push(`/channel/${ch.id}`);
                      return;
                    }
                    if (!canJoin) return;
                    handleJoin(ch);
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '1.1rem',
                        fontWeight: 700,
                        color: '#eee',
                        flex: 1,
                        minWidth: 0,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {ch.name}
                    </span>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        flexShrink: 0,
                        fontSize: '0.95rem',
                        color: '#aaa',
                        fontWeight: 600,
                      }}
                    >
                      <span style={{ color: full ? '#e94560' : '#aaa' }}>
                        {ch.members.length} / {ch.maxMembers}명
                      </span>
                      <span style={{ color: '#555' }}>|</span>
                      <span style={{ color: '#9ca3af' }}>{hostName}</span>
                      {joining === ch.id && (
                        <>
                          <span style={{ color: '#555' }}>|</span>
                          <span style={{ color: '#a78bfa' }}>입장 중...</span>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Channel Modal */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="채널 만들기">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <Input
            label="채널 이름"
            placeholder="채널 이름을 입력하세요"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
            }}
          />
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 500,
                color: '#aaa',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                marginBottom: '6px',
              }}
            >
              최대 인원
            </label>
            <div ref={dropdownRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setDropdownOpen((prev) => !prev)}
                style={{
                  width: '100%',
                  height: '44px',
                  borderRadius: '10px',
                  border: dropdownOpen ? '1px solid rgba(167, 139, 250, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
                  background: 'rgba(255, 255, 255, 0.04)',
                  backdropFilter: 'blur(4px)',
                  color: '#eee',
                  fontSize: '15px',
                  fontWeight: 600,
                  padding: '0 12px',
                  outline: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'border-color 0.2s ease',
                }}
              >
                <span>{createMax}명</span>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#aaa"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease',
                  }}
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              {dropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    right: 0,
                    background: 'rgba(22, 22, 37, 0.95)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    zIndex: 10,
                    maxHeight: '200px',
                    overflowY: 'auto',
                  }}
                >
                  {Array.from({ length: 9 }, (_, i) => i + 2).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => {
                        setCreateMax(n);
                        setDropdownOpen(false);
                      }}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: createMax === n ? 'rgba(124, 58, 237, 0.15)' : 'transparent',
                        color: createMax === n ? '#c4b5fd' : '#ccc',
                        border: 'none',
                        outline: 'none',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: createMax === n ? 700 : 500,
                        fontFamily: 'inherit',
                        textAlign: 'left',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      {n}명
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <button
            className="btn-action primary"
            disabled={creating}
            onClick={handleCreate}
            style={{ width: '100%', marginTop: '4px' }}
          >
            {creating ? '생성 중...' : '생성'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
