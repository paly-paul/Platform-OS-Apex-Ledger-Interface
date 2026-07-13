'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/hooks/redux';
import Topbar from './_components/Topbar';
import Sidebar from './_components/Sidebar';
import ChatPopup from './_components/ChatPopup';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const sidebarCollapsed = useAppSelector((s) => s.ui.sidebarCollapsed);

  // Client-side auth guard — middleware-based protection to follow when real auth is wired.
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen">
      <Topbar />
      <Sidebar />
      <main
        className="mt-topbar overflow-y-auto flex-1"
        style={{
          marginLeft: sidebarCollapsed ? 'var(--sidebar-w-collapsed)' : 'var(--sidebar-w)',
          height: 'calc(100vh - 56px)',
          padding: '28px 32px',
          transition: 'margin .2s ease',
        }}
      >
        {children}
      </main>
      <ChatPopup />
    </div>
  );
}
