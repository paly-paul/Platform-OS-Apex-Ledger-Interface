import type { Metadata } from 'next';
import './globals.css';
import StoreProvider from '@/lib/StoreProvider';

export const metadata: Metadata = {
  title: 'Apex Portfolio OS',
  description: 'Family Office & Tax Portfolio Intelligence Platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
