'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { admin } from '@gate-breaker/api-client';
import { Spinner } from '@gate-breaker/ui';
import { AdminLayout } from '@/components/admin-layout';
import type { User, PaginatedResponse } from '@gate-breaker/types';

const LIMIT = 20;
const ROLE_LABELS: Record<User['role'], string> = {
  USER: '일반 유저',
  ADMIN: '관리자',
};

export default function UsersPage() {
  const router = useRouter();
  const [data, setData] = useState<PaginatedResponse<User> | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await admin.users.list({ search: search || undefined, page, limit: LIMIT });
      setData(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '유저 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const totalPages = data ? Math.ceil(data.total / LIMIT) : 1;

  const tableHeaderStyle: React.CSSProperties = {
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: 13,
    fontWeight: 600,
    color: '#aaa',
    borderBottom: '1px solid #333',
  };

  const tableCellStyle: React.CSSProperties = {
    padding: '12px 16px',
    fontSize: 14,
    color: '#eee',
    borderBottom: '1px solid #333',
  };

  return (
    <AdminLayout>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24, color: '#eee' }}>
        유저 관리
      </h1>

      <form onSubmit={handleSearch} style={{ marginBottom: 24, display: 'flex', gap: 12 }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="닉네임 또는 이메일로 검색"
          style={{
            flex: 1,
            maxWidth: 400,
            backgroundColor: '#1a1a2e',
            border: '1px solid #2a2a4a',
            borderRadius: 6,
            padding: '10px 14px',
            color: '#eee',
            outline: 'none',
            fontSize: 14,
          }}
        />
        <button
          type="submit"
          style={{
            backgroundColor: '#6c5ce7',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '10px 20px',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          검색
        </button>
      </form>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}>
          <Spinner />
        </div>
      )}

      {error && (
        <p style={{ color: '#e94560', textAlign: 'center', padding: 32 }}>{error}</p>
      )}

      {!loading && !error && data && (
        <>
          {data.data.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#888', padding: '60px 0' }}>검색 결과가 없습니다.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {data.data.map((user) => (
                <div
                  key={user.id}
                  onClick={() => router.push(`/users/${user.id}`)}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.backgroundColor = '#252545';
                    (e.currentTarget as HTMLDivElement).style.borderColor = '#6c5ce740';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.backgroundColor = '#1a1a2e';
                    (e.currentTarget as HTMLDivElement).style.borderColor = '#2a2a4a';
                  }}
                  style={{
                    backgroundColor: '#1a1a2e',
                    borderRadius: 12,
                    border: '1px solid #2a2a4a',
                    padding: '16px 20px',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s, border-color 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div>
                      <p style={{ fontSize: 15, fontWeight: 700, color: '#eee' }}>{user.nickname}</p>
                      <p style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{user.email}</p>
                    </div>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 600,
                        backgroundColor: user.role === 'ADMIN' ? '#6c5ce730' : '#2a2a4a',
                        color: user.role === 'ADMIN' ? '#6c5ce7' : '#aaa',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {ROLE_LABELS[user.role]}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
                    <div style={{ backgroundColor: '#12122a', borderRadius: 8, padding: '6px 12px', flex: 1 }}>
                      <p style={{ fontSize: 11, color: '#888', marginBottom: 1 }}>레벨</p>
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#eee' }}>{user.level}</p>
                    </div>
                    <div style={{ backgroundColor: '#12122a', borderRadius: 8, padding: '6px 12px', flex: 1 }}>
                      <p style={{ fontSize: 11, color: '#888', marginBottom: 1 }}>골드</p>
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#fbbf24' }}>{user.gold.toLocaleString()}</p>
                    </div>
                  </div>
                  <p style={{ fontSize: 11, color: '#555' }}>가입: {new Date(user.createdAt).toLocaleDateString('ko-KR')}</p>
                </div>
              ))}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 16,
              marginTop: 24,
            }}
          >
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              style={{
                backgroundColor: page <= 1 ? '#1a1a2e' : '#6c5ce7',
                color: page <= 1 ? '#555' : '#fff',
                border: '1px solid #2a2a4a',
                borderRadius: 6,
                padding: '8px 20px',
                fontSize: 14,
                cursor: page <= 1 ? 'not-allowed' : 'pointer',
              }}
            >
              이전
            </button>
            <span style={{ color: '#aaa', fontSize: 14 }}>
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              style={{
                backgroundColor: page >= totalPages ? '#1a1a2e' : '#6c5ce7',
                color: page >= totalPages ? '#555' : '#fff',
                border: '1px solid #2a2a4a',
                borderRadius: 6,
                padding: '8px 20px',
                fontSize: 14,
                cursor: page >= totalPages ? 'not-allowed' : 'pointer',
              }}
            >
              다음
            </button>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
