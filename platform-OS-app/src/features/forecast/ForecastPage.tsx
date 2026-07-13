'use client';

import { useState, useMemo } from 'react';
import { perfSeed } from '@/lib/mock-data';
import { cfTreasuryBalances } from '@/features/cashflow/CashflowPage';

const lfEntities = cfTreasuryBalances.map(b => b.entity);
const lfMonths = ['2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12'];
const lfTypeLabels: Record<string, string> = {
  SURPLUS_FUND_DEPLOYMENT: 'Surplus Fund Deployment',
  RECEIVABLE_DELAY: 'Receivable Delay',
  TAX_PAYMENT_TIMING: 'Tax Payment Timing',
  INVESTMENT_ALLOCATION: 'Investment Allocation',
  OTHER: 'Other',
};

interface Scenario {
  id: string;
  label: string;
  entity: string;
  type: string;
  amount: number;
  startMonth: string;
  active: boolean;
}

function lfBuildSeries(entity: string, applyScenario: boolean, scenarios: Scenario[]) {
  const balanceRow = cfTreasuryBalances.find(b => b.entity === entity);
  let bal = balanceRow ? balanceRow.balance / 10000000 : 10;
  const activeScenarios = applyScenario ? scenarios.filter(s => s.entity === entity && s.active) : [];

  return lfMonths.map(m => {
    const s = perfSeed(entity + m + 'flow');
    const netFlow = ((s % 500) / 100) - 2.6;
    bal += netFlow;
    activeScenarios.forEach(sc => {
      if (sc.startMonth === m) bal -= sc.amount;
    });
    return { month: m, balance: bal };
  });
}

export default function ForecastPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [seq, setSeq] = useState(1);
  const [forecastMode, setForecastMode] = useState<'ACTUALS_ONLY' | 'WITH_SCENARIO'>('ACTUALS_ONLY');
  const [viewEntity, setViewEntity] = useState(lfEntities[0] ?? '');
  const [alertDays, setAlertDays] = useState(15);
  const [toastMsg, setToastMsg] = useState('');

  // New scenario form state
  const [newLabel, setNewLabel] = useState('');
  const [newEntity, setNewEntity] = useState(lfEntities[0] ?? '');
  const [newType, setNewType] = useState('SURPLUS_FUND_DEPLOYMENT');
  const [newAmount, setNewAmount] = useState('');
  const [newMonth, setNewMonth] = useState(lfMonths[0]);

  // Reject reason state per rule (forecast doesn't have this but kept for symmetry)
  const [rejectOpen, setRejectOpen] = useState<Record<string, boolean>>({});

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const createScenario = () => {
    const label = newLabel.trim();
    if (!label) { showToast('Give the scenario a name before creating it.'); return; }
    const amount = parseFloat(newAmount);
    if (!amount || amount <= 0) { showToast('Enter an amount greater than zero.'); return; }
    const id = 'scn-' + seq;
    setSeq(s => s + 1);
    setScenarios(prev => [...prev, { id, label, entity: newEntity, type: newType, amount, startMonth: newMonth, active: true }]);
    setNewLabel('');
    setNewAmount('');
    showToast(`Scenario "${label}" created — actuals untouched, this is an overlay only.`);
  };

  const toggleActive = (id: string) => setScenarios(prev => prev.map(s => s.id === id ? { ...s, active: !s.active } : s));
  const deleteScenario = (id: string) => setScenarios(prev => prev.filter(s => s.id !== id));

  const baseline = useMemo(() => lfBuildSeries(viewEntity, false, []), [viewEntity]);
  const scenarioSeries = useMemo(() =>
    forecastMode === 'WITH_SCENARIO' ? lfBuildSeries(viewEntity, true, scenarios) : null,
    [viewEntity, forecastMode, scenarios]
  );
  const activeLine = scenarioSeries ?? baseline;

  const today = new Date('2026-07-08');
  const deficitPoint = activeLine.find(p => p.balance < 0);
  let alertText = '';
  let alertOk = false;
  if (deficitPoint) {
    const deficitDate = new Date(deficitPoint.month + '-15');
    const daysAway = Math.round((deficitDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysAway <= alertDays) {
      alertText = `⚠ ${viewEntity} is projected to run a deficit around ${deficitPoint.month} — approximately ${Math.max(daysAway, 0)} day(s) away, inside your ${alertDays}-day alert threshold.`;
    } else {
      alertOk = true;
      alertText = `✓ ${viewEntity}: earliest projected deficit is ${deficitPoint.month} (~${daysAway} days out) — outside your ${alertDays}-day alert threshold.`;
    }
  } else {
    alertOk = true;
    alertText = `✓ ${viewEntity}: no deficit projected across the ${lfMonths.length}-month horizon.`;
  }

  // SVG chart
  const w = 700, h = 220, padL = 44, padR = 12, padT = 14, padB = 24;
  const allVals = baseline.map(p => p.balance).concat(scenarioSeries ? scenarioSeries.map(p => p.balance) : []);
  const minV = Math.min(0, ...allVals);
  const maxV = Math.max(...allVals, 1);
  const xFor = (i: number) => padL + (i / (lfMonths.length - 1)) * (w - padL - padR);
  const yFor = (v: number) => padT + (1 - (v - minV) / (maxV - minV || 1)) * (h - padT - padB);
  const zeroY = yFor(0).toFixed(1);
  const basePoints = baseline.map((p, i) => `${xFor(i).toFixed(1)},${yFor(p.balance).toFixed(1)}`).join(' ');
  const scnPoints = scenarioSeries ? scenarioSeries.map((p, i) => `${xFor(i).toFixed(1)},${yFor(p.balance).toFixed(1)}`).join(' ') : '';

  return (
    <div className="space-y-6">
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-ink text-paper text-sm px-4 py-2 rounded-lg shadow-lg">{toastMsg}</div>
      )}

      <div>
        <h1 className="text-[22px] font-semibold text-ink mb-1">Liquidity Forecast</h1>
        <p className="text-sm text-ink-soft">Scenario modelling and deficit alerts · US-12, US-13, US-14</p>
      </div>

      {/* Scenario builder */}
      <div className="bg-surface border border-line rounded-xl p-5 space-y-4">
        <div className="font-semibold text-ink text-[15px]">Create Scenario</div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] uppercase tracking-wider text-ink-faint font-medium">Name</label>
            <input
              type="text"
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              placeholder="Scenario name"
              className="border border-line rounded-lg px-3 py-2 text-[13px] bg-paper text-ink"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] uppercase tracking-wider text-ink-faint font-medium">Entity</label>
            <select value={newEntity} onChange={e => setNewEntity(e.target.value)} className="border border-line rounded-lg px-3 py-2 text-[13px] bg-paper text-ink">
              {lfEntities.map(n => <option key={n}>{n}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] uppercase tracking-wider text-ink-faint font-medium">Type</label>
            <select value={newType} onChange={e => setNewType(e.target.value)} className="border border-line rounded-lg px-3 py-2 text-[13px] bg-paper text-ink">
              {Object.entries(lfTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] uppercase tracking-wider text-ink-faint font-medium">Amount (₹ Cr)</label>
            <input
              type="number"
              value={newAmount}
              onChange={e => setNewAmount(e.target.value)}
              placeholder="e.g. 2.5"
              min="0"
              step="0.1"
              className="border border-line rounded-lg px-3 py-2 text-[13px] bg-paper text-ink"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] uppercase tracking-wider text-ink-faint font-medium">Start Month</label>
            <select value={newMonth} onChange={e => setNewMonth(e.target.value)} className="border border-line rounded-lg px-3 py-2 text-[13px] bg-paper text-ink">
              {lfMonths.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
        </div>
        <button
          onClick={createScenario}
          className="text-[13px] bg-verified text-white rounded-lg px-5 py-2 font-medium hover:opacity-90 cursor-pointer"
        >
          + Create Scenario
        </button>
      </div>

      {/* Scenario table */}
      <div className="bg-surface border border-line rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-line font-semibold text-ink text-[15px]">Scenarios</div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-line text-ink-faint text-[11px] uppercase tracking-wider">
                <th className="px-5 py-3 text-left font-medium">Name</th>
                <th className="px-5 py-3 text-left font-medium">Entity</th>
                <th className="px-5 py-3 text-left font-medium">Type</th>
                <th className="px-5 py-3 text-right font-medium">Amount</th>
                <th className="px-5 py-3 text-left font-medium">Start Month</th>
                <th className="px-5 py-3 text-left font-medium">Status</th>
                <th className="px-5 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {scenarios.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-ink-faint text-sm">No scenarios created yet — build one above to model a what-if outcome.</td></tr>
              ) : scenarios.map(s => (
                <tr key={s.id} className="border-b border-line last:border-0 hover:bg-paper/60">
                  <td className="px-5 py-3 text-ink font-medium">{s.label}</td>
                  <td className="px-5 py-3 text-ink-soft">{s.entity}</td>
                  <td className="px-5 py-3">
                    <span className="text-[11px] px-2 py-0.5 rounded font-mono bg-paper border border-line text-ink-soft">{lfTypeLabels[s.type]}</span>
                  </td>
                  <td className="px-5 py-3 font-mono text-right text-ink">₹{s.amount.toFixed(1)} Cr</td>
                  <td className="px-5 py-3 font-mono text-ink-soft">{s.startMonth}</td>
                  <td className="px-5 py-3">
                    <span className="flex items-center gap-1.5 text-[12px]">
                      <span className={`w-2 h-2 rounded-full inline-block ${s.active ? 'bg-verified' : 'bg-ink-faint'}`} />
                      {s.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-3 flex items-center gap-2">
                    <button onClick={() => toggleActive(s.id)} className="text-[12px] border border-line bg-paper text-ink-soft rounded px-2 py-0.5 hover:bg-surface cursor-pointer">
                      {s.active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button onClick={() => deleteScenario(s.id)} className="text-[12px] border border-alert/30 bg-alert-bg text-alert rounded px-2 py-0.5 hover:opacity-80 cursor-pointer">
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Runway projection */}
      <div className="bg-surface border border-line rounded-xl overflow-hidden">
        <div className="flex items-center gap-4 px-5 py-4 border-b border-line flex-wrap">
          <span className="font-semibold text-ink text-[15px]">Runway Projection</span>
          <select value={viewEntity} onChange={e => setViewEntity(e.target.value)} className="text-[13px] border border-line rounded-lg px-3 py-1.5 bg-paper text-ink">
            {lfEntities.map(n => <option key={n}>{n}</option>)}
          </select>
          <div className="flex rounded-lg overflow-hidden border border-line">
            {(['ACTUALS_ONLY', 'WITH_SCENARIO'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setForecastMode(mode)}
                className={`text-[12px] px-3 py-1.5 cursor-pointer ${forecastMode === mode ? 'bg-ink text-paper' : 'bg-paper text-ink-soft hover:bg-surface'}`}
              >
                {mode === 'ACTUALS_ONLY' ? 'Actuals Only' : 'Actuals + Scenario'}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2 text-[13px] text-ink-soft">
            <span>Alert threshold:</span>
            <input
              type="number"
              value={alertDays}
              onChange={e => setAlertDays(parseInt(e.target.value) || 15)}
              min="1"
              className="w-16 border border-line rounded px-2 py-1 text-[13px] bg-paper text-ink font-mono"
            />
            <span>days</span>
          </div>
        </div>

        <div className={`mx-5 mt-4 rounded-lg px-4 py-3 text-[13px] ${alertOk ? 'bg-verified-bg text-verified' : 'bg-alert-bg text-alert'}`}>
          {alertText}
        </div>

        <div className="px-5 py-4">
          <div className="text-[11px] text-ink-faint mb-2 flex items-center gap-4">
            <span className="flex items-center gap-1.5"><span className="inline-block w-5 h-0.5 bg-verified" /> Actuals</span>
            {forecastMode === 'WITH_SCENARIO' && (
              <span className="flex items-center gap-1.5"><span className="inline-block w-5 border-t-2 border-dashed border-tax-gold-strong" /> Scenario</span>
            )}
          </div>
          <div className="overflow-x-auto">
            <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-[700px]" xmlns="http://www.w3.org/2000/svg">
              <line x1={padL} y1={zeroY} x2={w - padR} y2={zeroY} stroke="var(--alert)" strokeWidth="1.2" strokeDasharray="4,3" opacity="0.6" />
              <text x={padL - 6} y={zeroY} fontSize="10" fill="var(--ink-faint)" fontFamily="var(--font-mono)" textAnchor="end" dominantBaseline="middle">₹0</text>
              <polyline points={basePoints} fill="none" stroke="var(--verified)" strokeWidth="2" />
              {scnPoints && <polyline points={scnPoints} fill="none" stroke="var(--tax-gold-strong)" strokeWidth="2" strokeDasharray="5,3" />}
              {baseline.map((p, i) => (
                <text key={i} x={xFor(i).toFixed(1)} y={h - 6} fontSize="10" fill="var(--ink-faint)" fontFamily="var(--font-mono)" textAnchor="middle">{p.month.slice(5)}</text>
              ))}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
