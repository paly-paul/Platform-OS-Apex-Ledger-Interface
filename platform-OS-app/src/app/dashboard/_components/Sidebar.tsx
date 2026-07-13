'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { toggleSidebar } from '@/features/ui/uiSlice';

interface NavItem {
  slug: string;
  label: string;
  badge?: string;
  taxMode?: boolean;
  icon: React.ReactNode;
}

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: 'Ingestion',
    items: [
      {
        slug: 'account-master',
        label: 'Account Master',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
          </svg>
        ),
      },
      {
        slug: 'uploads',
        label: 'Uploads',
        badge: '1',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/>
          </svg>
        ),
      },
    ],
  },
  {
    label: 'Reporting',
    items: [
      {
        slug: 'performance',
        label: 'Performance (XIRR)',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 3v18h18"/><path d="M18 17V9M13 17V5M8 17v-4"/>
          </svg>
        ),
      },
      {
        slug: 'historical-roi',
        label: 'Historical ROI',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12h4l3-9 4 18 3-9h4"/>
          </svg>
        ),
      },
    ],
  },
  {
    label: 'Liquidity',
    items: [
      {
        slug: 'cashflow',
        label: 'Fund Flow',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
          </svg>
        ),
      },
      {
        slug: 'forecast',
        label: 'Liquidity Forecast',
        badge: '1',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z"/>
          </svg>
        ),
      },
    ],
  },
  {
    label: 'Market Intel',
    items: [
      {
        slug: 'benchmarking',
        label: 'Benchmarking',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>
          </svg>
        ),
      },
      {
        slug: 'corp-actions',
        label: 'Corporate Actions',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
          </svg>
        ),
      },
      {
        slug: 'concentration',
        label: 'Concentration Risk',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
          </svg>
        ),
      },
    ],
  },
  {
    label: 'Tax',
    items: [
      {
        slug: 'tax',
        label: 'Tax Assessment',
        badge: '2',
        taxMode: true,
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
          </svg>
        ),
      },
    ],
  },
  {
    label: 'Insights',
    items: [
      {
        slug: 'summary',
        label: 'AI Summary',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/>
            <rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>
          </svg>
        ),
      },
      {
        slug: 'debrief',
        label: 'De-Briefing',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>
          </svg>
        ),
      },
    ],
  },
  {
    label: 'System',
    items: [
      {
        slug: 'audit',
        label: 'Audit Trail',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
          </svg>
        ),
      },
      {
        slug: 'settings',
        label: 'Settings',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/>
          </svg>
        ),
      },
    ],
  },
];

export default function Sidebar() {
  const dispatch = useAppDispatch();
  const collapsed = useAppSelector((s) => s.ui.sidebarCollapsed);
  const pathname = usePathname();

  return (
    <div
      className="fixed top-topbar bottom-0 left-0 bg-surface border-r border-line overflow-y-auto overflow-x-hidden flex flex-col z-[15]"
      style={{
        width: collapsed ? 'var(--sidebar-w-collapsed)' : 'var(--sidebar-w)',
        transition: 'width .2s ease',
      }}
    >
      {/* Seam strip */}
      <div
        className="absolute top-0 bottom-0 right-0 w-px"
        style={{
          backgroundImage: 'repeating-linear-gradient(to bottom, var(--line) 0, var(--line) 1px, transparent 1px, transparent 22px)',
        }}
      />

      {/* Collapse toggle */}
      <div className="flex justify-end p-[10px_12px]">
        <button
          onClick={() => dispatch(toggleSidebar())}
          className="w-6 h-6 rounded-[6px] border border-line bg-paper flex items-center justify-center text-ink-soft cursor-pointer"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            style={{ transform: collapsed ? 'rotate(180deg)' : undefined, transition: 'transform .2s ease' }}
          >
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
      </div>

      {navGroups.map((group) => (
        <NavGroup key={group.label} label={group.label} collapsed={collapsed}>
          {group.items.map((item) => (
            <NavItemLink
              key={item.slug}
              item={item}
              active={pathname === `/dashboard/${item.slug}`}
              collapsed={collapsed}
            />
          ))}
        </NavGroup>
      ))}
    </div>
  );
}

function NavGroup({ label, collapsed, children }: { label: string; collapsed: boolean; children: React.ReactNode }) {
  return (
    <div className="px-3 pb-[14px] pt-1">
      <div
        className="text-[10px] uppercase tracking-[0.08em] text-ink-faint font-bold px-2 py-[6px] whitespace-nowrap"
        style={{ opacity: collapsed ? 0 : 1, height: collapsed ? 0 : undefined, padding: collapsed ? 0 : undefined, overflow: 'hidden' }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function NavItemLink({
  item,
  active,
  collapsed,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
}) {
  const activeClass = item.taxMode
    ? 'bg-tax-gold-bg text-tax-gold-strong font-semibold border-l-2 border-tax-gold'
    : 'bg-verified-bg text-verified font-semibold border-l-2 border-verified';

  return (
    <Link
      href={`/dashboard/${item.slug}`}
      className={`flex items-center gap-[10px] px-[10px] py-[9px] rounded-lg text-[13px] font-medium text-ink-soft cursor-pointer whitespace-nowrap relative mb-0.5 border-l-2 border-transparent hover:bg-paper no-underline ${active ? activeClass : ''}`}
      style={{
        justifyContent: collapsed ? 'center' : undefined,
        padding: collapsed ? '9px' : undefined,
        textDecoration: 'none',
      }}
    >
      <div className="flex-shrink-0 w-[17px] h-[17px]">{item.icon}</div>
      <span
        className="overflow-hidden"
        style={{ opacity: collapsed ? 0 : 1, width: collapsed ? 0 : undefined, transition: 'opacity .15s ease' }}
      >
        {item.label}
      </span>
      {item.badge && (
        <span
          className={`font-mono text-[10px] bg-alert text-white rounded-[10px] px-[6px] py-px flex-shrink-0 ${collapsed ? 'absolute top-1 right-1 text-[0] w-2 h-2 p-0' : 'ml-auto'}`}
        >
          {collapsed ? '' : item.badge}
        </span>
      )}
    </Link>
  );
}
