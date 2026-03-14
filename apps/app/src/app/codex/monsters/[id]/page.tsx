'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useCodexModal } from '@/context/codex-modal-context';

export default function CodexMonsterDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { open, goToMonster } = useCodexModal();
  const id = params.id as string;

  useEffect(() => {
    open();
    goToMonster(id);
    router.replace('/dashboard');
  }, [open, goToMonster, id, router]);

  return null;
}
