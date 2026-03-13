import type { Metadata, Viewport } from 'next';
import { ToastProvider } from '@gate-breaker/ui';
import { AuthProvider } from '@/context/auth-context';
import { Nav } from '@/components/nav';
import './globals.css';

export const metadata: Metadata = {
  title: 'Gate Breaker',
  description: '문을 부수고 던전을 정복하라 - 텍스트 기반 RPG 게임',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <div className="mobile-shell">
          <AuthProvider>
            <ToastProvider>
              <Nav />
              <div className="mobile-shell-inner">
                <main
                  style={{
                    paddingTop: '58px',
                    paddingBottom: '72px',
                    minHeight: '100%',
                  }}
                >
                  {children}
                </main>
              </div>
            </ToastProvider>
          </AuthProvider>
        </div>
      </body>
    </html>
  );
}
