'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { admin } from '@gate-breaker/api-client';
import type { Item, ItemRarity, ItemType } from '@gate-breaker/types';
import { Button, Input, Spinner, useToast } from '@gate-breaker/ui';
import { AdminActionIconButton } from '@/components/admin-action-icon-button';
import { AdminLayout } from '@/components/admin-layout';
import { AdminCrudModalForm, AdminFormField } from '@/components/admin-crud-modal-form';

type ItemForm = {
  name: string;
  category: string;
  type: ItemType;
  rarity: ItemRarity;
  baseAttack: number;
  baseDefense: number;
  baseHp: number;
  healHp: number;
  description: string;
  sellPrice: number;
  buyPrice: number;
};

const TYPES: ItemType[] = ['WEAPON', 'ARMOR', 'GLOVE', 'SHOE', 'RING', 'NECKLACE', 'MATERIAL', 'CONSUMABLE'];
const RARITIES: ItemRarity[] = ['COMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC'];
const TYPE_LABELS: Record<ItemType, string> = {
  WEAPON: '무기',
  ARMOR: '방어구',
  GLOVE: '장갑',
  SHOE: '신발',
  RING: '반지',
  NECKLACE: '목걸이',
  MATERIAL: '재료',
  CONSUMABLE: '소모품',
};
const RARITY_LABELS: Record<ItemRarity, string> = {
  COMMON: '일반',
  RARE: '희귀',
  EPIC: '영웅',
  LEGENDARY: '전설',
  MYTHIC: '신화',
};

const EMPTY_FORM: ItemForm = {
  name: '',
  category: '기타',
  type: 'WEAPON',
  rarity: 'COMMON',
  baseAttack: 0,
  baseDefense: 0,
  baseHp: 0,
  healHp: 0,
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
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState<ItemForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<ItemForm>(EMPTY_FORM);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('전체');

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
    healHp: i.healHp || 0,
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

  const openCreateModal = () => {
    setCreateOpen(true);
  };

  const closeCreateModal = () => {
    setCreateOpen(false);
    setCreating(EMPTY_FORM);
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
      closeCreateModal();
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

  const getCategoryLabel = useCallback(
    (item: Item) => {
      const fromItem = item.category?.trim();
      if (fromItem) return fromItem;
      return TYPE_LABELS[item.type];
    },
    [],
  );

  const categories = useMemo(() => {
    const values = Array.from(new Set(rows.map((row) => getCategoryLabel(row))));
    return ['전체', ...values];
  }, [getCategoryLabel, rows]);

  const filteredRows = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return rows.filter((row) => {
      const matchedCategory =
        selectedCategory === '전체' || getCategoryLabel(row) === selectedCategory;
      const matchedName =
        q.length === 0 || row.name.toLowerCase().includes(q);
      return matchedCategory && matchedName;
    });
  }, [getCategoryLabel, rows, searchText, selectedCategory]);

  const renderForm = (
    form: ItemForm,
    setter: (updater: (prev: ItemForm) => ItemForm) => void,
  ) => (
    <>
      <AdminFormField label="이름">
        <Input value={form.name} onChange={(e) => setter((p) => ({ ...p, name: e.target.value }))} />
      </AdminFormField>
      <AdminFormField label="카테고리">
        <Input value={form.category} onChange={(e) => setter((p) => ({ ...p, category: e.target.value }))} />
      </AdminFormField>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
        <AdminFormField label="타입">
          <select value={form.type} onChange={(e) => setter((p) => ({ ...p, type: e.target.value as ItemType }))} style={selectStyle}>
            {TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
          </select>
        </AdminFormField>
        <AdminFormField label="등급">
          <select value={form.rarity} onChange={(e) => setter((p) => ({ ...p, rarity: e.target.value as ItemRarity }))} style={selectStyle}>
            {RARITIES.map((r) => <option key={r} value={r}>{RARITY_LABELS[r]}</option>)}
          </select>
        </AdminFormField>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
        <AdminFormField label="공격력">
          <Input type="number" value={String(form.baseAttack)} onChange={(e) => changeNum(setter, 'baseAttack', e.target.value)} />
        </AdminFormField>
        <AdminFormField label="방어력">
          <Input type="number" value={String(form.baseDefense)} onChange={(e) => changeNum(setter, 'baseDefense', e.target.value)} />
        </AdminFormField>
        <AdminFormField label="HP">
          <Input type="number" value={String(form.baseHp)} onChange={(e) => changeNum(setter, 'baseHp', e.target.value)} />
        </AdminFormField>
        <AdminFormField label="회복력">
          <Input type="number" value={String(form.healHp)} onChange={(e) => changeNum(setter, 'healHp', e.target.value)} />
        </AdminFormField>
        <AdminFormField label="판매가">
          <Input type="number" value={String(form.sellPrice)} onChange={(e) => changeNum(setter, 'sellPrice', e.target.value)} />
        </AdminFormField>
      </div>
      <AdminFormField label="구매가">
        <Input type="number" value={String(form.buyPrice)} onChange={(e) => changeNum(setter, 'buyPrice', e.target.value)} />
      </AdminFormField>
      <AdminFormField label="설명">
        <Input value={form.description} onChange={(e) => setter((p) => ({ ...p, description: e.target.value }))} />
      </AdminFormField>
    </>
  );

  return (
    <AdminLayout>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20, color: '#eee' }}>아이템 관리</h1>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner /></div>
      ) : (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            {categories.map((category) => {
              const active = selectedCategory === category;
              return (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  style={{
                    border: active ? '1px solid #6c5ce7' : '1px solid #333',
                    backgroundColor: active ? '#6c5ce730' : '#16162a',
                    color: active ? '#d1c4ff' : '#aaa',
                    borderRadius: 999,
                    padding: '6px 12px',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {category}
                </button>
              );
            })}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ minWidth: 220 }}>
                <Input
                  value={searchText}
                  placeholder="아이템명 검색"
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </div>
              <Button onClick={openCreateModal}>생성</Button>
            </div>
          </div>

          {filteredRows.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#888', padding: '60px 0' }}>조건에 맞는 아이템이 없습니다.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
              {filteredRows.map((row) => {
                const isUploading = uploadingId === row.id;

                return (
                  <div
                    key={row.id}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.backgroundColor = '#252545'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.backgroundColor = '#1a1a2e'; }}
                    style={{
                      backgroundColor: '#1a1a2e',
                      borderRadius: 12,
                      border: '1px solid #2a2a4a',
                      padding: '16px 20px',
                      transition: 'background-color 0.15s',
                    }}
                  >
                    {/* 헤더: 이미지 + 이름 + 액션 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <div style={{ position: 'relative', flexShrink: 0, width: 56, height: 56 }}>
                        {isUploading ? (
                          <div style={{ width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2a2a4a', borderRadius: 8 }}>
                            <Spinner />
                          </div>
                        ) : row.imageUrl ? (
                          <div style={{ position: 'relative', width: 56, height: 56 }}>
                            <img
                              src={row.imageUrl}
                              alt={row.name}
                              style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover' }}
                            />
                            <button
                              onClick={() => handleImageDelete(row.id)}
                              style={{
                                position: 'absolute',
                                top: -4,
                                right: -4,
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
                          </div>
                        ) : (
                          <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 56,
                            height: 56,
                            borderRadius: 8,
                            backgroundColor: '#252545',
                            border: '1px dashed #555',
                            cursor: 'pointer',
                            fontSize: 22,
                            color: '#666',
                          }}>
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
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 15, fontWeight: 700, color: '#eee', marginBottom: 2 }}>{row.name}</p>
                        <p style={{ fontSize: 12, color: getCategoryLabel(row) ? '#888' : '#555' }}>{getCategoryLabel(row)}</p>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <AdminActionIconButton kind="edit" onClick={() => openEditModal(row)} />
                        <AdminActionIconButton kind="delete" onClick={() => remove(row.id)} />
                      </div>
                    </div>
                    {/* 타입 + 등급 태그 */}
                    <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, backgroundColor: '#12122a', color: '#aaa' }}>
                        {TYPE_LABELS[row.type]}
                      </span>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, backgroundColor: '#12122a', color: RARITY_COLORS[row.rarity], fontWeight: 600 }}>
                        {RARITY_LABELS[row.rarity]}
                      </span>
                    </div>
                    {/* 스탯 그리드 */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(50px, 1fr))', gap: 6 }}>
                      {[
                        { label: '공격', value: row.baseAttack, color: '#f97316' },
                        { label: '방어', value: row.baseDefense, color: '#3b82f6' },
                        { label: 'HP', value: row.baseHp, color: '#ef4444' },
                        { label: '회복', value: row.healHp, color: '#22c55e' },
                        { label: '판매가', value: row.sellPrice, color: '#fbbf24' },
                        { label: '구매가', value: row.buyPrice, color: '#a78bfa' },
                      ].map(({ label, value, color }) => (
                        <div key={label} style={{ backgroundColor: '#12122a', borderRadius: 6, padding: '6px 4px', textAlign: 'center' }}>
                          <p style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>{label}</p>
                          <p style={{ fontSize: 11, fontWeight: 700, color }}>{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <AdminCrudModalForm
        isOpen={createOpen}
        onClose={closeCreateModal}
        onSubmit={saveCreate}
        title="아이템 생성"
        submitLabel="생성"
        loading={saving}
      >
        {renderForm(creating, setCreating)}
      </AdminCrudModalForm>

      <AdminCrudModalForm
        isOpen={!!editingId}
        onClose={closeEditModal}
        onSubmit={saveEdit}
        title="아이템 수정"
        submitLabel="저장"
        loading={saving}
      >
        {renderForm(editing, setEditing)}
      </AdminCrudModalForm>
    </AdminLayout>
  );
}
