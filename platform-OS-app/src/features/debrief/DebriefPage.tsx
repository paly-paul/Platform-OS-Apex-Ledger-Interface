'use client';

import { useState } from 'react';
import { useAppDispatch } from '@/hooks/redux';
import { useRouter } from 'next/navigation';

export default function DebriefPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  void dispatch;
  const [checked, setChecked] = useState({ 'agenda-1': false, 'agenda-2': false, 'agenda-3': false });
  const [finalized, setFinalized] = useState(false);
  const [toast, setToast] = useState('');

  function toggleAgenda(id: keyof typeof checked) {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function finalizeAgenda() {
    const allChecked = Object.values(checked).every(Boolean);
    if (!allChecked) {
      setToast('Check off each agenda item before finalizing.');
      setTimeout(() => setToast(''), 2400);
      return;
    }
    setFinalized(true);
  }

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold m-0 mb-1">De-Briefing</h1>
        <div className="text-xs text-ink-soft font-mono">GROUP LAYER · WEEK OF 30 JUN – 06 JUL 2026</div>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-ink text-surface text-xs font-mono px-4 py-2 rounded-lg z-50 shadow-lg">
          {toast}
        </div>
      )}

      <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {/* Prep */}
        <div className="bg-surface border border-line rounded-[10px] p-[16px_18px]">
          <div className="flex items-center justify-between text-[13px] font-bold mb-[14px] pb-[10px] border-b border-line">
            <span>Prep — Next Review</span>
            <span className="font-mono text-[11px] font-semibold rounded-[10px] px-[9px] py-0.5 bg-alert-bg text-alert">08 Jul, 15:00 IST</span>
          </div>
          <div className="flex flex-col gap-1.5 mb-[14px] pb-[14px] border-b border-line">
            <DRow label="Attendees" value="Group CFO · Family Office Lead" />
            <DRow label="Group Liquidity" value="₹42.8 Cr" valueClass="text-verified" />
            <DRow label="Open Forecast Scenarios" value="2 active" />
          </div>
          {(['agenda-1', 'agenda-2', 'agenda-3'] as const).map((id, i) => (
            <div
              key={id}
              className={`py-[9px] border-b border-line last:border-b-0 ${checked[id] ? 'opacity-50 line-through' : ''}`}
            >
              <label className="flex items-start gap-2 cursor-pointer text-[13px]">
                <input
                  type="checkbox"
                  checked={checked[id]}
                  onChange={() => toggleAgenda(id)}
                  className="mt-0.5 accent-verified"
                />
                <span>
                  {i === 0 && 'Decide on ₹1.2 Cr intercompany transfer to cover Company 4\'s projected 12-day deficit'}
                  {i === 1 && 'Approve Section 80M dividend distribution routing before the 18-day filing window closes'}
                  {i === 2 && 'Hold/redeem decision on Axis Bluechip Fund given 4.1% category underperformance'}
                </span>
              </label>
            </div>
          ))}
          <button
            onClick={finalizeAgenda}
            disabled={finalized}
            className={`mt-1.5 w-full py-[9px] rounded-lg text-white font-semibold text-xs cursor-pointer transition-colors ${finalized ? 'bg-verified' : 'bg-ink hover:bg-ink/90'}`}
          >
            {finalized ? 'Agenda Finalized ✓' : 'Mark Agenda Finalized'}
          </button>
        </div>

        {/* Wrap-up */}
        <div className="bg-surface border border-line rounded-[10px] p-[16px_18px]">
          <div className="flex items-center justify-between text-[13px] font-bold mb-[14px] pb-[10px] border-b border-line">
            <span>Wrap-Up — Past Period</span>
            <span className="font-mono text-[11px] font-semibold rounded-[10px] px-[9px] py-0.5 bg-verified-bg text-verified">3 logged</span>
          </div>
          {[
            {
              date: '01 Jul',
              title: 'Approved forecast scenario "Conservative Q3" for Company 4 receivable delay',
              meta: 'forecast_assumption · created_by: Family Office analyst',
            },
            {
              date: '03 Jul',
              title: 'Dismissed concentration risk flag — Reliance Industries (Family + Company 3)',
              meta: 'agent_run_log #A-3388 · exposure confirmed within revised tolerance',
            },
            {
              date: '05 Jul',
              title: 'Axis Bluechip Fund flagged for Q3 redemption review',
              meta: 'Value Research Integration Agent · queued for 08 Jul decision',
            },
          ].map((item) => (
            <div key={item.date} className="flex items-start gap-3 py-[9px] border-b border-line last:border-b-0">
              <div className="text-[11px] text-ink-faint font-mono flex-shrink-0 pt-0.5 w-12">{item.date}</div>
              <div className="flex-1">
                <div className="text-[13px] font-semibold mb-0.5">{item.title}</div>
                <div className="text-[11px] text-ink-soft font-mono">{item.meta}</div>
              </div>
              <button
                onClick={() => router.push('/dashboard/audit')}
                className="text-[11px] font-semibold px-[10px] py-[5px] rounded-[6px] border border-line bg-paper text-ink cursor-pointer flex-shrink-0"
                title="Full trail view on Audit Trail page"
              >
                View Trail
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DRow({ label, value, valueClass = '' }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-ink-faint">{label}</span>
      <span className={`font-mono font-semibold ${valueClass}`}>{value}</span>
    </div>
  );
}
