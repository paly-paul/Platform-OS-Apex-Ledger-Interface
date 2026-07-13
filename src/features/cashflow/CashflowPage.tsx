'use client';

import { useState, useMemo } from 'react';
import { accountMasterData, perfSeed } from '@/lib/mock-data';

const cfTxnTypes = ['INVESTMENT_INFLOW', 'INVESTMENT_OUTFLOW', 'REDEMPTION', 'DIVIDEND', 'INTER_CORPORATE_LOAN', 'TAX_PAYMENT'] as const;
const cfAssetClasses = ['EQUITY', 'MUTUAL_FUND', 'AIF', 'DEBT', 'CASH_EQUIVALENT'] as const;
const cfInflowTypes = ['INVESTMENT_INFLOW', 'DIVIDEND', 'REDEMPTION'];
const cfOutflowTypes = ['INVESTMENT_OUTFLOW', 'TAX_PAYMENT', 'ADVANCE_TAX', 'BANK_TRANSFER'];
const cfMonths = ['2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07'];
const banks = ['HDFC Bank', 'ICICI Bank', 'Axis Bank', 'State Bank of India'];

const cashFlowTransactions = (() => {
  const entities = accountMasterData.filter(e => e.type !== 'GROUP').map(e => e.name);
  const rows: { date: string; entity: string; type: string; assetClass: string; amount: number }[] = [];
  entities.forEach((entity) => {
    cfMonths.forEach((month) => {
      const s = perfSeed(entity + month);
      if (s % 3 === 0) return;
      const type = cfTxnTypes[s % cfTxnTypes.length];
      const assetClass = cfAssetClasses[(s >>> 2) % cfAssetClasses.length];
      const amount = 5 + (s % 4500) / 100;
      const day = 3 + (s % 24);
      rows.push({
        date: month + '-' + String(day).padStart(2, '0'),
        entity, type, assetClass,
        amount: Math.round(amount * 100000),
      });
    });
  });
  return rows.sort((a, b) => b.date.localeCompare(a.date));
})();

export const cfTreasuryBalances = accountMasterData.filter(e => e.type === 'COMPANY').map((c) => {
  const s = perfSeed(c.name + 'treasury');
  const balance = 80000000 + (s % 400) * 500000;
  const idle = (s % 10) < 3;
  const balanceType = (s % 2 === 0) ? 'EOD' : 'INTRADAY';
  return {
    entity: c.name,
    bank: banks[s % banks.length],
    account: 'XXXX-XXXX-' + String(1000 + (s % 9000)),
    balance,
    balanceType,
    freshness: balanceType === 'EOD' ? 'EOD close, yesterday' : 'Intraday · 11:04 IST',
    idle,
  };
});

function cfFormatAmount(n: number) {
  return '₹' + (n / 100000).toFixed(1) + 'L';
}

function cfTagClass(type: string) {
  if (cfInflowTypes.includes(type)) return 'inflow';
  if (cfOutflowTypes.includes(type)) return 'outflow';
  return 'neutral';
}

export default function CashflowPage() {
  const [entityFilter, setEntityFilter] = useState('ALL');
  const [monthFilter, setMonthFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const entities = accountMasterData.filter(e => e.type !== 'GROUP').map(e => e.name);

  const filtered = useMemo(() => cashFlowTransactions.filter(t =>
    (entityFilter === 'ALL' || t.entity === entityFilter) &&
    (monthFilter === 'ALL' || t.date.startsWith(monthFilter)) &&
    (typeFilter === 'ALL' || t.type === typeFilter)
  ), [entityFilter, monthFilter, typeFilter]);

  const inflow = filtered.filter(t => cfInflowTypes.includes(t.type)).reduce((a, t) => a + t.amount, 0);
  const outflow = filtered.filter(t => cfOutflowTypes.includes(t.type)).reduce((a, t) => a + t.amount, 0);
  const net = inflow - outflow;

  const idleBalances = cfTreasuryBalances.filter(b => b.idle);
  const idleSum = idleBalances.reduce((a, b) => a + b.balance, 0);

  return (
    <div className="space-y-6">
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-ink text-paper text-sm px-4 py-2 rounded-lg shadow-lg">{toastMsg}</div>
      )}

      <div>
        <h1 className="text-[22px] font-semibold text-ink mb-1">Fund Flow</h1>
        <p className="text-sm text-ink-soft">Cash and investment flows across entities · US-10, US-11</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Inflow', value: cfFormatAmount(inflow), color: 'text-verified' },
          { label: 'Total Outflow', value: cfFormatAmount(outflow), color: 'text-alert' },
          { label: 'Net Flow', value: (net >= 0 ? '+' : '') + cfFormatAmount(net), color: net >= 0 ? 'text-verified' : 'text-alert' },
          { label: 'Idle Treasury', value: idleBalances.length === 0 ? '₹0' : '₹' + (idleSum / 10000000).toFixed(1) + ' Cr', color: 'text-amber' },
        ].map(card => (
          <div key={card.label} className="bg-surface border border-line rounded-xl p-4">
            <div className="text-[11px] uppercase tracking-widest text-ink-faint mb-1">{card.label}</div>
            <div className={`text-2xl font-mono font-semibold ${card.color}`}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Transactions */}
      <div className="bg-surface border border-line rounded-xl overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-line flex-wrap">
          <span className="font-semibold text-ink text-[15px]">Transactions</span>
          <span className="ml-1 text-[11px] bg-paper border border-line text-ink-soft rounded-full px-3 py-0.5 font-mono">{filtered.length} transactions</span>
          <div className="ml-auto flex items-center gap-3 flex-wrap">
            <select value={entityFilter} onChange={e => setEntityFilter(e.target.value)} className="text-[13px] border border-line rounded-lg px-3 py-1.5 bg-paper text-ink">
              <option value="ALL">All Entities</option>
              {entities.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)} className="text-[13px] border border-line rounded-lg px-3 py-1.5 bg-paper text-ink">
              <option value="ALL">All Months</option>
              {[...cfMonths].reverse().map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="text-[13px] border border-line rounded-lg px-3 py-1.5 bg-paper text-ink">
              <option value="ALL">All Types</option>
              {cfTxnTypes.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-line text-ink-faint text-[11px] uppercase tracking-wider">
                <th className="px-5 py-3 text-left font-medium">Date</th>
                <th className="px-5 py-3 text-left font-medium">Entity</th>
                <th className="px-5 py-3 text-left font-medium">Type</th>
                <th className="px-5 py-3 text-left font-medium">Asset Class</th>
                <th className="px-5 py-3 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-ink-faint text-sm">No transactions match the current filters.</td></tr>
              ) : filtered.map((t, i) => (
                <tr key={i} className="border-b border-line last:border-0 hover:bg-paper/60">
                  <td className="px-5 py-3 font-mono text-ink-soft">{t.date}</td>
                  <td className="px-5 py-3 text-ink">{t.entity}</td>
                  <td className="px-5 py-3">
                    <span className={`text-[11px] px-2 py-0.5 rounded font-mono uppercase ${
                      cfTagClass(t.type) === 'inflow' ? 'bg-verified-bg text-verified' :
                      cfTagClass(t.type) === 'outflow' ? 'bg-alert-bg text-alert' :
                      'bg-paper text-ink-soft border border-line'
                    }`}>{t.type.replace(/_/g, ' ')}</span>
                  </td>
                  <td className="px-5 py-3 text-ink-soft">{t.assetClass.replace('_', ' ')}</td>
                  <td className="px-5 py-3 font-mono text-right text-ink">{cfFormatAmount(t.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Treasury balances */}
      <div className="bg-surface border border-line rounded-xl overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-line">
          <span className="font-semibold text-ink text-[15px]">Treasury Balances</span>
          <span className="ml-1 text-[11px] bg-paper border border-line text-ink-soft rounded-full px-3 py-0.5 font-mono">{cfTreasuryBalances.length} companies</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-line text-ink-faint text-[11px] uppercase tracking-wider">
                <th className="px-5 py-3 text-left font-medium">Entity</th>
                <th className="px-5 py-3 text-left font-medium">Bank</th>
                <th className="px-5 py-3 text-left font-medium">Account</th>
                <th className="px-5 py-3 text-right font-medium">Balance</th>
                <th className="px-5 py-3 text-left font-medium">Type</th>
                <th className="px-5 py-3 text-left font-medium">Freshness</th>
                <th className="px-5 py-3 text-left font-medium">Flag</th>
              </tr>
            </thead>
            <tbody>
              {cfTreasuryBalances.map((b, i) => (
                <tr key={i} className="border-b border-line last:border-0 hover:bg-paper/60">
                  <td className="px-5 py-3 text-ink">{b.entity}</td>
                  <td className="px-5 py-3 text-ink-soft">{b.bank}</td>
                  <td className="px-5 py-3 font-mono text-ink-soft">{b.account}</td>
                  <td className="px-5 py-3 font-mono text-right text-ink">₹{(b.balance / 10000000).toFixed(2)} Cr</td>
                  <td className="px-5 py-3">
                    <span className="text-[11px] px-2 py-0.5 rounded font-mono bg-paper border border-line text-ink-soft">{b.balanceType}</span>
                  </td>
                  <td className="px-5 py-3 text-ink-soft text-[12px]">
                    <span className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full inline-block ${b.balanceType === 'EOD' ? 'bg-verified' : 'bg-amber'}`} />
                      {b.freshness}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {b.idle && (
                      <span className="flex items-center gap-2">
                        <span className="text-[11px] bg-amber-bg text-amber border border-amber/30 rounded px-2 py-0.5 font-mono">Idle &gt;30d</span>
                        <button
                          onClick={() => showToast('Redeployment recommendation queued for Family Office review.')}
                          className="text-[12px] border border-line bg-paper text-ink-soft rounded px-2 py-0.5 hover:bg-surface cursor-pointer"
                        >Recommend</button>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
