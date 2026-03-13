'use client';

import { useCallback, useEffect, useState } from 'react';
import { admin } from '@gate-breaker/api-client';
import type { Dungeon, Monster } from '@gate-breaker/types';
import { Button, Input, Modal, Spinner, useToast } from '@gate-breaker/ui';
import { AdminLayout } from '@/components/admin-layout';

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

  const saveCreate = async () => {
    setSaving(true);
    try {
      await admin.monsters.create(creating);
      addToast('몬스터를 생성했습니다.', 'success');
      setCreating((prev) => ({ ...EMPTY_FORM, dungeonId: prev.dungeonId }));
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

  return (
    <AdminLayout>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20, color: '#eee' }}>몬스터 CRUD</h1>

      <div style={{ backgroundColor: '#16162a', border: '1px solid #2a2a4a', borderRadius: 8, padding: 20, marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#eee', marginBottom: 12 }}>몬스터 생성</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr repeat(5, 1fr)', gap: 8, alignItems: 'center' }}>
          <Input value={creating.name} placeholder="이름" onChange={(e) => setCreating((p) => ({ ...p, name: e.target.value }))} />
          <select
            value={creating.dungeonId}
            onChange={(e) => setCreating((p) => ({ ...p, dungeonId: e.target.value }))}
            style={{ ...selectStyle, width: 'auto' }}
          >
            {dungeons.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <Input type="number" value={String(creating.hp)} placeholder="HP" onChange={(e) => changeNum(setCreating, 'hp', e.target.value)} />
          <Input type="number" value={String(creating.attack)} placeholder="공격" onChange={(e) => changeNum(setCreating, 'attack', e.target.value)} />
          <Input type="number" value={String(creating.defense)} placeholder="방어" onChange={(e) => changeNum(setCreating, 'defense', e.target.value)} />
          <Input type="number" value={String(creating.expReward)} placeholder="경험치" onChange={(e) => changeNum(setCreating, 'expReward', e.target.value)} />
          <Input type="number" value={String(creating.goldReward)} placeholder="골드" onChange={(e) => changeNum(setCreating, 'goldReward', e.target.value)} />
        </div>
        <div style={{ marginTop: 10 }}>
          <Button loading={saving} onClick={saveCreate}>생성</Button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner /></div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#1a1a2e', borderRadius: 8, overflow: 'hidden' }}>
          <thead style={{ backgroundColor: '#16213e' }}>
            <tr>
              <th style={thStyle}>이미지</th>
              <th style={thStyle}>이름</th>
              <th style={thStyle}>던전</th>
              <th style={thStyle}>HP</th>
              <th style={thStyle}>공격</th>
              <th style={thStyle}>방어</th>
              <th style={thStyle}>경험치</th>
              <th style={thStyle}>골드</th>
              <th style={thStyle}>액션</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => {
              const isHovered = hoveredRow === m.id;
              const isImgHovered = hoveredImg === m.id;
              const isUploading = uploadingId === m.id;

              return (
                <tr
                  key={m.id}
                  style={{ backgroundColor: isHovered ? '#252545' : 'transparent', transition: 'background-color 0.15s' }}
                  onMouseEnter={() => setHoveredRow(m.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  <td style={tdStyle}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 6,
                        overflow: 'hidden',
                        backgroundColor: '#2a2a4a',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
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
                                top: -2,
                                right: -2,
                                width: 16,
                                height: 16,
                                borderRadius: '50%',
                                backgroundColor: '#e74c3c',
                                color: '#fff',
                                border: 'none',
                                fontSize: 10,
                                lineHeight: '16px',
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
                        <span style={{ fontSize: 10, color: '#666' }}>없음</span>
                      )}
                      {!isUploading && (isImgHovered || !m.imageUrl) && (
                        <label
                          style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            backgroundColor: 'rgba(0,0,0,0.6)',
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
                  </td>
                  <td style={tdStyle}>{m.name}</td>
                  <td style={tdStyle}>{getDungeonName(m.dungeonId)}</td>
                  <td style={tdStyle}>{m.hp}</td>
                  <td style={tdStyle}>{m.attack}</td>
                  <td style={tdStyle}>{m.defense}</td>
                  <td style={tdStyle}>{m.expReward}</td>
                  <td style={tdStyle}>{m.goldReward}</td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <Button size="sm" variant="secondary" onClick={() => openEditModal(m)}>수정</Button>
                      <Button size="sm" variant="danger" onClick={() => remove(m.id)}>삭제</Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <Modal isOpen={!!editingId} onClose={closeEditModal} title="몬스터 수정">
        <div style={{ display: 'grid', gap: 10 }}>
          <Input value={editing.name} placeholder="이름" onChange={(e) => setEditing((p) => ({ ...p, name: e.target.value }))} />
          <select
            value={editing.dungeonId}
            onChange={(e) => setEditing((p) => ({ ...p, dungeonId: e.target.value }))}
            style={selectStyle}
          >
            {dungeons.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <Input type="number" value={String(editing.hp)} placeholder="HP" onChange={(e) => changeNum(setEditing, 'hp', e.target.value)} />
            <Input type="number" value={String(editing.attack)} placeholder="공격" onChange={(e) => changeNum(setEditing, 'attack', e.target.value)} />
            <Input type="number" value={String(editing.defense)} placeholder="방어" onChange={(e) => changeNum(setEditing, 'defense', e.target.value)} />
            <Input type="number" value={String(editing.expReward)} placeholder="경험치" onChange={(e) => changeNum(setEditing, 'expReward', e.target.value)} />
            <Input type="number" value={String(editing.goldReward)} placeholder="골드" onChange={(e) => changeNum(setEditing, 'goldReward', e.target.value)} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
            <Button variant="ghost" onClick={closeEditModal}>취소</Button>
            <Button loading={saving} onClick={saveEdit}>저장</Button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  );
}
