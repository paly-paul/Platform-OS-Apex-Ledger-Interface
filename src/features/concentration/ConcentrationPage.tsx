'use client';

import { useState, useMemo } from 'react';
import { useAppDispatch } from '@/hooks/redux';
import { accountMasterData, perfSeed, accountTagClass } from '@/lib/mock-data';
import { AskApexNudge } from '@/features/benchmarking/BenchmarkingPage';

const CONC_STOCKS = ['Reliance Industries', 'TCS Ltd', 'HDFC Bank Ltd', 'Infosys Ltd', 'ONGC Ltd'];
const GROUP_WIDE_EQUITY_BASE_CR = 40;

const LAYER_LABEL: Record<string, string> = {
  COMPANY: 'C', FAMILY: 'F', INDIVIDUAL: 'I',
};

const LAYER_COLORS: Record<string, string> = {
  'group-tag':      'bg-ink text-surface',
  'company-tag':    'bg-verified-bg text-verified',
  'family-tag':     'bg-amber-bg text-amber',
  'individual-tag': 'bg-paper text-ink-soft border border-line',
};

interface ConcResult {
  stock: string;
  holders: { entity: string; layer: string; exposureCr: number }[];
  combined: number;
  pct: number;
}

function buildConc(): ConcResult[] {
  const holderPool = accountMasterData.filter(e => e.type === 'INDIVIDUAL' || e.type === 'COMPANY' || e.type === 'FAMILY');
  return CONC_STOCKS.map(stock => {
    const holders: ConcResult['holders'] = [];
    holderPool.forEach(ent => {
      const s = perfSeed(ent.name + stock + 'conc');
      if (s % 3 === 0) {
        holders.push({ entity: ent.name, layer: ent.type, exposureCr: 0.3 + (s % 250) / 100 });
      }
    });
    const combined = holders.reduce((a, h) => a + h.exposureCr, 0);
    return { stock, holders, combined, pct: (combined / GROUP_WIDE_EQUITY_BASE_CR) * 100 };
  }).filter(r => r.holders.length > 0);
}

const ALL_CONC = buildConc();

export default function ConcentrationPage() {
  const dispatch = useAppDispatch();
  const [threshold, setThreshold] = useState(7);

  const results = useMemo(() =>
    ALL_CONC.map(r => ({ ...r, over: r.pct > threshold }))
  , [threshold]);

  const flaggedCount = results.filter(r => r.over).length;

  return (
    <div>
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold m-0 mb-1">Concentration Risk</h1>
          <div className="text-xs text-ink-soft font-mono">CROSS-LAYER EXPOSURE · CONCENTRATION &amp; COMPLIANCE RISK AGENT</div>
        </div>
        <span className="font-mono text-[11px] font-semibold rounded-[10px] px-[9px] py-0.5 bg-alert-bg text-alert">
          {flaggedCount} flagged
        </span>
      </div>

      {/* Threshold control */}
      <div className="bg-surface border border-line rounded-[10px] p-[14px_16px] mb-4 flex items-center gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-ink-faint font-semibold">
            Internal Concentration Guideline
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={threshold}
              min={1} max={30} step={0.5}
              onChange={e => setThreshold(parseFloat(e.target.value) || 7)}
              className="border border-line rounded-lg px-3 py-1.5 text-xs bg-paper text-ink font-mono w-24 focus:outline-none focus:border-verified"
            />
            <span className="text-[11px] text-ink-soft font-mono">% of group-wide equity holdings in a single issuer</span>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="flex flex-col gap-3">
        {results.length === 0 ? (
          <div className="bg-surface border border-line rounded-[10px] p-8 text-center text-ink-faint text-xs font-mono">
            No cross-layer holdings detected for the tracked issuer list.
          </div>
        ) : results.map(r => (
          <div
            key={r.stock}
            className={`bg-surface border rounded-[10px] p-[16px_18px] ${r.over ? 'border-alert/50 bg-alert-bg/30' : 'border-line'}`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-[14px]">{r.stock}</span>
              <span className={`font-mono text-[12px] font-semibold ${r.over ? 'text-alert' : 'text-verified'}`}>
                {r.pct.toFixed(1)}%{r.over ? ' ⚠ above guideline' : ' of group-wide equity'}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 mb-2">
              {r.holders.map((h, i) => {
                const tagClass = accountTagClass(h.layer as any);
                const colorClass = LAYER_COLORS[tagClass] ?? 'bg-paper text-ink-soft';
                return (
                  <span key={i} className="flex items-center gap-1 text-[11px] bg-paper border border-line rounded-lg px-2.5 py-1 font-mono">
                    <span className={`text-[9px] font-bold w-4 h-4 rounded flex items-center justify-center ${colorClass}`}>
                      {LAYER_LABEL[h.layer] ?? h.layer[0]}
                    </span>
                    {h.entity} · ₹{h.exposureCr.toFixed(2)} Cr
                  </span>
                );
              })}
            </div>
            <div className="text-[11px] text-ink-soft font-mono">
              Combined exposure: ₹{r.combined.toFixed(2)} Cr across {r.holders.length} holder(s) · guideline: {threshold}%
            </div>
          </div>
        ))}
      </div>

      <AskApexNudge dispatch={dispatch} queries={[
        'Which single-issuer exposures are closest to breaching the guideline?',
        'Show every entity holding Reliance Industries',
      ]} />
    </div>
  );
}
