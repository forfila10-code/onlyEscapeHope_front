import type { Metadata } from 'next';
import './globals.css';
import AppProviders from '../components/AppProviders';

export const metadata: Metadata = {
  title: 'PocketFree',
  description: '우리 부부의 현명한 가계부',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <div className="app-shell">
          <AppProviders>{children}</AppProviders>
        </div>
      </body>
    </html>
  );
}
