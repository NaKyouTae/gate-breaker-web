'use client';

import type { FormEvent, ReactNode } from 'react';
import { Button, Modal } from '@gate-breaker/ui';

type AdminCrudModalFormProps = {
  isOpen: boolean;
  title: string;
  submitLabel?: string;
  loading?: boolean;
  onClose: () => void;
  onSubmit: () => void;
  children: ReactNode;
};

type AdminFormFieldProps = {
  label: string;
  children: ReactNode;
};

export function AdminCrudModalForm({
  isOpen,
  title,
  submitLabel = '저장',
  loading = false,
  onClose,
  onSubmit,
  children,
}: AdminCrudModalFormProps) {
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!loading) {
      onSubmit();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '70dvh',
          minHeight: 0,
        }}
      >
        <div
          style={{
            display: 'grid',
            gap: 14,
            overflowY: 'auto',
            minHeight: 0,
            paddingRight: 4,
          }}
        >
          {children}
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
            marginTop: 12,
            paddingTop: 10,
            borderTop: '1px solid rgba(255,255,255,0.08)',
            flexShrink: 0,
          }}
        >
          <Button type="button" variant="ghost" onClick={onClose}>취소</Button>
          <Button type="submit" loading={loading}>{submitLabel}</Button>
        </div>
      </form>
    </Modal>
  );
}

export function AdminFormField({ label, children }: AdminFormFieldProps) {
  return (
    <label style={{ display: 'grid', gap: 6 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#aaa' }}>{label}</span>
      {children}
    </label>
  );
}
