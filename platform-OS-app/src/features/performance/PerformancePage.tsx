'use client';

import { useState, useMemo } from 'react';
import { accountMasterData, perfSeed, riaAdvisors, mandatesForAdvisor } from '@/lib/mock-data';

const perfEntitiesByLayer: Record<string, string[]> = {
  COMPANY: accountMasterData.filter(e => e.type === 'COMPANY').map(e => e.name),
  INDIVIDUAL: accountMasterData.filter(e => e.type === 'INDIVIDUAL').map(e => e.name),
};

const sourceByLayer: Record<string, string> = {
  GROUP: 'fund_flow_transaction + asset_valuation (all entities)',
  COMPANY: 'corporate_holding + asset_valuation',
  FAMILY: 'individual_holding + asset_valuation (family roll-up)',
  INDIVIDUAL: 'individual_holding + asset_valuation (AA/CAS-sourced)',
};

const assetTypes = ['EQUITY', 'MUTUAL_FUND', 'AIF', 'DEBT', 'CASH_EQUIVALENT'];
const periods = ['1mo', '3mo', '6mo', '12mo'];

function ridsWithAttribution() {
  return riaAdvisors.filter(r => mandatesForAdvisor(r.code).length > 0);
}

type Lens = 'ENTITY' | 'RIA';
type Layer = 'GROUP' | 'COMPANY' | 'FAMILY' | 'INDIVIDUAL';

export default function PerformancePage() {
  const [lens, setLens] = useState<Lens>('ENTITY');
  const [layer, setLayer] = useState<Layer>('GROUP');
  const [entity, setEntity] = useState(perfEntitiesByLayer['COMPANY'][0] ?? '');
  const [riaCode, setRiaCode] = useState(ridsWithAttribution()[0]?.code ?? '');
  const [dateFrom, setDateFrom] = useState('2024-01-01');
  const [dateTo, setDateTo] = useState('2026-07-01');

  const showEntityField = lens === 'ENTITY' && (layer === 'COMPANY' || layer === 'INDIVIDUAL');

  const scopeLabel = useMemo(() => {
    if (lens === 'RIA') {
      const adv = riaAdvisors.find(r => r.code === riaCode);
      return adv ? `${riaCode} · ${adv.name}` : riaCode;
    }
    if (layer === 'COMPANY' || layer === 'INDIVIDUAL') return entity;
    return layer === 'FAMILY' ? 'Family Office' : 'Group';
  }, [lens, layer, entity, riaCode]);

  const sourceText = useMemo(() => {
    if (lens === 'RIA') return `individual_holding + corporate_holding + fund_flow_transaction, filtered by advisor_id = ${riaCode}`;
    return sourceByLayer[layer];
  }, [lens, layer, riaCode]);

  const riaMandateNote = useMemo(() => {
    if (lens !== 'RIA') return '';
    const mandates = mandatesForAdvisor(riaCode);
    return 'Aggregated across: ' + mandates.map(m => `${m.entity} (${m.start} – ${m.end ?? 'ongoing'})`).join(', ') + ". Never blended with unattributed activity or other RIAs' picks on the same entity.";
  }, [lens, riaCode]);

  const seed = perfSeed(scopeLabel + '|' + dateFrom + '|' + dateTo);
  const xirr = 8 + (seed % 1400) / 100;
  const twrr = xirr - 0.4 - ((seed >>> 3) % 300) / 100;
  const capitalCr = (5 + (seed % 400) / 10).toFixed(1);

  const rollingReturns = periods.map(p => {
    const pSeed = perfSeed(scopeLabel + p);
    const val = ((pSeed % 3000) / 100) - 5;
    return { p, val, pct: Math.min(100, Math.abs(val) * 3.2) };
  });

  const compVals = (() => {
    let remaining = 100;
    return assetTypes.map((t, i) => {
      const s = perfSeed(scopeLabel + t);
      let v = i === assetTypes.length - 1 ? remaining : Math.max(3, (s % 35));
      v = Math.min(v, remaining - (assetTypes.length - 1 - i) * 3);
      remaining -= v;
      return { type: t, val: Math.max(v, 0) };
    });
  })();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px] font-semibold text-ink mb-1">Performance (XIRR)</h1>
        <p className="text-sm text-ink-soft">Entity / RIA lens · XIRR & TWRR · US-06, US-07, US-24</p>
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
            <span>From:</span>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="border border-line rounded-lg px-3 py-1.5 text-[13px] bg-paper text-ink" />
            <span>To:</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="border border-line rounded-lg px-3 py-1.5 text-[13px] bg-paper text-ink" />
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
            {showEntityField && (
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
          <div className="text-[11px] uppercase tracking-widest text-ink-faint mb-1">XIRR</div>
          <div className={`text-3xl font-mono font-semibold ${xirr >= 0 ? 'text-verified' : 'text-alert'}`}>{xirr.toFixed(2)}%</div>
          <div className="text-[11px] text-ink-faint mt-1">{scopeLabel} · net of capital infusions/drawdowns</div>
        </div>
        <div className="bg-surface border border-line rounded-xl p-4">
          <div className="text-[11px] uppercase tracking-widest text-ink-faint mb-1">TWRR</div>
          <div className={`text-3xl font-mono font-semibold ${twrr >= 0 ? 'text-verified' : 'text-alert'}`}>{twrr.toFixed(2)}%</div>
          <div className="text-[11px] text-ink-faint mt-1">{scopeLabel} · time-weighted rate of return</div>
        </div>
        <div className="bg-surface border border-line rounded-xl p-4">
          <div className="text-[11px] uppercase tracking-widest text-ink-faint mb-1">Capital Deployed</div>
          <div className="text-3xl font-mono font-semibold text-ink">₹{capitalCr} Cr</div>
          <div className="text-[11px] text-ink-faint mt-1">{scopeLabel} · {dateFrom} to {dateTo}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Rolling returns */}
        <div className="bg-surface border border-line rounded-xl p-5">
          <div className="font-semibold text-ink text-[14px] mb-4">Rolling Returns</div>
          <div className="space-y-3">
            {rollingReturns.map(({ p, val, pct }) => (
              <div key={p} className="flex items-center gap-3 text-[13px]">
                <span className="w-10 text-ink-faint font-mono text-right">{p}</span>
                <div className="flex-1 h-2 bg-paper rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${val < 0 ? 'bg-alert' : 'bg-verified'}`} style={{ width: `${pct}%` }} />
                </div>
                <span className={`w-14 font-mono text-right ${val < 0 ? 'text-alert' : 'text-verified'}`}>{val >= 0 ? '+' : ''}{val.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Composition */}
        <div className="bg-surface border border-line rounded-xl p-5">
          <div className="font-semibold text-ink text-[14px] mb-4">Asset Composition</div>
          <div className="space-y-3">
            {compVals.map(({ type, val }) => (
              <div key={type} className="flex items-center gap-3 text-[13px]">
                <span className="w-28 text-ink-faint text-[12px]">{type.replace('_', ' ')}</span>
                <div className="flex-1 h-2 bg-paper rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-verified" style={{ width: `${val}%` }} />
                </div>
                <span className="w-10 font-mono text-right text-ink-soft">{val}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="text-[11px] text-ink-faint">Source: {sourceText}</div>
    </div>
  );
}
