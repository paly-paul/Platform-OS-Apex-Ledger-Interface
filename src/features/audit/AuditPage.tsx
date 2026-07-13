'use client';

import { useState, useMemo } from 'react';
import styled from 'styled-components';
import { accountMasterData, perfSeed, auditAgentList, agentDisplayLabel, type AuditAgent } from '@/lib/mock-data';
import { FilterSelect } from '@/features/benchmarking/BenchmarkingPage';

/* Styled-components used for the expandable audit row — the open/closed animation
   and nested detail grid are structurally complex enough to warrant it. */
const AuditRow = styled.div<{ $open: boolean }>`
  border: 1px solid var(--line);
  border-radius: 10px;
  margin-bottom: 6px;
  overflow: hidden;
  background: var(--surface);
`;

const AuditRowHead = styled.div`
  display: grid;
  grid-template-columns: 90px 280px 1fr 100px 28px;
  align-items: center;
  gap: 12px;
  padding: 11px 16px;
  cursor: pointer;
  user-select: none;
  &:hover { background: var(--paper); }
`;

const AuditDetail = styled.div<{ $open: boolean }>`
  display: ${({ $open }) => ($open ? 'block' : 'none')};
  padding: 14px 16px;
  border-top: 1px solid var(--line);
  background: var(--paper);
  font-size: 12px;
`;

const DetailGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 10px;
`;

// --- Audit log construction (verbatim logic from apex_app_shell.html) ---
interface AuditEntry {
  id: string;
  agent: string;
  entity: string;
  date: string;
  summary: string;
  input: string;
  output: string;
  refs: string[];
}

function agentRunSummary(agent: string, entity: string): string {
  const map: Record<string, string> = {
    XIRR_TWRR_ENGINE:                    `Computed rolling XIRR/TWRR for ${entity}.`,
    HISTORICAL_ROI_AGENT:                 `Refreshed historical ROI vintage chart for ${entity}.`,
    CASH_FLOW_ANALYTICS_AGENT:            `Analyzed monthly fund flow pattern for ${entity}.`,
    PREDICTIVE_LIQUIDITY_FORECASTER:      `Ran liquidity runway projection for ${entity}.`,
    TAX_80M_OPTIMIZER:                    `Scanned Section 80M deduction routing for ${entity}.`,
    TAX_RULE_SENTINEL_AGENT:              `Checked for tax rule/section renumbering changes affecting ${entity}.`,
    VALUE_RESEARCH_INTEGRATION_AGENT:     `Benchmarked holdings against category averages for ${entity}.`,
    CORPORATE_ACTIONS_TRACKING_AGENT:     `Scanned for upcoming corporate actions on ${entity} holdings.`,
    CONCENTRATION_COMPLIANCE_RISK_AGENT:  `Checked cross-layer concentration exposure involving ${entity}.`,
    INVESTMENT_FLOW_INGESTION_AGENT:      `Categorized capital flow movement for ${entity}.`,
  };
  return map[agent] ?? `Agent run for ${entity}.`;
}

const ANCHOR_ENTRIES: AuditEntry[] = [
  {
    id: 'A-3391', agent: 'PREDICTIVE_LIQUIDITY_FORECASTER', entity: 'Company 4', date: '2026-07-06',
    summary: 'Projected deficit in 12 days — ₹1.2 Cr shortfall against the 15-day alert threshold.',
    input: '{"entity":"Company 4","alert_threshold_days":15}',
    output: '{"deficit_projected":true,"shortfall_cr":1.2,"driver":"delayed receivable + advance tax tranche"}',
    refs: ['fund_position_balance:company-4', 'forecast_assumption:conservative-q3'],
  },
  {
    id: 'A-3388', agent: 'CONCENTRATION_COMPLIANCE_RISK_AGENT', entity: 'Family Office + Company 3', date: '2026-07-03',
    summary: 'Dismissed concentration risk flag — Reliance Industries exposure confirmed within revised tolerance.',
    input: '{"asset":"Reliance Industries","guideline_pct":7}',
    output: '{"combined_exposure_pct":6.4,"status":"within_tolerance","dismissed_by":"Family Office analyst"}',
    refs: ['individual_holding:family', 'corporate_holding:company-3'],
  },
  {
    id: 'A-3392', agent: 'VALUE_RESEARCH_INTEGRATION_AGENT', entity: 'Family Office', date: '2026-07-05',
    summary: 'Axis Bluechip Fund flagged for Q3 redemption review — 4.1% category underperformance.',
    input: '{"asset":"Axis Bluechip Fund","category":"Large Cap"}',
    output: '{"trailing_12mo_return_pct":9.8,"category_avg_pct":13.9,"manager_change_flagged":true}',
    refs: ['individual_holding:family', 'value_research_api'],
  },
  {
    id: 'FA-1001', agent: 'PREDICTIVE_LIQUIDITY_FORECASTER', entity: 'Company 4', date: '2026-07-01',
    summary: 'Created forecast scenario "Conservative Q3" — receivable delay assumption logged, actuals untouched.',
    input: '{"scenario_label":"Conservative Q3","assumption_type":"RECEIVABLE_DELAY"}',
    output: '{"forecast_assumption_id":"created","created_by":"Family Office analyst"}',
    refs: ['forecast_assumption:conservative-q3'],
  },
];

const AUDIT_DATES = ['2026-06-15','2026-06-22','2026-06-28','2026-07-01','2026-07-02','2026-07-04','2026-07-06','2026-07-07'];

function buildAuditLog(): AuditEntry[] {
  const generated: AuditEntry[] = [];
  const entities = accountMasterData.filter(e => e.type !== 'GROUP');
  let seq = 3400;
  entities.forEach(ent => {
    AUDIT_DATES.forEach(d => {
      const s = perfSeed(ent.name + d + 'audit');
      if (s % 4 !== 0) return;
      const agent = auditAgentList[s % auditAgentList.length];
      generated.push({
        id: 'A-' + (seq++), agent, entity: ent.name, date: d,
        summary: agentRunSummary(agent, ent.name),
        input: `{"entity":"${ent.name}","scope":"${agent}"}`,
        output: `{"status":"completed","confidence":"${s % 2 === 0 ? 'high' : 'medium'}"}`,
        refs: [agent.toLowerCase() + ':' + ent.name.toLowerCase().replace(/\s+/g, '-')],
      });
    });
  });
  return [...ANCHOR_ENTRIES, ...generated].sort((a, b) => b.date.localeCompare(a.date));
}

const FULL_AUDIT_LOG = buildAuditLog();
const AGENT_OPTIONS = ['ALL', ...auditAgentList as unknown as string[]];
const ENTITY_OPTIONS = ['ALL', ...Array.from(new Set(FULL_AUDIT_LOG.map(r => r.entity)))];

export default function AuditPage() {
  const [agentFilter, setAgentFilter]   = useState('ALL');
  const [entityFilter, setEntityFilter] = useState('ALL');
  const [dateFrom, setDateFrom]         = useState('');
  const [dateTo, setDateTo]             = useState('');
  const [search, setSearch]             = useState('');
  const [openRows, setOpenRows]         = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => FULL_AUDIT_LOG.filter(r =>
    (agentFilter  === 'ALL' || r.agent  === agentFilter)  &&
    (entityFilter === 'ALL' || r.entity === entityFilter) &&
    (!dateFrom || r.date >= dateFrom) &&
    (!dateTo   || r.date <= dateTo)   &&
    (!search   || r.id.toLowerCase().includes(search) || r.summary.toLowerCase().includes(search))
  ), [agentFilter, entityFilter, dateFrom, dateTo, search]);

  function toggle(id: string) {
    setOpenRows(prev => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div>
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold m-0 mb-1">Audit Trail</h1>
          <div className="text-xs text-ink-soft font-mono">AGENT_RUN_LOG · FULL TRACEABILITY FOR TAX/FIDUCIARY TRUST</div>
        </div>
        <span className="font-mono text-[11px] font-semibold rounded-[10px] px-[9px] py-0.5 bg-verified-bg text-verified">
          {filtered.length} runs
        </span>
      </div>

      {/* Filters */}
      <div className="bg-surface border border-line rounded-[10px] p-[14px_16px] mb-4 flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-ink-faint font-semibold">Agent</label>
          <select
            value={agentFilter}
            onChange={e => setAgentFilter(e.target.value)}
            className="border border-line rounded-lg px-3 py-1.5 text-xs bg-paper text-ink font-mono focus:outline-none focus:border-verified min-w-[240px]"
          >
            <option value="ALL">All Agents</option>
            {auditAgentList.map((a: AuditAgent) => (
              <option key={a} value={a}>{agentDisplayLabel(a)}</option>
            ))}
          </select>
        </div>
        <FilterSelect label="Entity / Scope" value={entityFilter} onChange={setEntityFilter} options={ENTITY_OPTIONS} />
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-ink-faint font-semibold">From</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="border border-line rounded-lg px-3 py-1.5 text-xs bg-paper font-mono focus:outline-none focus:border-verified" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-ink-faint font-semibold">To</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="border border-line rounded-lg px-3 py-1.5 text-xs bg-paper font-mono focus:outline-none focus:border-verified" />
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
          <label className="text-[10px] uppercase tracking-wider text-ink-faint font-semibold">Search run ID / summary</label>
          <input
            type="text" value={search}
            onChange={e => setSearch(e.target.value.toLowerCase())}
            placeholder="e.g. A-3391 or deficit"
            className="border border-line rounded-lg px-3 py-1.5 text-xs bg-paper font-mono focus:outline-none focus:border-verified"
          />
        </div>
      </div>

      {/* Rows */}
      {filtered.length === 0 ? (
        <div className="bg-surface border border-line rounded-[10px] p-8 text-center text-ink-faint text-xs font-mono">
          No agent runs match the current filters.
        </div>
      ) : filtered.map(r => (
        <AuditRow key={r.id} $open={!!openRows[r.id]}>
          <AuditRowHead onClick={() => toggle(r.id)}>
            <span className="font-mono text-[11px] font-bold text-ink-soft">#{r.id}</span>
            <span className="text-[11px] font-semibold text-ink uppercase tracking-wide truncate">{agentDisplayLabel(r.agent)}</span>
            <span className="text-[12px] text-ink-soft truncate">{r.summary}</span>
            <span className="font-mono text-[11px] text-ink-faint">{r.date}</span>
            <svg
              width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              style={{ transform: openRows[r.id] ? 'rotate(180deg)' : undefined, transition: 'transform .15s ease', flexShrink: 0, color: 'var(--ink-faint)' }}
            >
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </AuditRowHead>
          <AuditDetail $open={!!openRows[r.id]}>
            <DetailGrid>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-ink-faint font-semibold mb-1">Input Params</div>
                <div className="font-mono text-[11px] text-ink-soft break-all">{r.input}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-ink-faint font-semibold mb-1">Output Summary</div>
                <div className="font-mono text-[11px] text-ink-soft break-all">{r.output}</div>
              </div>
            </DetailGrid>
            <div className="text-[10px] uppercase tracking-wider text-ink-faint font-semibold mb-1.5">Source Data Refs</div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {r.refs.map(ref => (
                <span key={ref} className="font-mono text-[10px] bg-surface border border-line rounded px-2 py-0.5 text-ink-soft">{ref}</span>
              ))}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-ink-faint font-semibold mb-0.5">Scope</div>
            <div className="font-mono text-[11px] text-ink-soft">{r.entity}</div>
          </AuditDetail>
        </AuditRow>
      ))}
    </div>
  );
}
