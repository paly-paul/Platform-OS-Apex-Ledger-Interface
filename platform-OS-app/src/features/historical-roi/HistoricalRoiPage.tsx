'use client';

import { useState, useMemo } from 'react';
import { accountMasterData, perfSeed, riaAdvisors, mandatesForAdvisor } from '@/lib/mock-data';

const hroiMarketEvents = [
  { date: '2022-01', title: 'Rate Hike Cycle Begins', meta: 'Central bank tightening cycle starts' },
  { date: '2023-03', title: 'Banking Sector Stress', meta: 'Regional banking liquidity shock' },
  { date: '2024-06', title: 'Election Volatility Window', meta: 'General election result uncertainty' },
  { date: '2025-04', title: 'Global Trade Policy Shock', meta: 'Tariff escalation correction' },
];

const perfEntitiesByLayer: Record<string, string[]> = {
  COMPANY: accountMasterData.filter(e => e.type === 'COMPANY').map(e => e.name),
  INDIVIDUAL: accountMasterData.filter(e => e.type === 'INDIVIDUAL').map(e => e.name),
};

const sourceByLayer: Record<string, string> = {
  GROUP: 'asset_valuation (monthly close, all entities)',
  COMPANY: 'corporate_holding + asset_valuation',
  FAMILY: 'individual_holding + asset_valuation (family roll-up)',
  INDIVIDUAL: 'individual_holding + asset_valuation (AA/CAS-sourced)',
};

type Lens = 'ENTITY' | 'RIA';
type Layer = 'GROUP' | 'COMPANY' | 'FAMILY' | 'INDIVIDUAL';

function monthsAgoLabel(offsetFromEnd: number, endDate: string) {
  const d = new Date(endDate);
  d.setMonth(d.getMonth() - offsetFromEnd);
  return d.toISOString().slice(0, 7);
}

function ridsWithAttribution() {
  return riaAdvisors.filter(r => mandatesForAdvisor(r.code).length > 0);
}

export default function HistoricalRoiPage() {
  const [lens, setLens] = useState<Lens>('ENTITY');
  const [layer, setLayer] = useState<Layer>('GROUP');
  const [entity, setEntity] = useState(perfEntitiesByLayer['COMPANY'][0] ?? '');
  const [riaCode, setRiaCode] = useState(ridsWithAttribution()[0]?.code ?? '');
  const [lookback, setLookback] = useState(36);

  const endDate = '2026-07-08';

  const scopeLabel = useMemo(() => {
    if (lens === 'RIA') {
      const adv = riaAdvisors.find(r => r.code === riaCode);
      return adv ? `${riaCode} · ${adv.name}` : riaCode;
    }
    if (layer === 'COMPANY' || layer === 'INDIVIDUAL') return entity;
    return layer === 'FAMILY' ? 'Family Office' : 'Group';
  }, [lens, layer, entity, riaCode]);

  const sourceText = useMemo(() => {
    if (lens === 'RIA') return `individual_holding + corporate_holding + asset_valuation, filtered by advisor_id = ${riaCode}`;
    return sourceByLayer[layer];
  }, [lens, layer, riaCode]);

  const riaMandateNote = useMemo(() => {
    if (lens !== 'RIA') return '';
    const mandates = mandatesForAdvisor(riaCode);
    return 'Aggregated across: ' + mandates.map(m => `${m.entity} (${m.start} – ${m.end ?? 'ongoing'})`).join(', ') + ". Never blended with unattributed activity or other RIAs' picks on the same entity.";
  }, [lens, riaCode]);

  const { months, stats } = useMemo(() => {
    const ms: { label: string; value: number }[] = [];
    let value = 100;
    for (let i = lookback; i >= 0; i--) {
      const label = monthsAgoLabel(i, endDate);
      const isEventMonth = hroiMarketEvents.some(e => e.date === label);
      const stepSeed = perfSeed(scopeLabel + label);
      let drift = ((stepSeed % 500) / 100) - 1.2;
      if (isEventMonth) drift -= 4 + ((stepSeed >>> 4) % 400) / 100;
      value = Math.max(30, value * (1 + drift / 100));
      ms.push({ label, value });
    }
    const startVal = ms[0].value;
    const endVal = ms[ms.length - 1].value;
    const absRoi = ((endVal - startVal) / startVal) * 100;
    const years = lookback / 12;
    const cagr = (Math.pow(endVal / startVal, 1 / years) - 1) * 100;
    let peak = ms[0].value, maxDd = 0;
    ms.forEach(m => {
      if (m.value > peak) peak = m.value;
      const dd = ((m.value - peak) / peak) * 100;
      if (dd < maxDd) maxDd = dd;
    });
    return { months: ms, stats: { absRoi, cagr, maxDd } };
  }, [scopeLabel, lookback]);

  const visibleEvents = hroiMarketEvents.filter(e => months.some(m => m.label === e.date));

  // SVG chart
  const w = 700, h = 220, padL = 36, padR = 12, padT = 14, padB = 24;
  const allVals = months.map(m => m.value);
  const minV = Math.min(...allVals);
  const maxV = Math.max(...allVals);
  const xFor = (i: number) => padL + (i / (months.length - 1)) * (w - padL - padR);
  const yFor = (v: number) => padT + (1 - (v - minV) / (maxV - minV || 1)) * (h - padT - padB);
  const linePoints = months.map((m, i) => `${xFor(i).toFixed(1)},${yFor(m.value).toFixed(1)}`).join(' ');
  const areaPoints = `${padL},${h - padB} ` + linePoints + ` ${xFor(months.length - 1).toFixed(1)},${h - padB}`;
  const yGridLines = [0, 0.5, 1].map(t => {
    const y = padT + t * (h - padT - padB);
    return <line key={t} x1={padL} y1={y} x2={w - padR} y2={y} stroke="var(--line)" strokeWidth="1" />;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px] font-semibold text-ink mb-1">Historical ROI</h1>
        <p className="text-sm text-ink-soft">Vintage analysis vs market cycles · US-08, US-24</p>
      </div>

      {/* Controls */}
      <div className="bg-surface border border-line rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex rounded-lg overflow-hidden border border-line">
            {(['ENTITY', 'RIA'] as Lens[]).map(l => (
              <button key={l} onClick={() => setLens(l)} className={`text-[12px] px-3 py-1.5 cursor-pointer ${lens === l ? 'bg-ink text-paper' : 'bg-paper text-ink-soft hover:bg-surface'}`}>{l === 'ENTITY' ? 'Entity Lens' : 'RIA Lens'}</button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-[13px] text-ink-soft">
            <span>Lookback:</span>
            <select value={lookback} onChange={e => setLookback(parseInt(e.target.value))} className="border border-line rounded-lg px-3 py-1.5 text-[13px] bg-paper text-ink">
              {[12, 24, 36, 48, 60].map(n => <option key={n} value={n}>{n} months</option>)}
            </select>
          </div>
        </div>

        {lens === 'ENTITY' && (
          <div className="flex items-center gap-2 flex-wrap">
            {(['GROUP', 'COMPANY', 'FAMILY', 'INDIVIDUAL'] as Layer[]).map(l => (
              <button
                key={l}
                onClick={() => {
                  setLayer(l);
                  if (l === 'COMPANY') setEntity(perfEntitiesByLayer['COMPANY'][0] ?? '');
                  if (l === 'INDIVIDUAL') setEntity(perfEntitiesByLayer['INDIVIDUAL'][0] ?? '');
                }}
                className={`text-[12px] px-3 py-1.5 rounded-full border cursor-pointer ${layer === l ? 'bg-ink text-paper border-ink' : 'bg-paper text-ink-soft border-line hover:bg-surface'}`}
              >{l}</button>
            ))}
            {(layer === 'COMPANY' || layer === 'INDIVIDUAL') && (
              <select value={entity} onChange={e => setEntity(e.target.value)} className="text-[13px] border border-line rounded-lg px-3 py-1.5 bg-paper text-ink">
                {perfEntitiesByLayer[layer].map(n => <option key={n}>{n}</option>)}
              </select>
            )}
          </div>
        )}

        {lens === 'RIA' && (
          <div>
            <select value={riaCode} onChange={e => setRiaCode(e.target.value)} className="text-[13px] border border-line rounded-lg px-3 py-1.5 bg-paper text-ink">
              {ridsWithAttribution().map(r => <option key={r.code} value={r.code}>{r.code} · {r.name}</option>)}
            </select>
            {riaMandateNote && <div className="text-[11px] text-ink-faint mt-2">{riaMandateNote}</div>}
          </div>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-surface border border-line rounded-xl p-4">
          <div className="text-[11px] uppercase tracking-widest text-ink-faint mb-1">Absolute ROI</div>
          <div className={`text-3xl font-mono font-semibold ${stats.absRoi >= 0 ? 'text-verified' : 'text-alert'}`}>{stats.absRoi >= 0 ? '+' : ''}{stats.absRoi.toFixed(1)}%</div>
          <div className="text-[11px] text-ink-faint mt-1">{scopeLabel} · last {lookback} months</div>
        </div>
        <div className="bg-surface border border-line rounded-xl p-4">
          <div className="text-[11px] uppercase tracking-widest text-ink-faint mb-1">CAGR</div>
          <div className={`text-3xl font-mono font-semibold ${stats.cagr >= 0 ? 'text-verified' : 'text-alert'}`}>{stats.cagr >= 0 ? '+' : ''}{stats.cagr.toFixed(1)}%</div>
          <div className="text-[11px] text-ink-faint mt-1">{scopeLabel} · annualised</div>
        </div>
        <div className="bg-surface border border-line rounded-xl p-4">
          <div className="text-[11px] uppercase tracking-widest text-ink-faint mb-1">Max Drawdown</div>
          <div className="text-3xl font-mono font-semibold text-alert">{stats.maxDd.toFixed(1)}%</div>
          <div className="text-[11px] text-ink-faint mt-1">{scopeLabel} · peak-to-trough</div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-surface border border-line rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-line flex items-center gap-3">
          <span className="font-semibold text-ink text-[15px]">Portfolio Index (base = 100)</span>
          <span className="text-[11px] bg-paper border border-line text-ink-soft rounded-full px-3 py-0.5 font-mono">{scopeLabel} · {lookback}mo</span>
        </div>
        <div className="px-5 py-4 overflow-x-auto">
          <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-[700px]" xmlns="http://www.w3.org/2000/svg">
            {yGridLines}
            <polygon points={areaPoints} fill="var(--verified-bg)" opacity="0.6" />
            <polyline points={linePoints} fill="none" stroke="var(--verified)" strokeWidth="2" />
            {visibleEvents.map(e => {
              const idx = months.findIndex(m => m.label === e.date);
              const x = xFor(idx).toFixed(1);
              return (
                <g key={e.date}>
                  <line x1={x} y1={padT} x2={x} y2={h - padB} stroke="var(--alert)" strokeWidth="1.2" strokeDasharray="3,3" opacity="0.55" />
                  <circle cx={x} cy={yFor(months[idx].value).toFixed(1)} r="3.5" fill="var(--alert)" />
                </g>
              );
            })}
            <text x={padL} y={h - 6} fontSize="10" fill="var(--ink-faint)" fontFamily="var(--font-mono)">{months[0]?.label}</text>
            <text x={w - padR} y={h - 6} fontSize="10" fill="var(--ink-faint)" fontFamily="var(--font-mono)" textAnchor="end">{months[months.length - 1]?.label}</text>
          </svg>
        </div>
      </div>

      {/* Market events */}
      <div className="bg-surface border border-line rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-line font-semibold text-ink text-[15px]">Market Events in Lookback Window</div>
        <div className="p-5">
          {visibleEvents.length === 0 ? (
            <div className="text-[13px] text-ink-faint">No labeled market events fall within this lookback window.</div>
          ) : (
            <div className="space-y-4">
              {visibleEvents.map(e => {
                const idx = months.findIndex(m => m.label === e.date);
                const impact = idx > 0 ? (((months[idx].value - months[idx - 1].value) / months[idx - 1].value) * 100).toFixed(1) : '—';
                return (
                  <div key={e.date} className="flex gap-4">
                    <div className="flex flex-col items-center pt-1">
                      <div className="w-2.5 h-2.5 rounded-full bg-alert flex-shrink-0" />
                      <div className="w-px flex-1 bg-line mt-1" />
                    </div>
                    <div className="pb-4">
                      <div className="font-mono text-[12px] text-alert">{e.date}</div>
                      <div className="font-medium text-ink text-[14px]">{e.title}</div>
                      <div className="text-[12px] text-ink-soft">{e.meta} · portfolio moved {impact}% that month</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="text-[11px] text-ink-faint">Source: {sourceText}</div>
    </div>
  );
}
