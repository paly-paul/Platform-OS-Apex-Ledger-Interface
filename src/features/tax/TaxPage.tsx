'use client';

import { useState, useMemo } from 'react';
import { accountMasterData, perfSeed, accountTagClass } from '@/lib/mock-data';

const tlhIndividualAssets = ['HDFC Flexicap Growth', 'Infosys Ltd', 'Reliance Industries', 'ICICI Pru Bluechip', 'Nifty 50 Index Fund'];
const tlhCorporateAssets = ['SBI Liquid Fund', 'HDFC Corp Bond Fund', 'Axis AIF Cat II', 'TCS Ltd', 'ONGC Ltd'];

const sentinelDraftsInit = [
  { id: 'rule-1', category: 'SECTION_80M', deltaType: 'RENUMBER', oldRef: 'Section 80M', newRef: 'Section 157(4)', fy: '2026-2027', note: 'Income-tax Act 2025 renumbering — mechanics and rate unchanged, section reference only.' },
  { id: 'rule-2', category: 'SLAB_INDIVIDUAL', deltaType: 'RATE', oldRef: 'Rebate limit ₹7,00,000', newRef: 'Rebate limit ₹12,00,000', fy: '2026-2027', note: 'Union Budget 2026 — individual rebate threshold revised upward.' },
  { id: 'rule-3', category: 'CAPITAL_GAINS_LTCG', deltaType: 'RENUMBER', oldRef: 'Section 112A', newRef: 'Section 198', fy: '2026-2027', note: 'Income-tax Act 2025 renumbering — LTCG rate/threshold unchanged.' },
  { id: 'rule-4', category: 'SURCHARGE', deltaType: 'RATE', oldRef: 'Surcharge 25% (>₹5Cr)', newRef: 'Surcharge 22% (>₹5Cr)', fy: '2026-2027', note: 'Union Budget 2026 — top surcharge slab reduced.' },
];

interface SentinelRule {
  id: string;
  category: string;
  deltaType: string;
  oldRef: string;
  newRef: string;
  fy: string;
  note: string;
  rejectReason?: string;
}

const tagClsMap: Record<string, string> = {
  GROUP: 'bg-ink text-paper',
  COMPANY: 'bg-verified-bg text-verified',
  FAMILY: 'bg-amber-bg text-amber',
  INDIVIDUAL: 'bg-paper text-ink-soft border border-line',
};

function buildTlhRows(scope: 'INDIVIDUAL' | 'COMPANY') {
  const entities = scope === 'INDIVIDUAL'
    ? accountMasterData.filter(e => e.type === 'INDIVIDUAL')
    : accountMasterData.filter(e => e.type === 'COMPANY');
  const assets = scope === 'INDIVIDUAL' ? tlhIndividualAssets : tlhCorporateAssets;
  const rows: { entity: string; asset: string; unrealized: number; booked: number; harvestCandidate: boolean }[] = [];
  entities.forEach(ent => {
    assets.forEach(asset => {
      const s = perfSeed(ent.name + asset + scope);
      const unrealized = ((s % 900) / 100) - 4.5;
      const booked = (((s >>> 5) % 600) / 100) - 1.5;
      const harvestCandidate = unrealized < -0.5 && booked > 0.5;
      rows.push({ entity: ent.name, asset, unrealized, booked, harvestCandidate });
    });
  });
  return rows;
}

function build80mRows() {
  return accountMasterData.filter(e => e.type === 'COMPANY').map(c => {
    const s = perfSeed(c.name + '80m');
    const dividend = 8 + (s % 4000) / 100;
    const eligiblePct = 60 + (s >>> 3) % 40;
    const eligible = dividend * (eligiblePct / 100);
    const routed = (s % 4) !== 0;
    return { entity: c.name, dividend, eligiblePct, eligible, routed };
  });
}

function buildLiabilityRows(fyFilter: string) {
  const fys = ['2025-2026', '2026-2027'];
  const entities = accountMasterData.filter(e => e.type !== 'GROUP' && e.type !== 'FAMILY');
  const rows: { entity: string; type: string; fy: string; liability: number; basis: string }[] = [];
  entities.forEach(ent => {
    fys.forEach(fy => {
      if (fyFilter !== 'ALL' && fy !== fyFilter) return;
      const s = perfSeed(ent.name + fy + 'liability');
      const liability = 2 + (s % 3200) / 100;
      const basis = ent.type === 'COMPANY' ? 'Corporate slab + Section 80M net of deductions' : 'Individual slab + capital gains';
      rows.push({ entity: ent.name, type: ent.type, fy, liability, basis });
    });
  });
  return rows;
}

const today = new Date('2026-07-08');
const deadline = new Date('2027-03-31');
const daysToDeadline = Math.round((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

export default function TaxPage() {
  const [tlhScope, setTlhScope] = useState<'INDIVIDUAL' | 'COMPANY'>('INDIVIDUAL');
  const [fyFilter, setFyFilter] = useState('ALL');
  const [drafts, setDrafts] = useState<SentinelRule[]>(sentinelDraftsInit);
  const [verified, setVerified] = useState<SentinelRule[]>([]);
  const [rejected, setRejected] = useState<SentinelRule[]>([]);
  const [rejectInputs, setRejectInputs] = useState<Record<string, string>>({});
  const [rejectOpen, setRejectOpen] = useState<Record<string, boolean>>({});
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(''), 3500); };

  const approveRule = (id: string) => {
    const rule = drafts.find(r => r.id === id);
    if (!rule) return;
    setDrafts(prev => prev.filter(r => r.id !== id));
    setVerified(prev => [...prev, rule]);
    showToast(`"${rule.oldRef} → ${rule.newRef}" verified — now live for the Tax Harvesting & 80M Optimizer.`);
  };

  const confirmReject = (id: string) => {
    const reason = (rejectInputs[id] ?? '').trim();
    if (!reason) { showToast('A reason is required to reject a rule change.'); return; }
    const rule = drafts.find(r => r.id === id);
    if (!rule) return;
    setDrafts(prev => prev.filter(r => r.id !== id));
    setRejected(prev => [...prev, { ...rule, rejectReason: reason }]);
    showToast('Draft rejected and retained on record with reason.');
  };

  const tlhRows = useMemo(() => buildTlhRows(tlhScope), [tlhScope]);
  const s80mRows = useMemo(() => build80mRows(), []);
  const liabilityRows = useMemo(() => buildLiabilityRows(fyFilter), [fyFilter]);

  const exportCsv = () => {
    if (liabilityRows.length === 0) { showToast('No rows to export for the selected financial year.'); return; }
    const header = ['Entity', 'Layer', 'Financial Year', 'Projected Liability', 'Basis'];
    const lines = [header.join(','), ...liabilityRows.map(r => [r.entity, r.type, r.fy, `₹${r.liability.toFixed(2)}L`, r.basis].map(v => `"${v}"`).join(','))];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tax_liability_projection_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`${liabilityRows.length} rows exported — ready for the CA/auditor.`);
  };

  return (
    <div className="space-y-6">
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-ink text-paper text-sm px-4 py-2 rounded-lg shadow-lg">{toastMsg}</div>
      )}

      {/* Header banner */}
      <div className="bg-tax-gold-bg border border-tax-gold rounded-xl px-5 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold text-tax-gold-strong mb-0.5">Tax Assessment</h1>
          <p className="text-sm text-tax-gold">AY 2027-28 · Tax Harvesting · Section 80M · Tax Rule Sentinel · US-15–17, US-22</p>
        </div>
        <div className="text-right">
          <div className="text-[11px] uppercase tracking-widest text-tax-gold mb-1">Filing Deadline</div>
          <div className="text-[20px] font-mono font-semibold text-tax-gold-strong">{daysToDeadline} days to March 31</div>
        </div>
      </div>

      {/* Tax Rule Sentinel */}
      <div className="bg-surface border border-line rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-line">
          <div className="font-semibold text-ink text-[15px]">Tax Rule Sentinel — Review Queue</div>
          <div className="text-[12px] text-ink-soft mt-0.5">Agent-detected legislative changes awaiting analyst sign-off before going live</div>
        </div>
        <div className="p-5 space-y-5">
          <Section label="Draft — Pending Review" count={drafts.length}>
            {drafts.length === 0
              ? <EmptyNote>No draft rule changes pending review.</EmptyNote>
              : drafts.map(r => (
                <RuleCard key={r.id} rule={r} status="DRAFT"
                  onApprove={() => approveRule(r.id)}
                  rejectOpen={!!rejectOpen[r.id]}
                  onToggleReject={() => setRejectOpen(prev => ({ ...prev, [r.id]: !prev[r.id] }))}
                  rejectReason={rejectInputs[r.id] ?? ''}
                  onRejectInput={v => setRejectInputs(prev => ({ ...prev, [r.id]: v }))}
                  onConfirmReject={() => confirmReject(r.id)}
                />
              ))
            }
          </Section>
          <Section label="Verified — Live" count={verified.length}>
            {verified.length === 0
              ? <EmptyNote>No rules verified yet this cycle.</EmptyNote>
              : verified.map(r => <RuleCard key={r.id} rule={r} status="VERIFIED" />)
            }
          </Section>
          <Section label="Rejected" count={rejected.length}>
            {rejected.length === 0
              ? <EmptyNote>No rejected drafts on record.</EmptyNote>
              : rejected.map(r => <RuleCard key={r.id} rule={r} status="REJECTED" />)
            }
          </Section>
        </div>
      </div>

      {/* Tax Loss Harvesting */}
      <div className="bg-surface border border-line rounded-xl overflow-hidden">
        <div className="flex items-center gap-4 px-5 py-4 border-b border-line">
          <div>
            <div className="font-semibold text-ink text-[15px]">Tax Loss Harvesting Candidates</div>
            <div className="text-[12px] text-ink-soft mt-0.5">US-15</div>
          </div>
          <div className="ml-auto flex rounded-lg overflow-hidden border border-line">
            {(['INDIVIDUAL', 'COMPANY'] as const).map(scope => (
              <button
                key={scope}
                onClick={() => setTlhScope(scope)}
                className={`text-[12px] px-3 py-1.5 cursor-pointer ${tlhScope === scope ? 'bg-ink text-paper' : 'bg-paper text-ink-soft hover:bg-surface'}`}
              >
                {scope === 'INDIVIDUAL' ? 'Individuals' : 'Companies'}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-line text-ink-faint text-[11px] uppercase tracking-wider">
                <th className="px-5 py-3 text-left font-medium">Entity</th>
                <th className="px-5 py-3 text-left font-medium">Asset</th>
                <th className="px-5 py-3 text-right font-medium">Unrealized G/L</th>
                <th className="px-5 py-3 text-right font-medium">Booked G/L</th>
                <th className="px-5 py-3 text-left font-medium">Flag</th>
              </tr>
            </thead>
            <tbody>
              {tlhRows.map((r, i) => (
                <tr key={i} className="border-b border-line last:border-0 hover:bg-paper/60">
                  <td className="px-5 py-3 text-ink">{r.entity}</td>
                  <td className="px-5 py-3 text-ink-soft">{r.asset}</td>
                  <td className={`px-5 py-3 font-mono text-right ${r.unrealized >= 0 ? 'text-verified' : 'text-alert'}`}>
                    {r.unrealized >= 0 ? '+' : ''}₹{r.unrealized.toFixed(2)}L
                  </td>
                  <td className={`px-5 py-3 font-mono text-right ${r.booked >= 0 ? 'text-verified' : 'text-alert'}`}>
                    {r.booked >= 0 ? '+' : ''}₹{r.booked.toFixed(2)}L
                  </td>
                  <td className="px-5 py-3">
                    {r.harvestCandidate
                      ? <span className="text-[11px] bg-amber-bg text-amber border border-amber/30 rounded px-2 py-0.5 font-mono">Harvest candidate</span>
                      : <span className="text-ink-faint font-mono">—</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 80M */}
      <div className="bg-surface border border-line rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-line">
          <div className="font-semibold text-ink text-[15px]">Section 80M — Dividend Routing</div>
          <div className="text-[12px] text-ink-soft mt-0.5">US-17 · Inter-company dividend deduction routing status</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-line text-ink-faint text-[11px] uppercase tracking-wider">
                <th className="px-5 py-3 text-left font-medium">Company</th>
                <th className="px-5 py-3 text-right font-medium">Dividend Received</th>
                <th className="px-5 py-3 text-right font-medium">Eligible Deduction</th>
                <th className="px-5 py-3 text-left font-medium">Routing Status</th>
              </tr>
            </thead>
            <tbody>
              {s80mRows.map((r, i) => (
                <tr key={i} className="border-b border-line last:border-0 hover:bg-paper/60">
                  <td className="px-5 py-3 text-ink">{r.entity}</td>
                  <td className="px-5 py-3 font-mono text-right text-ink">₹{r.dividend.toFixed(2)}L</td>
                  <td className="px-5 py-3 font-mono text-right text-ink">₹{r.eligible.toFixed(2)}L ({r.eligiblePct}%)</td>
                  <td className="px-5 py-3">
                    <span className={`text-[11px] px-2 py-0.5 rounded font-mono ${r.routed ? 'bg-verified-bg text-verified' : 'bg-paper border border-line text-ink-soft'}`}>
                      {r.routed ? 'Deduction Routed' : 'Pending Routing'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tax Liability Projection */}
      <div className="bg-surface border border-line rounded-xl overflow-hidden">
        <div className="flex items-center gap-4 px-5 py-4 border-b border-line">
          <div>
            <div className="font-semibold text-ink text-[15px]">Tax Liability Projection</div>
            <div className="text-[12px] text-ink-soft mt-0.5">US-16</div>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <select value={fyFilter} onChange={e => setFyFilter(e.target.value)} className="text-[13px] border border-line rounded-lg px-3 py-1.5 bg-paper text-ink">
              <option value="ALL">All Financial Years</option>
              <option value="2025-2026">2025-2026</option>
              <option value="2026-2027">2026-2027</option>
            </select>
            <button onClick={exportCsv} className="text-[13px] border border-line bg-paper text-ink-soft rounded-lg px-3 py-1.5 hover:bg-surface cursor-pointer">Export CSV</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-line text-ink-faint text-[11px] uppercase tracking-wider">
                <th className="px-5 py-3 text-left font-medium">Entity</th>
                <th className="px-5 py-3 text-left font-medium">Layer</th>
                <th className="px-5 py-3 text-left font-medium">Financial Year</th>
                <th className="px-5 py-3 text-right font-medium">Projected Liability</th>
                <th className="px-5 py-3 text-left font-medium">Basis</th>
              </tr>
            </thead>
            <tbody>
              {liabilityRows.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-ink-faint text-sm">No entities match the selected financial year.</td></tr>
              ) : liabilityRows.map((r, i) => (
                <tr key={i} className="border-b border-line last:border-0 hover:bg-paper/60">
                  <td className="px-5 py-3 text-ink">{r.entity}</td>
                  <td className="px-5 py-3">
                    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-semibold ${tagClsMap[r.type] ?? ''}`}>{r.type}</span>
                  </td>
                  <td className="px-5 py-3 font-mono text-ink-soft">{r.fy}</td>
                  <td className="px-5 py-3 font-mono text-right text-ink">₹{r.liability.toFixed(2)}L</td>
                  <td className="px-5 py-3 text-ink-soft text-[12px]">{r.basis}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Section({ label, count, children }: { label: string; count: number; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-ink-faint font-semibold mb-3 flex items-center gap-2">
        {label}
        <span className="bg-paper border border-line rounded-full px-2 py-0 font-mono text-ink-soft">{count}</span>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return <div className="text-[13px] text-ink-faint py-3">{children}</div>;
}

function RuleCard({
  rule, status, onApprove, rejectOpen, onToggleReject, rejectReason, onRejectInput, onConfirmReject,
}: {
  rule: SentinelRule;
  status: 'DRAFT' | 'VERIFIED' | 'REJECTED';
  onApprove?: () => void;
  rejectOpen?: boolean;
  onToggleReject?: () => void;
  rejectReason?: string;
  onRejectInput?: (v: string) => void;
  onConfirmReject?: () => void;
}) {
  const badgeClass = rule.deltaType === 'RENUMBER'
    ? 'bg-paper border border-line text-ink-soft'
    : 'bg-amber-bg text-amber border border-amber/30';
  const badgeLabel = rule.deltaType === 'RENUMBER' ? 'Renumbering' : 'Rate Change';
  const cardBg = status === 'VERIFIED' ? 'bg-verified-bg border-verified/30' : status === 'REJECTED' ? 'bg-alert-bg border-alert/30' : 'bg-paper border-line';

  return (
    <div className={`border rounded-xl p-4 space-y-2 ${cardBg}`}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] px-2 py-0.5 rounded font-mono bg-paper border border-line text-ink-soft">{rule.category.replace(/_/g, ' ')}</span>
        <span className={`text-[11px] px-2 py-0.5 rounded font-mono ${badgeClass}`}>{badgeLabel}</span>
        <span className="ml-auto font-mono text-[12px] text-ink-soft">FY {rule.fy}</span>
      </div>
      <div className="flex items-center gap-3 text-[13px]">
        <span className="text-alert font-mono">{rule.oldRef}</span>
        <span className="text-ink-faint">→</span>
        <span className="text-verified font-mono">{rule.newRef}</span>
      </div>
      <div className="text-[12px] text-ink-soft">{rule.note}</div>
      {status === 'DRAFT' && (
        <div className="space-y-2 pt-1">
          <div className="flex gap-2">
            <button onClick={onApprove} className="text-[12px] bg-verified text-white rounded-lg px-3 py-1.5 font-medium hover:opacity-90 cursor-pointer">Approve — go live</button>
            <button onClick={onToggleReject} className="text-[12px] border border-alert/40 text-alert bg-alert-bg rounded-lg px-3 py-1.5 font-medium hover:opacity-80 cursor-pointer">Reject</button>
          </div>
          {rejectOpen && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={rejectReason ?? ''}
                onChange={e => onRejectInput?.(e.target.value)}
                placeholder="Reason for rejection (required)"
                className="flex-1 border border-line rounded-lg px-3 py-1.5 text-[12px] bg-surface text-ink"
              />
              <button onClick={onConfirmReject} className="text-[12px] border border-line bg-paper text-ink-soft rounded-lg px-3 py-1.5 hover:bg-surface cursor-pointer">Confirm Reject</button>
            </div>
          )}
        </div>
      )}
      {status === 'VERIFIED' && (
        <div className="text-[12px] text-verified font-medium">✓ Verified by Tax/Family Office analyst · live for computation</div>
      )}
      {status === 'REJECTED' && (
        <div className="text-[12px] text-alert">✕ Rejected · reason: {rule.rejectReason ?? '—'}</div>
      )}
    </div>
  );
}
