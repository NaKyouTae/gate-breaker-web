'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useCodexModal } from '@/context/codex-modal-context';

export default function CodexItemDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { open, goToItem } = useCodexModal();
  const id = params.id as string;

  useEffect(() => {
    open();
    goToItem(id);
    router.replace('/dashboard');
  }, [open, goToItem, id, router]);

  return null;
}
