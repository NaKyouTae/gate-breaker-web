import type { Metadata } from 'next';
import { ToastProvider } from '@gate-breaker/ui';
import { AdminAuthProvider } from '@/context/admin-auth-context';
import './globals.css';

export const metadata: Metadata = {
  title: 'Gate Breaker Admin',
  description: 'Gate Breaker 관리자 대시보드',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body style={{ backgroundColor: '#0f0f1a', color: '#eeeeee' }}>
        <ToastProvider>
          <AdminAuthProvider>
            {children}
          </AdminAuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
