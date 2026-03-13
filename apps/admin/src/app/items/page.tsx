'use client';

import { useCallback, useEffect, useState } from 'react';
import { admin } from '@gate-breaker/api-client';
import type { Item, ItemRarity, ItemType } from '@gate-breaker/types';
import { Button, Input, Modal, Spinner, useToast } from '@gate-breaker/ui';
import { AdminLayout } from '@/components/admin-layout';

type ItemForm = {
  name: string;
  category: string;
  type: ItemType;
  rarity: ItemRarity;
  baseAttack: number;
  baseDefense: number;
  baseHp: number;
  description: string;
  sellPrice: number;
  buyPrice: number;
};

const TYPES: ItemType[] = ['WEAPON', 'ARMOR', 'GLOVE', 'SHOE', 'RING', 'NECKLACE', 'MATERIAL', 'CONSUMABLE'];
const RARITIES: ItemRarity[] = ['COMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC'];

const EMPTY_FORM: ItemForm = {
  name: '',
  category: '기타',
  type: 'WEAPON',
  rarity: 'COMMON',
  baseAttack: 0,
  baseDefense: 0,
  baseHp: 0,
  description: '',
  sellPrice: 0,
  buyPrice: 0,
};

const RARITY_COLORS: Record<ItemRarity, string> = {
  COMMON: '#aaa',
  RARE: '#3498db',
  EPIC: '#9b59b6',
  LEGENDARY: '#f39c12',
  MYTHIC: '#e74c3c',
};

const selectStyle: React.CSSProperties = {
  background: '#0a0a0f',
  border: '1px solid #333',
  color: '#eee',
  borderRadius: 6,
  padding: '4px 8px',
  height: 36,
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

export default function ItemsPage() {
  const { addToast } = useToast();
  const [rows, setRows] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState<ItemForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<ItemForm>(EMPTY_FORM);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const fetchRows = useCallback(async () => {
    try {
      setLoading(true);
      const data = await admin.items.list();
      setRows(data);
    } catch (err) {
      addToast(err instanceof Error ? err.message : '아이템 목록을 불러오지 못했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const fillForm = (i: Item): ItemForm => ({
    name: i.name,
    category: i.category || '기타',
    type: i.type,
    rarity: i.rarity,
    baseAttack: i.baseAttack,
    baseDefense: i.baseDefense,
    baseHp: i.baseHp,
    description: i.description || '',
    sellPrice: i.sellPrice,
    buyPrice: i.buyPrice || 0,
  });

  const openEditModal = (row: Item) => {
    setEditingId(row.id);
    setEditing(fillForm(row));
  };

  const closeEditModal = () => {
    setEditingId(null);
    setEditing(EMPTY_FORM);
  };

  const changeNum = (
    setter: (updater: (prev: ItemForm) => ItemForm) => void,
    key: keyof ItemForm,
    value: string,
  ) => {
    const parsed = Number(value || 0);
    setter((prev) => ({ ...prev, [key]: Number.isFinite(parsed) ? parsed : 0 }));
  };

  const saveCreate = async () => {
    setSaving(true);
    try {
      await admin.items.create(creating);
      addToast('아이템을 생성했습니다.', 'success');
      setCreating(EMPTY_FORM);
      await fetchRows();
    } catch (err) {
      addToast(err instanceof Error ? err.message : '아이템 생성에 실패했습니다.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      await admin.items.update(editingId, editing);
      addToast('아이템을 수정했습니다.', 'success');
      closeEditModal();
      await fetchRows();
    } catch (err) {
      addToast(err instanceof Error ? err.message : '아이템 수정에 실패했습니다.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await admin.items.delete(id);
      addToast('아이템을 삭제했습니다.', 'success');
      await fetchRows();
    } catch (err) {
      addToast(err instanceof Error ? err.message : '아이템 삭제에 실패했습니다.', 'error');
    }
  };

  const handleImageUpload = async (id: string, file: File) => {
    setUploadingId(id);
    try {
      await admin.items.uploadImage(id, file);
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
      await admin.items.deleteImage(id);
      addToast('이미지를 삭제했습니다.', 'success');
      await fetchRows();
    } catch (err) {
      addToast(err instanceof Error ? err.message : '이미지 삭제에 실패했습니다.', 'error');
    } finally {
      setUploadingId(null);
    }
  };

  return (
    <AdminLayout>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20, color: '#eee' }}>아이템 CRUD</h1>

      <div style={{ backgroundColor: '#16162a', border: '1px solid #2a2a4a', borderRadius: 8, padding: 20, marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#eee', marginBottom: 12 }}>아이템 생성</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr repeat(5, 1fr)', gap: 8 }}>
          <Input value={creating.name} placeholder="이름" onChange={(e) => setCreating((p) => ({ ...p, name: e.target.value }))} />
          <Input value={creating.category} placeholder="카테고리" onChange={(e) => setCreating((p) => ({ ...p, category: e.target.value }))} />
          <select value={creating.type} onChange={(e) => setCreating((p) => ({ ...p, type: e.target.value as ItemType }))} style={selectStyle}>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={creating.rarity} onChange={(e) => setCreating((p) => ({ ...p, rarity: e.target.value as ItemRarity }))} style={selectStyle}>
            {RARITIES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <Input type="number" value={String(creating.baseAttack)} onChange={(e) => changeNum(setCreating, 'baseAttack', e.target.value)} />
          <Input type="number" value={String(creating.baseDefense)} onChange={(e) => changeNum(setCreating, 'baseDefense', e.target.value)} />
          <Input type="number" value={String(creating.baseHp)} onChange={(e) => changeNum(setCreating, 'baseHp', e.target.value)} />
          <Input type="number" value={String(creating.sellPrice)} onChange={(e) => changeNum(setCreating, 'sellPrice', e.target.value)} />
          <Input type="number" value={String(creating.buyPrice)} onChange={(e) => changeNum(setCreating, 'buyPrice', e.target.value)} />
        </div>
        <div style={{ marginTop: 8 }}>
          <Input value={creating.description} placeholder="설명" onChange={(e) => setCreating((p) => ({ ...p, description: e.target.value }))} />
        </div>
        <div style={{ marginTop: 10 }}><Button loading={saving} onClick={saveCreate}>생성</Button></div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner /></div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#1a1a2e', borderRadius: 8, overflow: 'hidden' }}>
          <thead style={{ backgroundColor: '#16213e' }}>
            <tr>
              <th style={thStyle}>이미지</th>
              <th style={thStyle}>이름</th>
              <th style={thStyle}>카테고리</th>
              <th style={thStyle}>타입</th>
              <th style={thStyle}>등급</th>
              <th style={thStyle}>공격</th>
              <th style={thStyle}>방어</th>
              <th style={thStyle}>HP</th>
              <th style={thStyle}>판매가</th>
              <th style={thStyle}>구매가</th>
              <th style={thStyle}>액션</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isUploading = uploadingId === row.id;

              return (
                <tr
                  key={row.id}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = '#252545'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'transparent'; }}
                >
                  <td style={tdStyle}>
                    {isUploading ? (
                      <Spinner />
                    ) : row.imageUrl ? (
                      <div style={{ position: 'relative', display: 'inline-block', width: 40, height: 40 }}>
                        <img
                          src={row.imageUrl}
                          alt={row.name}
                          style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover' }}
                        />
                        <button
                          onClick={() => handleImageDelete(row.id)}
                          style={{
                            position: 'absolute',
                            top: -6,
                            right: -6,
                            width: 18,
                            height: 18,
                            borderRadius: '50%',
                            backgroundColor: '#e74c3c',
                            color: '#fff',
                            border: 'none',
                            fontSize: 11,
                            lineHeight: '18px',
                            textAlign: 'center',
                            cursor: 'pointer',
                            padding: 0,
                          }}
                        >
                          X
                        </button>
                      </div>
                    ) : (
                      <label style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 6, backgroundColor: '#252545', border: '1px dashed #555', cursor: 'pointer', fontSize: 18, color: '#666' }}>
                        +
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(row.id, file);
                          }}
                        />
                      </label>
                    )}
                  </td>
                  <td style={tdStyle}>{row.name}</td>
                  <td style={tdStyle}>{row.category}</td>
                  <td style={tdStyle}>{row.type}</td>
                  <td style={tdStyle}>
                    <span style={{ color: RARITY_COLORS[row.rarity], fontWeight: 600 }}>{row.rarity}</span>
                  </td>
                  <td style={tdStyle}>{row.baseAttack}</td>
                  <td style={tdStyle}>{row.baseDefense}</td>
                  <td style={tdStyle}>{row.baseHp}</td>
                  <td style={tdStyle}>{row.sellPrice}</td>
                  <td style={tdStyle}>{row.buyPrice}</td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Button size="sm" variant="secondary" onClick={() => openEditModal(row)}>수정</Button>
                      <Button size="sm" variant="danger" onClick={() => remove(row.id)}>삭제</Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <Modal isOpen={!!editingId} onClose={closeEditModal} title="아이템 수정">
        <div style={{ display: 'grid', gap: 10 }}>
          <Input value={editing.name} placeholder="이름" onChange={(e) => setEditing((p) => ({ ...p, name: e.target.value }))} />
          <Input value={editing.category} placeholder="카테고리" onChange={(e) => setEditing((p) => ({ ...p, category: e.target.value }))} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <select value={editing.type} onChange={(e) => setEditing((p) => ({ ...p, type: e.target.value as ItemType }))} style={selectStyle}>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={editing.rarity} onChange={(e) => setEditing((p) => ({ ...p, rarity: e.target.value as ItemRarity }))} style={selectStyle}>
              {RARITIES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <Input type="number" value={String(editing.baseAttack)} onChange={(e) => changeNum(setEditing, 'baseAttack', e.target.value)} />
            <Input type="number" value={String(editing.baseDefense)} onChange={(e) => changeNum(setEditing, 'baseDefense', e.target.value)} />
            <Input type="number" value={String(editing.baseHp)} onChange={(e) => changeNum(setEditing, 'baseHp', e.target.value)} />
            <Input type="number" value={String(editing.sellPrice)} onChange={(e) => changeNum(setEditing, 'sellPrice', e.target.value)} />
            <Input type="number" value={String(editing.buyPrice)} onChange={(e) => changeNum(setEditing, 'buyPrice', e.target.value)} />
          </div>
          <Input value={editing.description} placeholder="설명" onChange={(e) => setEditing((p) => ({ ...p, description: e.target.value }))} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
            <Button variant="ghost" onClick={closeEditModal}>취소</Button>
            <Button loading={saving} onClick={saveEdit}>저장</Button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  );
}
