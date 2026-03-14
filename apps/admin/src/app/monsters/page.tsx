'use client';

import { useCallback, useEffect, useState } from 'react';
import { admin } from '@gate-breaker/api-client';
import type { Dungeon, Monster } from '@gate-breaker/types';
import { Button, Input, Spinner, useToast } from '@gate-breaker/ui';
import { AdminActionIconButton } from '@/components/admin-action-icon-button';
import { AdminLayout } from '@/components/admin-layout';
import { AdminCrudModalForm, AdminFormField } from '@/components/admin-crud-modal-form';

type MonsterForm = {
  name: string;
  dungeonId: string;
  hp: number;
  attack: number;
  defense: number;
  expReward: number;
  goldReward: number;
};

const EMPTY_FORM: MonsterForm = {
  name: '',
  dungeonId: '',
  hp: 1,
  attack: 0,
  defense: 0,
  expReward: 0,
  goldReward: 0,
};

const thStyle: React.CSSProperties = {
  padding: '12px 16px',
  textAlign: 'left',
  fontSize: 13,
  fontWeight: 600,
  color: '#aaa',
  borderBottom: '1px solid #333',
};

const tdStyle: React.CSSProperties = {
  padding: '12px 16px',
  fontSize: 14,
  color: '#eee',
  borderBottom: '1px solid #333',
};

const selectStyle: React.CSSProperties = {
  background: '#0a0a0f',
  border: '1px solid #333',
  color: '#eee',
  borderRadius: 6,
  padding: '0 8px',
  height: 36,
  width: '100%',
};

export default function MonstersPage() {
  const { addToast } = useToast();
  const [rows, setRows] = useState<Monster[]>([]);
  const [dungeons, setDungeons] = useState<Dungeon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState<MonsterForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<MonsterForm>(EMPTY_FORM);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [hoveredImg, setHoveredImg] = useState<string | null>(null);

  const fetchRows = useCallback(async () => {
    try {
      setLoading(true);
      const [monsters, dungeonList] = await Promise.all([admin.monsters.list(), admin.dungeons.list()]);
      setRows(monsters);
      setDungeons(dungeonList);
      if (!creating.dungeonId && dungeonList.length > 0) {
        setCreating((prev) => ({ ...prev, dungeonId: dungeonList[0].id }));
      }
    } catch (err) {
      addToast(err instanceof Error ? err.message : '몬스터 목록을 불러오지 못했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast, creating.dungeonId]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const fillForm = (m: Monster): MonsterForm => ({
    name: m.name,
    dungeonId: m.dungeonId,
    hp: m.hp,
    attack: m.attack,
    defense: m.defense,
    expReward: m.expReward,
    goldReward: m.goldReward,
  });

  const changeNum = (
    setter: (updater: (prev: MonsterForm) => MonsterForm) => void,
    key: keyof MonsterForm,
    value: string,
  ) => {
    const parsed = Number(value || 0);
    setter((prev) => ({ ...prev, [key]: Number.isFinite(parsed) ? parsed : 0 }));
  };

  const openCreateModal = () => {
    if (!creating.dungeonId && dungeons.length > 0) {
      setCreating((prev) => ({ ...prev, dungeonId: dungeons[0].id }));
    }
    setCreateOpen(true);
  };

  const closeCreateModal = () => {
    setCreateOpen(false);
    setCreating((prev) => ({ ...EMPTY_FORM, dungeonId: prev.dungeonId }));
  };

  const saveCreate = async () => {
    setSaving(true);
    try {
      await admin.monsters.create(creating);
      addToast('몬스터를 생성했습니다.', 'success');
      closeCreateModal();
      await fetchRows();
    } catch (err) {
      addToast(err instanceof Error ? err.message : '몬스터 생성에 실패했습니다.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (monster: Monster) => {
    setEditingId(monster.id);
    setEditing(fillForm(monster));
  };

  const closeEditModal = () => {
    setEditingId(null);
    setEditing(EMPTY_FORM);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      await admin.monsters.update(editingId, editing);
      addToast('몬스터를 수정했습니다.', 'success');
      closeEditModal();
      await fetchRows();
    } catch (err) {
      addToast(err instanceof Error ? err.message : '몬스터 수정에 실패했습니다.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await admin.monsters.delete(id);
      addToast('몬스터를 삭제했습니다.', 'success');
      await fetchRows();
    } catch (err) {
      addToast(err instanceof Error ? err.message : '몬스터 삭제에 실패했습니다.', 'error');
    }
  };

  const handleImageUpload = async (id: string, file: File) => {
    setUploadingId(id);
    try {
      await admin.monsters.uploadImage(id, file);
      addToast('이미지를 업로드했습니다.', 'success');
      await fetchRows();
    } catch (err) {
      addToast(err instanceof Error ? err.message : '이미지 업로드에 실패했습니다.', 'error');
    } finally {
      setUploadingId(null);
    }
  };

  const handleImageDelete = async (id: string) => {
    if (!confirm('이미지를 삭제하시겠습니까?')) return;
    setUploadingId(id);
    try {
      await admin.monsters.deleteImage(id);
      addToast('이미지를 삭제했습니다.', 'success');
      await fetchRows();
    } catch (err) {
      addToast(err instanceof Error ? err.message : '이미지 삭제에 실패했습니다.', 'error');
    } finally {
      setUploadingId(null);
    }
  };

  const getDungeonName = (dungeonId: string) => {
    const d = dungeons.find((dn) => dn.id === dungeonId);
    return d ? d.name : dungeonId;
  };

  const renderForm = (
    form: MonsterForm,
    setter: (updater: (prev: MonsterForm) => MonsterForm) => void,
  ) => (
    <>
      <AdminFormField label="이름">
        <Input value={form.name} onChange={(e) => setter((p) => ({ ...p, name: e.target.value }))} />
      </AdminFormField>
      <AdminFormField label="던전">
        <select
          value={form.dungeonId}
          onChange={(e) => setter((p) => ({ ...p, dungeonId: e.target.value }))}
          style={selectStyle}
        >
          {dungeons.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </AdminFormField>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
        <AdminFormField label="HP">
          <Input type="number" value={String(form.hp)} onChange={(e) => changeNum(setter, 'hp', e.target.value)} />
        </AdminFormField>
        <AdminFormField label="공격">
          <Input type="number" value={String(form.attack)} onChange={(e) => changeNum(setter, 'attack', e.target.value)} />
        </AdminFormField>
        <AdminFormField label="방어">
          <Input type="number" value={String(form.defense)} onChange={(e) => changeNum(setter, 'defense', e.target.value)} />
        </AdminFormField>
        <AdminFormField label="경험치">
          <Input type="number" value={String(form.expReward)} onChange={(e) => changeNum(setter, 'expReward', e.target.value)} />
        </AdminFormField>
      </div>
      <AdminFormField label="골드">
        <Input type="number" value={String(form.goldReward)} onChange={(e) => changeNum(setter, 'goldReward', e.target.value)} />
      </AdminFormField>
    </>
  );

  return (
    <AdminLayout>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20, color: '#eee' }}>몬스터 관리</h1>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Button onClick={openCreateModal}>생성</Button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner /></div>
      ) : rows.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#888', padding: '60px 0' }}>몬스터가 없습니다.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {rows.map((m) => {
            const isHovered = hoveredRow === m.id;
            const isImgHovered = hoveredImg === m.id;
            const isUploading = uploadingId === m.id;

            return (
              <div
                key={m.id}
                style={{
                  backgroundColor: isHovered ? '#252545' : '#1a1a2e',
                  borderRadius: 12,
                  border: '1px solid #2a2a4a',
                  padding: '16px 20px',
                  transition: 'background-color 0.15s',
                }}
                onMouseEnter={() => setHoveredRow(m.id)}
                onMouseLeave={() => setHoveredRow(null)}
              >
                {/* 헤더: 이미지 + 이름 + 액션 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 8,
                      overflow: 'hidden',
                      backgroundColor: '#2a2a4a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      flexShrink: 0,
                      cursor: 'pointer',
                    }}
                    onMouseEnter={() => setHoveredImg(m.id)}
                    onMouseLeave={() => setHoveredImg(null)}
                  >
                    {isUploading ? (
                      <Spinner />
                    ) : m.imageUrl ? (
                      <>
                        <img src={m.imageUrl} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        {isImgHovered && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleImageDelete(m.id); }}
                            style={{
                              position: 'absolute',
                              top: 2,
                              right: 2,
                              width: 18,
                              height: 18,
                              borderRadius: '50%',
                              backgroundColor: '#e74c3c',
                              color: '#fff',
                              border: 'none',
                              fontSize: 10,
                              lineHeight: '18px',
                              textAlign: 'center',
                              cursor: 'pointer',
                              padding: 0,
                            }}
                          >
                            X
                          </button>
                        )}
                      </>
                    ) : (
                      <span style={{ fontSize: 22 }}>👹</span>
                    )}
                    {!isUploading && (isImgHovered || !m.imageUrl) && (
                      <label
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          backgroundColor: 'rgba(0,0,0,0.65)',
                          color: '#fff',
                          fontSize: 9,
                          textAlign: 'center',
                          cursor: 'pointer',
                          padding: '2px 0',
                        }}
                      >
                        {m.imageUrl ? '변경' : '업로드'}
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(m.id, file);
                            e.target.value = '';
                          }}
                        />
                      </label>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 15, fontWeight: 700, color: '#eee', marginBottom: 2 }}>{m.name}</p>
                    <p style={{ fontSize: 12, color: '#888' }}>{getDungeonName(m.dungeonId)}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <AdminActionIconButton kind="edit" onClick={() => openEditModal(m)} />
                    <AdminActionIconButton kind="delete" onClick={() => remove(m.id)} />
                  </div>
                </div>
                {/* 스탯 그리드 */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
                  {[
                    { label: 'HP', value: m.hp, color: '#ef4444' },
                    { label: '공격', value: m.attack, color: '#f97316' },
                    { label: '방어', value: m.defense, color: '#3b82f6' },
                    { label: '경험치', value: m.expReward, color: '#22c55e' },
                    { label: '골드', value: m.goldReward, color: '#fbbf24' },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ backgroundColor: '#12122a', borderRadius: 6, padding: '6px 4px', textAlign: 'center' }}>
                      <p style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>{label}</p>
                      <p style={{ fontSize: 12, fontWeight: 700, color }}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AdminCrudModalForm
        isOpen={createOpen}
        onClose={closeCreateModal}
        onSubmit={saveCreate}
        title="몬스터 생성"
        submitLabel="생성"
        loading={saving}
      >
        {renderForm(creating, setCreating)}
      </AdminCrudModalForm>

      <AdminCrudModalForm
        isOpen={!!editingId}
        onClose={closeEditModal}
        onSubmit={saveEdit}
        title="몬스터 수정"
        submitLabel="저장"
        loading={saving}
      >
        {renderForm(editing, setEditing)}
      </AdminCrudModalForm>
    </AdminLayout>
  );
}
