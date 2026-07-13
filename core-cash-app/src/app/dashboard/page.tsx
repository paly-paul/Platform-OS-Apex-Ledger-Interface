'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/hooks/redux';
import Topbar from './_components/Topbar';
import Sidebar from './_components/Sidebar';
import ChatPopup from './_components/ChatPopup';
import { type PageId } from '@/features/ui/uiSlice';

import SummaryPage from '@/features/summary/SummaryPage';
import DebriefPage from '@/features/debrief/DebriefPage';
import UploadsPage from '@/features/uploads/UploadsPage';
import AccountMasterPage from '@/features/account-master/AccountMasterPage';
import PerformancePage from '@/features/performance/PerformancePage';
import HistoricalRoiPage from '@/features/historical-roi/HistoricalRoiPage';
import CashflowPage from '@/features/cashflow/CashflowPage';
import ForecastPage from '@/features/forecast/ForecastPage';
import TaxPage from '@/features/tax/TaxPage';
import BenchmarkingPage from '@/features/benchmarking/BenchmarkingPage';
import CorpActionsPage from '@/features/corp-actions/CorpActionsPage';
import ConcentrationPage from '@/features/concentration/ConcentrationPage';
import AuditPage from '@/features/audit/AuditPage';
import SettingsPage from '@/features/settings/SettingsPage';

const PAGE_MAP: Record<PageId, React.ComponentType> = {
  summary: SummaryPage,
  debrief: DebriefPage,
  uploads: UploadsPage,
  'account-master': AccountMasterPage,
  performance: PerformancePage,
  'historical-roi': HistoricalRoiPage,
  cashflow: CashflowPage,
  forecast: ForecastPage,
  tax: TaxPage,
  benchmarking: BenchmarkingPage,
  'corp-actions': CorpActionsPage,
  concentration: ConcentrationPage,
  audit: AuditPage,
  settings: SettingsPage,
};

export default function DashboardPage() {
  const router = useRouter();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const sidebarCollapsed = useAppSelector((s) => s.ui.sidebarCollapsed);
  const activePage = useAppSelector((s) => s.ui.activePage);

  // Client-side auth guard — middleware-based protection to be added when real auth is wired.
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  const ActivePage = PAGE_MAP[activePage];

  return (
    <div className="flex h-screen">
      <Topbar />
      <Sidebar />

      {/* Main content area */}
      <main
        className="mt-topbar overflow-y-auto flex-1"
        style={{
          marginLeft: sidebarCollapsed ? 'var(--sidebar-w-collapsed)' : 'var(--sidebar-w)',
          height: 'calc(100vh - 56px)',
          padding: '28px 32px',
          transition: 'margin .2s ease',
        }}
      >
        <ActivePage />
      </main>

      <ChatPopup />
    </div>
  );
}
