'use client';

import { useState, useMemo } from 'react';
import { useAppDispatch } from '@/hooks/redux';
import { openChat } from '@/features/ui/uiSlice';
import { accountMasterData, perfSeed } from '@/lib/mock-data';

const benchAssetCatalog = [
  { name: 'Axis Bluechip Fund',         category: 'Large Cap' },
  { name: 'HDFC Mid-Cap Opportunities', category: 'Mid Cap' },
  { name: 'Reliance Industries',         category: 'Equity - Diversified' },
  { name: 'SBI Small Cap Fund',          category: 'Small Cap' },
  { name: 'ICICI Prudential Balanced',   category: 'Hybrid' },
  { name: 'Nippon India Liquid Fund',    category: 'Liquid' },
];

interface BenchRow {
  entity: string; asset: string; category: string;
  holdingReturn: number; categoryAvg: number; delta: number;
  flag: 'UNDER' | 'OVER'; mgrChange: boolean;
}

function buildRows(): BenchRow[] {
  const entities = accountMasterData.filter(e => e.type !== 'GROUP');
  const rows: BenchRow[] = [];
  entities.forEach(ent => {
    benchAssetCatalog.forEach(asset => {
      const s = perfSeed(ent.name + asset.name);
      if (s % 3 !== 0) return;
      const holdingReturn = ((s % 2400) / 100) - 2;
      const categoryAvg = holdingReturn - (((s >>> 6) % 800) / 100 - 2);
      const delta = holdingReturn - categoryAvg;
      rows.push({
        entity: ent.name, asset: asset.name, category: asset.category,
        holdingReturn, categoryAvg, delta,
        flag: delta < -1 ? 'UNDER' : 'OVER',
        mgrChange: (s % 7) === 0,
      });
    });
  });
  return rows;
}

const ALL_ROWS = buildRows();
const ALL_ENTITIES = ['ALL', ...Array.from(new Set(accountMasterData.filter(e => e.type !== 'GROUP').map(e => e.name)))];
const ALL_CATEGORIES = ['ALL', ...Array.from(new Set(benchAssetCatalog.map(a => a.category)))];

export default function BenchmarkingPage() {
  const dispatch = useAppDispatch();
  const [entityFilter, setEntityFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [flagFilter, setFlagFilter] = useState<'ALL' | 'UNDER'>('ALL');

  const filtered = useMemo(() => ALL_ROWS.filter(r =>
    (entityFilter === 'ALL' || r.entity === entityFilter) &&
    (categoryFilter === 'ALL' || r.category === categoryFilter) &&
    (flagFilter === 'ALL' || r.flag === flagFilter)
  ), [entityFilter, categoryFilter, flagFilter]);

  const underCount = filtered.filter(r => r.flag === 'UNDER').length;

  return (
    <div>
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold m-0 mb-1">Benchmarking</h1>
          <div className="text-xs text-ink-soft font-mono">VALUE RESEARCH INTEGRATION AGENT · HOLDING VS CATEGORY BENCHMARK</div>
        </div>
        <span className="font-mono text-[11px] font-semibold rounded-[10px] px-[9px] py-0.5 bg-alert-bg text-alert">
          {underCount} underperforming
        </span>
      </div>

      <div className="bg-surface border border-line rounded-[10px] p-[14px_16px] mb-4 flex items-center gap-4 flex-wrap">
        <FilterSelect label="Entity" value={entityFilter} onChange={setEntityFilter} options={ALL_ENTITIES} />
        <FilterSelect label="Category" value={categoryFilter} onChange={setCategoryFilter} options={ALL_CATEGORIES} />
        <div className="flex-1" />
        <ChipGroup
          options={[{ value: 'ALL', label: 'All' }, { value: 'UNDER', label: 'Underperforming Only' }]}
          active={flagFilter}
          onChange={(v) => setFlagFilter(v as 'ALL' | 'UNDER')}
        />
      </div>

      <div className="bg-surface border border-line rounded-[10px] p-[16px_18px]">
        <div className="flex items-center justify-between text-[13px] font-bold mb-[14px] pb-[10px] border-b border-line">
          <span>Holdings vs Category Benchmark</span>
          <span className="font-mono text-[11px] font-semibold rounded-[10px] px-[9px] py-0.5 bg-verified-bg text-verified">
            {filtered.length} holdings
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr className="text-left border-b border-line">
                {['Asset', 'Entity', 'Category', '12mo Return', 'Category Avg', 'Delta', 'Flag'].map(h => (
                  <th key={h} className="pb-2 pr-4 text-[10px] uppercase tracking-wider text-ink-faint font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="py-6 text-center text-ink-faint text-xs font-mono">No holdings match the current filters.</td></tr>
              ) : filtered.map((r, i) => (
                <tr key={i} className="border-b border-line last:border-b-0">
                  <td className="py-2 pr-4 font-medium">
                    {r.asset}
                    {r.mgrChange && <span className="ml-1.5 text-[10px] bg-paper border border-line rounded px-1.5 py-0.5 font-mono text-ink-soft" title="Fund manager change flagged">MGR CHANGE</span>}
                  </td>
                  <td className="py-2 pr-4 text-ink-soft">{r.entity}</td>
                  <td className="py-2 pr-4 text-ink-soft">{r.category}</td>
                  <td className="py-2 pr-4 font-mono">{r.holdingReturn.toFixed(1)}%</td>
                  <td className="py-2 pr-4 font-mono">{r.categoryAvg.toFixed(1)}%</td>
                  <td className={`py-2 pr-4 font-mono font-semibold ${r.flag === 'UNDER' ? 'text-alert' : 'text-verified'}`}>
                    {r.delta >= 0 ? '+' : ''}{r.delta.toFixed(1)}%
                  </td>
                  <td className="py-2">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${r.flag === 'UNDER' ? 'bg-alert-bg text-alert' : 'bg-verified-bg text-verified'}`}>
                      {r.flag === 'UNDER' ? 'Underperforming' : 'Outperforming'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-line text-[11px] text-ink-faint font-mono">
          <span className="w-[6px] h-[6px] rounded-full bg-verified inline-block" />
          Synced from Value Research · Source: Value Research Integration Agent vs asset_master.category
        </div>
      </div>

      <AskApexNudge dispatch={dispatch} queries={[
        'Which holdings have had a fund manager change recently?',
        'Show me the worst 3 underperformers group-wide',
      ]} />
    </div>
  );
}

export function FilterSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: string[];
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] uppercase tracking-wider text-ink-faint font-semibold">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="border border-line rounded-lg px-3 py-1.5 text-xs bg-paper text-ink font-mono focus:outline-none focus:border-verified min-w-[160px]"
      >
        {options.map(o => <option key={o} value={o}>{o === 'ALL' ? `All ${label}s` : o}</option>)}
      </select>
    </div>
  );
}

export function ChipGroup({ options, active, onChange }: {
  options: { value: string; label: string }[];
  active: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${active === o.value ? 'bg-ink text-surface border-ink' : 'bg-paper text-ink-soft border-line hover:border-ink-soft'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function AskApexNudge({ dispatch, queries }: { dispatch: ReturnType<typeof useAppDispatch>; queries: string[] }) {
  return (
    <div className="flex items-center gap-2 flex-wrap mt-[18px] py-[10px]">
      <span className="text-[11px] font-bold text-ink-faint uppercase tracking-[0.06em] mr-1 flex-shrink-0">Ask Apex</span>
      {queries.map(q => (
        <button
          key={q}
          onClick={() => dispatch(openChat())}
          className="text-[11.5px] px-3 py-1.5 rounded-2xl border border-transparent bg-transparent text-ink-soft cursor-pointer hover:border-line hover:bg-surface hover:text-ink transition-all"
        >
          {q}
        </button>
      ))}
    </div>
  );
}
