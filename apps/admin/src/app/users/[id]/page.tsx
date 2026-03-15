'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { admin } from '@gate-breaker/api-client';
import { Spinner, useToast } from '@gate-breaker/ui';
import { AdminLayout } from '@/components/admin-layout';
import type { UserDetail } from '@gate-breaker/types';

const ROLE_LABELS: Record<UserDetail['role'], string> = {
  USER: '일반 유저',
  ADMIN: '관리자',
};

type EditableField = 'level' | 'exp' | 'gold' | 'hp' | 'maxHp' | 'mp' | 'maxMp' | 'attack' | 'defense';

const EDITABLE_STATS: { label: string; key: EditableField }[] = [
  { label: '레벨', key: 'level' },
  { label: '경험치', key: 'exp' },
  { label: '골드', key: 'gold' },
  { label: 'HP', key: 'hp' },
  { label: '최대 HP', key: 'maxHp' },
  { label: 'MP', key: 'mp' },
  { label: '최대 MP', key: 'maxMp' },
  { label: '공격력', key: 'attack' },
  { label: '방어력', key: 'defense' },
];

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { addToast } = useToast();
  const id = params.id as string;

  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [banning, setBanning] = useState(false);
  const [error, setError] = useState('');

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<Record<EditableField, number>>({
    level: 0, exp: 0, gold: 0, hp: 0, maxHp: 0, mp: 0, maxMp: 0, attack: 0, defense: 0,
  });
  const [saving, setSaving] = useState(false);

  const fetchUser = useCallback(() => {
    setLoading(true);
    admin.users
      .get(id)
      .then((u) => {
        setUser(u);
        setEditForm({
          level: u.level, exp: u.exp, gold: u.gold,
          hp: u.hp, maxHp: u.maxHp, mp: u.mp, maxMp: u.maxMp,
          attack: u.attack, defense: u.defense,
        });
      })
      .catch((err) => setError(err.message || '유저 정보를 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  const handleBanToggle = async () => {
    if (!user) return;
    setBanning(true);
    try {
      const result = await admin.users.ban(user.id);
      addToast(result.message, 'success');
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : '처리에 실패했습니다.', 'error');
    } finally {
      setBanning(false);
    }
  };

  const handleEditSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await admin.users.update(user.id, editForm);
      addToast('유저 정보를 수정했습니다.', 'success');
      setEditOpen(false);
      fetchUser();
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : '수정에 실패했습니다.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const statItems = user
    ? [
        { label: '레벨', value: user.level },
        { label: '경험치', value: user.exp.toLocaleString() },
        { label: '골드', value: user.gold.toLocaleString(), color: '#fbbf24' },
        { label: 'HP', value: `${user.hp} / ${user.maxHp}` },
        { label: 'MP', value: `${user.mp} / ${user.maxMp}` },
        { label: '공격력', value: user.attack },
        { label: '방어력', value: user.defense },
        { label: '치명타율', value: `${(user.criticalRate * 100).toFixed(1)}%` },
        { label: '역할', value: ROLE_LABELS[user.role] },
        { label: '가입일', value: new Date(user.createdAt).toLocaleDateString('ko-KR') },
      ]
    : [];

  return (
    <AdminLayout>
      <div style={{ marginBottom: 24 }}>
        <button
          onClick={() => router.push('/users')}
          style={{
            backgroundColor: 'transparent',
            border: '1px solid #2a2a4a',
            borderRadius: 6,
            padding: '8px 16px',
            color: '#aaa',
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          &larr; 유저 목록으로
        </button>
      </div>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}>
          <Spinner />
        </div>
      )}

      {error && (
        <p style={{ color: '#e94560', textAlign: 'center', padding: 32 }}>{error}</p>
      )}

      {!loading && !error && user && (
        <>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 32,
            }}
          >
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: '#eee' }}>{user.nickname}</h1>
              <p style={{ fontSize: 14, color: '#888', marginTop: 4 }}>{user.email}</p>
              <p style={{ fontSize: 12, color: '#555', marginTop: 2, fontFamily: 'monospace' }}>
                {user.id}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setEditOpen(true)}
                style={{
                  backgroundColor: '#6c5ce7',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  padding: '10px 24px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                정보 수정
              </button>
              <button
                onClick={handleBanToggle}
                disabled={banning}
                style={{
                  backgroundColor: '#e94560',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  padding: '10px 24px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: banning ? 'not-allowed' : 'pointer',
                  opacity: banning ? 0.6 : 1,
                }}
              >
                {banning ? '처리 중...' : '밴 토글'}
              </button>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 16,
            }}
          >
            {statItems.map((item) => (
              <div
                key={item.label}
                style={{
                  backgroundColor: '#1a1a2e',
                  borderRadius: 10,
                  padding: 20,
                  border: '1px solid #2a2a4a',
                }}
              >
                <p style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>{item.label}</p>
                <p style={{ fontSize: 20, fontWeight: 600, color: item.color ?? '#eee' }}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          {/* Edit Modal */}
          {editOpen && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0,0,0,0.6)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 1000,
              }}
              onClick={() => setEditOpen(false)}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  backgroundColor: '#1a1a2e',
                  borderRadius: 12,
                  padding: 32,
                  width: 480,
                  maxHeight: '80vh',
                  overflowY: 'auto',
                  border: '1px solid #2a2a4a',
                }}
              >
                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#eee', marginBottom: 24 }}>
                  유저 정보 수정
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {EDITABLE_STATS.map(({ label, key }) => (
                    <div key={key}>
                      <label style={{ fontSize: 13, color: '#aaa', marginBottom: 4, display: 'block' }}>
                        {label}
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={editForm[key]}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            [key]: parseInt(e.target.value, 10) || 0,
                          }))
                        }
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          backgroundColor: '#0f0f1a',
                          border: '1px solid #2a2a4a',
                          borderRadius: 6,
                          color: '#eee',
                          fontSize: 14,
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
                  <button
                    onClick={() => setEditOpen(false)}
                    style={{
                      backgroundColor: 'transparent',
                      border: '1px solid #2a2a4a',
                      borderRadius: 6,
                      padding: '10px 20px',
                      color: '#aaa',
                      fontSize: 14,
                      cursor: 'pointer',
                    }}
                  >
                    취소
                  </button>
                  <button
                    onClick={handleEditSave}
                    disabled={saving}
                    style={{
                      backgroundColor: '#6c5ce7',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      padding: '10px 20px',
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: saving ? 'not-allowed' : 'pointer',
                      opacity: saving ? 0.6 : 1,
                    }}
                  >
                    {saving ? '저장 중...' : '저장'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </AdminLayout>
  );
}
