'use client';

import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { logout } from '@/features/auth/authSlice';
import { useRouter } from 'next/navigation';

export default function Topbar() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const sidebarCollapsed = useAppSelector((s) => s.ui.sidebarCollapsed);

  function handleLogout() {
    dispatch(logout());
    router.replace('/login');
  }

  return (
    <div
      className="fixed top-0 left-0 right-0 h-topbar bg-surface border-b border-line flex items-center px-5 gap-7 z-20"
      style={{ transition: 'padding-left .2s ease' }}
    >
      {/* Brand */}
      <div
        className="flex items-center gap-3 font-bold text-[13px] flex-shrink-0 overflow-hidden"
        style={{
          width: sidebarCollapsed ? 'calc(var(--sidebar-w-collapsed) - 20px)' : 'calc(var(--sidebar-w) - 20px)',
          transition: 'width .2s ease',
        }}
      >
        <div className="flex-shrink-0 flex items-center h-topbar">
          <div className="w-6 h-6 rounded bg-ink flex items-center justify-center text-surface text-[10px] font-bold font-mono">
            AX
          </div>
        </div>
        <div
          className="w-px h-5 bg-line flex-shrink-0"
          style={{ opacity: sidebarCollapsed ? 0 : 1, width: sidebarCollapsed ? 0 : 1, transition: 'opacity .15s ease' }}
        />
        <span
          className="whitespace-nowrap text-ink-soft font-semibold tracking-[0.01em] text-[13px]"
          style={{ opacity: sidebarCollapsed ? 0 : 1, width: sidebarCollapsed ? 0 : undefined, transition: 'opacity .15s ease', overflow: 'hidden' }}
        >
          Portfolio OS
        </span>
      </div>

      {/* Stat strip */}
      <div className="flex gap-[26px] flex-1">
        <Stat label="Group Liquidity" value="₹42.8 Cr" kind="good" />
        <Stat label="Group XIRR" value="14.62%" kind="good" />
        <Stat label="Deficit Alerts" value="1 open" kind="warn" />
        <Stat label="Tax Rule Review" value="2 pending" kind="tax" />
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-[14px] flex-shrink-0">
        <div className="flex items-center gap-1.5 text-xs font-semibold px-3 py-[7px] border border-line rounded-lg bg-paper cursor-pointer flex-shrink-0">
          <span className="text-ink-faint font-medium uppercase text-[10px] tracking-[0.06em]">Layer</span>
          <span>Group ▾</span>
        </div>
        <span className="font-mono text-[11px] text-ink-faint">AS OF 07 JUL 2026 · 11:20 IST</span>
        <IconBtn title="Refresh">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.13-3.36L23 10M1 14l5.36 4.36A9 9 0 0020.49 15"/>
          </svg>
        </IconBtn>
        <IconBtn title="Alerts" badge="3">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
          </svg>
        </IconBtn>
        <button
          onClick={handleLogout}
          title="Log out"
          className="w-8 h-8 rounded-lg border border-line bg-surface flex items-center justify-center text-ink-soft hover:text-alert hover:border-alert/40 transition-colors cursor-pointer"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
        <div className="w-8 h-8 rounded-full bg-ink text-surface text-[11px] font-semibold flex items-center justify-center font-mono">
          JD
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, kind }: { label: string; value: string; kind: 'good' | 'warn' | 'tax' }) {
  const colorClass =
    kind === 'good' ? 'text-verified' :
    kind === 'warn' ? 'text-amber' :
    'text-tax-gold-strong';

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-[0.07em] text-ink-faint font-semibold">{label}</span>
      <span className={`font-mono text-sm font-semibold ${colorClass}`}>{value}</span>
    </div>
  );
}

function IconBtn({ children, title, badge }: { children: React.ReactNode; title?: string; badge?: string }) {
  return (
    <div
      title={title}
      className="w-8 h-8 rounded-lg border border-line bg-surface flex items-center justify-center cursor-pointer text-ink-soft relative"
    >
      {children}
      {badge && (
        <span className="absolute -top-[3px] -right-[3px] w-[14px] h-[14px] rounded-full bg-alert text-white text-[9px] flex items-center justify-center font-mono">
          {badge}
        </span>
      )}
    </div>
  );
}
