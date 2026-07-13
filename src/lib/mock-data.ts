/**
 * Shared mock / seed data extracted verbatim from apex_app_shell.html.
 * IDs, entity names, RIA codes, and audit log run IDs (e.g. A-3391) are
 * intentionally preserved 1:1 — they are cross-referenced in De-Briefing,
 * Summary, and Audit Trail and must not be renamed.
 */

export type EntityType = 'GROUP' | 'COMPANY' | 'FAMILY' | 'INDIVIDUAL';

export interface AccountEntity {
  name: string;
  pan: string;
  type: EntityType;
  active: boolean;
  updated: string;
}

export const accountMasterData: AccountEntity[] = [
  { name: 'Apex Group',    pan: '—',           type: 'GROUP',      active: true,  updated: '2026-07-01' },
  { name: 'Company 1',     pan: 'AABCA1234C',  type: 'COMPANY',    active: true,  updated: '2026-07-05' },
  { name: 'Company 2',     pan: 'AABCB2345D',  type: 'COMPANY',    active: true,  updated: '2026-07-04' },
  { name: 'Company 3',     pan: 'AABCC3456E',  type: 'COMPANY',    active: true,  updated: '2026-07-06' },
  { name: 'Company 4',     pan: 'AABCD4567F',  type: 'COMPANY',    active: true,  updated: '2026-07-06' },
  { name: 'Company 5',     pan: 'AABCE5678G',  type: 'COMPANY',    active: true,  updated: '2026-06-29' },
  { name: 'Company 6',     pan: 'AABCF6789H',  type: 'COMPANY',    active: true,  updated: '2026-07-02' },
  { name: 'Company 7',     pan: 'AABCG7890I',  type: 'COMPANY',    active: true,  updated: '2026-07-03' },
  { name: 'Company 8',     pan: 'AABCH8901J',  type: 'COMPANY',    active: true,  updated: '2026-06-28' },
  { name: 'Company 9',     pan: 'AABCI9012K',  type: 'COMPANY',    active: false, updated: '2026-05-14' },
  { name: 'Company 10',    pan: 'AABCJ0123L',  type: 'COMPANY',    active: true,  updated: '2026-07-05' },
  { name: 'Family Office', pan: '—',           type: 'FAMILY',     active: true,  updated: '2026-07-06' },
  { name: 'R. Shah',       pan: 'ABCDE1234F',  type: 'INDIVIDUAL', active: true,  updated: '2026-07-04' },
  { name: 'M. Shah',       pan: 'BCDEF2345G',  type: 'INDIVIDUAL', active: true,  updated: '2026-07-04' },
  { name: 'A. Shah',       pan: 'CDEFG3456H',  type: 'INDIVIDUAL', active: true,  updated: '2026-06-30' },
  { name: 'K. Shah',       pan: 'DEFGH4567I',  type: 'INDIVIDUAL', active: false, updated: '2026-04-22' },
];

export interface RiaAdvisor {
  code: string;
  name: string;
  sebi: string;
  active: boolean;
}

export const riaAdvisors: RiaAdvisor[] = [
  { code: 'RIA-001', name: 'Alpha Wealth Advisors',        sebi: 'INA000012345', active: true  },
  { code: 'RIA-002', name: 'Meridian Capital Advisors',    sebi: 'INA000023456', active: true  },
  { code: 'RIA-003', name: 'Northbridge Investment Advisors', sebi: 'INA000034567', active: true  },
  { code: 'RIA-004', name: 'Vantage Portfolio Advisors',   sebi: 'INA000045678', active: false },
];

export interface AdvisorMandate {
  advisorCode: string;
  entity: string;
  start: string;
  end: string | null;
}

export const advisorMandates: AdvisorMandate[] = [
  { advisorCode: 'RIA-001', entity: 'Company 4',     start: '2025-01-01', end: null },
  { advisorCode: 'RIA-001', entity: 'R. Shah',       start: '2025-06-01', end: null },
  { advisorCode: 'RIA-002', entity: 'Company 4',     start: '2026-02-01', end: null },
  { advisorCode: 'RIA-002', entity: 'Family Office', start: '2024-01-01', end: '2025-12-31' },
  { advisorCode: 'RIA-003', entity: 'Apex Group',    start: '2025-09-01', end: null },
  { advisorCode: 'RIA-003', entity: 'Company 1',     start: '2025-09-01', end: null },
  { advisorCode: 'RIA-004', entity: 'M. Shah',       start: '2023-01-01', end: '2024-06-30' },
];

/** Deterministic hash — preserved verbatim from apex_app_shell.html */
export function perfSeed(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h * 31 + str.charCodeAt(i)) >>> 0);
  }
  return h;
}

export function accountTagClass(type: EntityType): string {
  if (type === 'GROUP')      return 'group-tag';
  if (type === 'COMPANY')    return 'company-tag';
  if (type === 'FAMILY')     return 'family-tag';
  return 'individual-tag';
}

export function mandatesForAdvisor(code: string): AdvisorMandate[] {
  return advisorMandates.filter(m => m.advisorCode === code);
}

// Audit trail — agent identifier list (internal IDs match Apex_Ledger_AI_Agents.md taxonomy)
export const auditAgentList = [
  'XIRR_TWRR_ENGINE',
  'HISTORICAL_ROI_AGENT',
  'CASH_FLOW_ANALYTICS_AGENT',
  'PREDICTIVE_LIQUIDITY_FORECASTER',
  'TAX_80M_OPTIMIZER',
  'TAX_RULE_SENTINEL_AGENT',
  'VALUE_RESEARCH_INTEGRATION_AGENT',
  'CORPORATE_ACTIONS_TRACKING_AGENT',
  'CONCENTRATION_COMPLIANCE_RISK_AGENT',
  'INVESTMENT_FLOW_INGESTION_AGENT',
] as const;

export type AuditAgent = typeof auditAgentList[number];

/** Display label — internal CASH_FLOW_ANALYTICS_AGENT maps to renamed UI label */
export function agentDisplayLabel(agent: string): string {
  if (agent === 'CASH_FLOW_ANALYTICS_AGENT') return 'FUND FLOW ANALYTICS AGENT';
  return agent.replace(/_/g, ' ');
}
