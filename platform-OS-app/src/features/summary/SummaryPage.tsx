'use client';

import { useState, useEffect } from 'react';
import { useAppDispatch } from '@/hooks/redux';
import { useRouter } from 'next/navigation';
import { openChat } from '@/features/ui/uiSlice';

export default function SummaryPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [secsAgo, setSecsAgo] = useState(3);
  const [countdown, setCountdown] = useState(297);
  const [openDetails, setOpenDetails] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const interval = setInterval(() => {
      setSecsAgo((s) => s + 1);
      setCountdown((c) => (c <= 1 ? 300 : c - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  function toggleDetail(id: string) {
    setOpenDetails((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function askApex(query: string) {
    dispatch(openChat());
    // NOTE: pre-filling the chat input will be wired once ChatPopup exposes an imperative handle
    void query;
  }

  return (
    <div>
      {/* Page header */}
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold m-0 mb-1">AI Insights Summary</h1>
          <div className="text-xs text-ink-soft font-mono">ALL LAYERS · CROSS-ENTITY VIEW</div>
        </div>
        <div className="flex items-center gap-2 text-xs text-ink-soft font-mono bg-surface border border-line rounded-lg px-3 py-1.5 flex-shrink-0">
          <LiveDot />
          <span>Updated <strong>{secsAgo}s ago</strong></span>
          <span className="text-ink-faint">·</span>
          <span>Next refresh in {countdown}s</span>
        </div>
      </div>

      {/* Layer grid */}
      <div className="grid grid-cols-4 gap-[14px] mb-5">
        <LayerCard
          name="Group"
          status="Live"
          statusKind="live"
          metric="₹42.8 Cr"
          metricKind="good"
          sub="Consolidated liquidity · 10 companies + family"
        />
        <LayerCard
          name="Company (10)"
          status="1 stale feed"
          statusKind="stale"
          metric="₹28.1 Cr"
          sub="Company 4 in deficit watch — 12d to shortfall"
        />
        <LayerCard
          name="Family Office"
          status="Live"
          statusKind="live"
          metric="₹9.6 Cr"
          metricKind="good"
          sub="Net worth · 3 asset classes"
        />
        <LayerCard
          name="Individual (4)"
          status="Manual upload"
          statusKind="manual"
          metric="₹5.1 Cr"
          sub="Last CAS sync 2 days ago"
        />
      </div>

      {/* Alerts + Tax */}
      <div className="grid gap-4" style={{ gridTemplateColumns: '1.3fr 1fr' }}>
        {/* Exceptions panel */}
        <div className="bg-surface border border-line rounded-[10px] p-[16px_18px]">
          <div className="flex items-center justify-between text-[13px] font-bold mb-[14px] pb-[10px] border-b border-line">
            <span>Top Exceptions</span>
            <span className="font-mono text-[11px] font-semibold rounded-[10px] px-[9px] py-0.5 bg-alert-bg text-alert">3 open</span>
          </div>
          <ExceptionRow
            dotKind="alert"
            title="Company 4 — projected deficit in 12 days"
            meta="Predictive Liquidity Forecaster · high confidence · agent_run_log #A-3391"
            detailId="detail-1"
            detail="Projected shortfall of ₹1.2 Cr against the 15-day alert threshold. Driven by a delayed ₹20 Cr receivable and an upcoming advance tax tranche. No inter-corporate loan currently allocated to cover the gap."
            open={!!openDetails['detail-1']}
            onToggle={() => toggleDetail('detail-1')}
          />
          <ExceptionRow
            dotKind="amber"
            title="Axis Bluechip Fund underperforming category by 4.1%"
            meta="Value Research Integration Agent · Family Office holding"
            detailId="detail-2"
            detail="Trailing 12-month return of 9.8% vs. category average 13.9%. Fund manager change flagged 3 months ago. Held since 2021 — no exit load applies."
            open={!!openDetails['detail-2']}
            onToggle={() => toggleDetail('detail-2')}
          />
          <ExceptionRow
            dotKind="alert"
            title="Concentration risk — Reliance Industries held by Family + Company 3"
            meta="Concentration & Compliance Risk Agent · cross-layer flag"
            detailId="detail-3"
            detail="Combined exposure: ₹3.4 Cr (Family: ₹1.1 Cr, Company 3: ₹2.3 Cr) — 8.6% of group-wide equity holdings in a single issuer, above the 7% internal concentration guideline."
            open={!!openDetails['detail-3']}
            onToggle={() => toggleDetail('detail-3')}
          />
        </div>

        {/* Tax panel */}
        <div className="bg-tax-gold-bg border border-tax-gold rounded-[10px] p-[16px_18px]">
          <div className="flex items-center justify-between text-[13px] font-bold mb-[14px] pb-[10px] border-b border-tax-gold/30 text-tax-gold-strong">
            <span>Tax Assessment — AY 2027-28</span>
            <span className="font-mono text-[11px] font-semibold rounded-[10px] px-[9px] py-0.5 bg-tax-gold-bg text-tax-gold-strong border border-tax-gold/40">2 pending</span>
          </div>
          <div className="py-[10px] border-b border-tax-gold/25">
            <div className="text-[13px] font-semibold text-ink mb-0.5">Tax Rule Sentinel — 2 draft rule updates awaiting sign-off</div>
            <div className="text-[11px] text-tax-gold-strong font-mono">Income-tax Act 2025 section renumbering detected · not yet applied to live computation</div>
          </div>
          <div className="py-[10px]">
            <div className="text-[13px] font-semibold text-ink mb-0.5">Sec. 80M eligible dividends: ₹1.8 Cr across 4 companies</div>
            <div className="text-[11px] text-tax-gold-strong font-mono">Distribution window closes in 18 days for full deduction eligibility</div>
          </div>
          <button
            onClick={() => router.push('/dashboard/tax')}
            className="mt-2 w-full py-[9px] rounded-lg border-none bg-tax-gold-strong text-white font-semibold text-xs cursor-pointer hover:opacity-90 transition-opacity"
          >
            Open Tax Assessment →
          </button>
        </div>
      </div>

      {/* Ask Apex nudge */}
      <div className="flex items-center gap-2 flex-wrap mt-[18px] py-[10px] px-0.5">
        <span className="text-[11px] font-bold text-ink-faint uppercase tracking-[0.06em] mr-1 flex-shrink-0">Ask Apex</span>
        {[
          'Liquidity if Entity 4 delays ₹20 Cr receivable',
          'XIRR — Family vs Group, trailing 12mo',
          'Holdings breaching concentration limits today',
        ].map((q) => (
          <button
            key={q}
            onClick={() => askApex(q)}
            className="text-[11.5px] px-3 py-1.5 rounded-2xl border border-transparent bg-transparent text-ink-soft cursor-pointer hover:border-line hover:bg-surface hover:text-ink transition-all"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

function LiveDot() {
  return (
    <span className="w-[7px] h-[7px] rounded-full bg-verified relative flex-shrink-0 inline-block">
      <span
        className="absolute inset-[-4px] rounded-full border-[1.5px] border-verified"
        style={{ animation: 'pulse 2s ease-out infinite' }}
      />
    </span>
  );
}

function LayerCard({
  name, status, statusKind, metric, metricKind, sub,
}: {
  name: string;
  status: string;
  statusKind: 'live' | 'stale' | 'manual';
  metric: string;
  metricKind?: 'good';
  sub: string;
}) {
  const dotColor = statusKind === 'live' ? 'bg-verified' : statusKind === 'stale' ? 'bg-amber' : 'bg-ink-faint';
  return (
    <div className="bg-surface border border-line rounded-[10px] p-[16px_18px]">
      <div className="flex items-center justify-between mb-[10px]">
        <span className="text-[11px] uppercase tracking-[0.06em] text-ink-faint font-bold">{name}</span>
        <span className="flex items-center gap-1 text-[11px] text-ink-faint">
          <span className={`w-[6px] h-[6px] rounded-full ${dotColor} inline-block`} />
          {status}
        </span>
      </div>
      <div className={`font-mono text-2xl font-semibold mb-1.5 ${metricKind === 'good' ? 'text-verified' : ''}`}>{metric}</div>
      <div className="text-xs text-ink-soft">{sub}</div>
    </div>
  );
}

function ExceptionRow({
  dotKind, title, meta, detailId, detail, open, onToggle,
}: {
  dotKind: 'alert' | 'amber';
  title: string;
  meta: string;
  detailId: string;
  detail: string;
  open: boolean;
  onToggle: () => void;
}) {
  const dotColor = dotKind === 'alert' ? 'bg-alert' : 'bg-amber';
  return (
    <div className="flex items-start gap-[10px] py-[10px] border-b border-line last-of-type:border-b-0">
      <span className={`w-2 h-2 rounded-full mt-[5px] flex-shrink-0 ${dotColor}`} />
      <div className="flex-1">
        <div className="text-[13px] font-semibold mb-0.5">{title}</div>
        <div className="text-[11px] text-ink-soft font-mono">{meta}</div>
        {open && (
          <div className="text-xs text-ink-soft bg-paper rounded-[6px] px-[10px] py-2 mt-1.5 leading-[1.5]">
            {detail}
          </div>
        )}
      </div>
      <button
        onClick={onToggle}
        className="text-[11px] font-semibold px-[10px] py-[5px] rounded-[6px] border border-line bg-paper text-ink cursor-pointer flex-shrink-0"
      >
        {open ? 'Collapse' : 'Review'}
      </button>
    </div>
  );
}
