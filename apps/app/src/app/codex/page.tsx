'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCodexModal } from '@/context/codex-modal-context';

export default function CodexPage() {
  const router = useRouter();
  const { open } = useCodexModal();

  useEffect(() => {
    open();
    router.replace('/dashboard');
  }, [open, router]);

  return null;
}
