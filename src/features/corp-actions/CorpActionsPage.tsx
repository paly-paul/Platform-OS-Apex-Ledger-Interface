'use client';

import { useState, useMemo } from 'react';
import { useAppDispatch } from '@/hooks/redux';
import { openChat } from '@/features/ui/uiSlice';
import { accountMasterData, perfSeed } from '@/lib/mock-data';
import { FilterSelect, ChipGroup, AskApexNudge } from '@/features/benchmarking/BenchmarkingPage';

const CA_ASSETS = ['Reliance Industries', 'TCS Ltd', 'HDFC Bank Ltd', 'Infosys Ltd', 'ONGC Ltd'];
const CA_TYPES = ['BONUS', 'SPLIT', 'RIGHTS', 'MERGER'] as const;
type CaType = typeof CA_TYPES[number];

const CA_TERMS: Record<CaType, string[]> = {
  BONUS:  ['1:1 bonus issue', '1:2 bonus issue'],
  SPLIT:  ['Face value split ₹10 → ₹2', 'Face value split ₹5 → ₹1'],
  RIGHTS: ['Rights issue 1:5 @ ₹450', 'Rights issue 1:10 @ ₹620'],
  MERGER: ['Scheme of amalgamation — swap ratio 3:2', 'Merger — swap ratio 1:1'],
};

const CA_TYPE_COLORS: Record<CaType, string> = {
  BONUS:  'bg-verified-bg text-verified',
  SPLIT:  'bg-amber-bg text-amber',
  RIGHTS: 'bg-tax-gold-bg text-tax-gold-strong',
  MERGER: 'bg-alert-bg text-alert',
};

interface CaRow {
  id: string; entity: string; asset: string; type: CaType;
  terms: string; effDate: string; impact: string;
}

const TODAY = new Date('2026-07-08');

function buildCaRows(): CaRow[] {
  const entities = accountMasterData.filter(e => e.type === 'COMPANY' || e.type === 'INDIVIDUAL');
  const rows: CaRow[] = [];
  entities.forEach(ent => {
    CA_ASSETS.forEach(asset => {
      const s = perfSeed(ent.name + asset + 'ca');
      if (s % 4 !== 0) return;
      const type = CA_TYPES[s % CA_TYPES.length];
      const terms = CA_TERMS[type][(s >>> 4) % CA_TERMS[type].length];
      const daysOut = (s % 55) + 3;
      const effDate = new Date(TODAY);
      effDate.setDate(effDate.getDate() + daysOut);
      rows.push({
        id: 'ca-' + ent.name.replace(/\s+/g, '') + '-' + asset.replace(/\s+/g, ''),
        entity: ent.name, asset, type, terms,
        effDate: effDate.toISOString().slice(0, 10),
        impact: type === 'MERGER' ? 'Cost basis recalculated on swap completion' : 'Acquisition cost auto-adjusted on effective date',
      });
    });
  });
  return rows.sort((a, b) => a.effDate.localeCompare(b.effDate));
}

const ALL_CA_ROWS = buildCaRows();
const CA_ENTITY_OPTIONS = ['ALL', ...Array.from(new Set(ALL_CA_ROWS.map(r => r.entity)))];
const CA_TYPE_OPTIONS = [
  { value: 'ALL', label: 'All Types' },
  ...CA_TYPES.map(t => ({ value: t, label: t })),
];

export default function CorpActionsPage() {
  const dispatch = useAppDispatch();
  const [entityFilter, setEntityFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [acknowledged, setAcknowledged] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState('');

  const filtered = useMemo(() => ALL_CA_ROWS.filter(r =>
    (entityFilter === 'ALL' || r.entity === entityFilter) &&
    (typeFilter === 'ALL' || r.type === typeFilter)
  ), [entityFilter, typeFilter]);

  function acknowledge(id: string) {
    setAcknowledged(prev => ({ ...prev, [id]: true }));
    setToast('Corporate action acknowledged — cost basis adjustment will apply on the effective date.');
    setTimeout(() => setToast(''), 2400);
  }

  return (
    <div>
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-ink text-surface text-xs font-mono px-4 py-2 rounded-lg z-50 shadow-lg">
          {toast}
        </div>
      )}

      <div className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold m-0 mb-1">Corporate Actions</h1>
          <div className="text-xs text-ink-soft font-mono">CORPORATE ACTIONS TRACKING AGENT · COST BASIS AUTO-ADJUSTMENT</div>
        </div>
        <span className="font-mono text-[11px] font-semibold rounded-[10px] px-[9px] py-0.5 bg-alert-bg text-alert">
          {filtered.length} upcoming
        </span>
      </div>

      <div className="bg-surface border border-line rounded-[10px] p-[14px_16px] mb-4 flex items-center gap-4 flex-wrap">
        <FilterSelect label="Entity" value={entityFilter} onChange={setEntityFilter} options={CA_ENTITY_OPTIONS} />
        <div className="flex-1" />
        <ChipGroup options={CA_TYPE_OPTIONS} active={typeFilter} onChange={setTypeFilter} />
      </div>

      <div className="bg-surface border border-line rounded-[10px] p-[16px_18px]">
        <div className="text-[13px] font-bold mb-[14px] pb-[10px] border-b border-line">
          Upcoming &amp; Recent Corporate Actions
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr className="text-left border-b border-line">
                {['Asset', 'Entity Holding', 'Action', 'Terms', 'Effective Date', 'Cost Basis Impact', ''].map(h => (
                  <th key={h} className="pb-2 pr-4 text-[10px] uppercase tracking-wider text-ink-faint font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="py-6 text-center text-ink-faint text-xs font-mono">No corporate actions match the current filters.</td></tr>
              ) : filtered.map(r => (
                <tr key={r.id} className="border-b border-line last:border-b-0">
                  <td className="py-2 pr-4 font-medium">{r.asset}</td>
                  <td className="py-2 pr-4 text-ink-soft">{r.entity}</td>
                  <td className="py-2 pr-4">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${CA_TYPE_COLORS[r.type]}`}>{r.type}</span>
                  </td>
                  <td className="py-2 pr-4 text-ink-soft">{r.terms}</td>
                  <td className="py-2 pr-4 font-mono">{r.effDate}</td>
                  <td className="py-2 pr-4 text-ink-soft">{r.impact}</td>
                  <td className="py-2">
                    {acknowledged[r.id]
                      ? <span className="text-[10px] font-semibold text-verified bg-verified-bg px-2 py-0.5 rounded">Acknowledged</span>
                      : <button onClick={() => acknowledge(r.id)} className="text-[11px] font-semibold px-[10px] py-[5px] rounded-[6px] border border-line bg-paper text-ink cursor-pointer">Acknowledge</button>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AskApexNudge dispatch={dispatch} queries={[
        'Which of my holdings has a merger pending this quarter?',
        'Show cost basis adjustments applied this month',
      ]} />
    </div>
  );
}
