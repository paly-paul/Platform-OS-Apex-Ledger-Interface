# Business Requirements Document — Apex Portfolio OS Backend
### Phase 1: Internal Tax & Family Office Team

**Document version:** v1
**Related artifacts:** `Apex_Ledger_AI.md` (pitch/pipelines), `Apex_Ledger_AI_Agents.md` (v2, agent architecture), `Apex_Ledger_AI_FE_User_Story_v4.md` (frontend stories), `apex_ledger_schema_v4.sql` (schema), `Apex_Ledger_Backend_User_Stories_v1.md` (backend stories)

---

## 1. Purpose

This BRD defines the business requirements for the **backend services layer** of Apex Portfolio OS — the Python-based orchestration, agent execution, and API surface that sits between the Postgres schema (v4) and the frontend app shell. It does not restate frontend UX requirements (see the frontend user story document) except where necessary to establish why a backend capability exists.

## 2. Business Context

The organization spans 10 operating companies, a family office, and individual family members, with wealth data currently fragmented across ERPs, bank portals, demat accounts, and — as of schema v4 — externally managed Registered Investment Advisor (RIA) relationships. Manual aggregation currently consumes the majority of the Tax and Family Office team's time. The backend's business purpose is to make ingestion, computation, and compliance enforcement **autonomous and auditable**, so the team's time shifts from data assembly to decision-making.

## 3. Objectives

1. Ingest financial data from heterogeneous sources (manual upload, email fallback, and — new in this phase — RIA statements) into a single structurally sound ledger, without brittle screen-scraping.
2. Compute performance (XIRR/TWRR, historical ROI) at any of four legal-entity layers **and**, as of this phase, per RIA advisor — to support an explicit engage/disengage decision on external advisors.
3. Enforce tax and advisory-mandate compliance rules at the appropriate layer of strictness (DB-trigger for mandate attribution; human-sign-off gate for tax rule changes) rather than uniformly at one layer.
4. Provide full run-level traceability for every AI-agent action, so every number in the system can be traced back to a source document, agent run, and (where applicable) advisor.
5. Support a permission model that requires zero schema change to move from Phase 1 (broad internal access) to Phase 2 (narrowed CFO/MD/family-member access).

## 4. Stakeholders

| Stakeholder | Interest |
|---|---|
| Group CFO / Family Office leadership | Accurate, timely, group-wide financial visibility; RIA performance accountability |
| Internal Tax Team | Correct, auditable tax computations; timely alerting on regulatory drift (e.g., Income-tax Act 2025 renumbering) |
| Internal Family Office analysts | Day-to-day ingestion, reconciliation, and reporting workflow |
| (Phase 2, not in scope) Entity CFOs/MDs, family members | Future narrowed-access consumers of the same backend, via new permission grants only |

## 5. Scope

### 5.1 In Scope (this phase)
- Document ingestion, validation, and parsing services for all `document_upload.document_type` values, including the new `RIA_STATEMENT` type.
- RIA/advisor master data services (`ria_advisor`, `advisor_mandate`) and per-transaction advisor attribution.
- Dual-scope (entity **or** advisor) performance computation services (XIRR/TWRR, Historical ROI).
- Liquidity, cash-flow, and forecast scenario services.
- Tax computation services and the Tax Rule Sentinel human-review workflow.
- Market intelligence services (benchmarking, corporate actions, concentration risk).
- Cross-cutting: authorization/permission enforcement, audit logging, scheduled jobs, natural-language query orchestration.

### 5.2 Out of Scope (this phase)
- Phase 2 narrowed-permission rollout (CFO/MD/family-member logins) — the *mechanism* (`AGGREGATE_ONLY` access level) must be supported in the auth layer design, but no such grants are issued in this phase.
- Live bank/AA/RTA API integrations described in `Apex_Ledger_AI.md`'s pipeline framework (RBI Account Aggregator, MFCentral, custodian APIs, H2H banking) — Phase 1 backend is upload/email-fallback-driven only; live pipeline integration is a future phase.
- Advisor-level concentration risk detection (flagged as an open question in Agents v2 §III/§IV, not a committed requirement).
- Co-advisory split modeling — schema v4 explicitly models per-transaction (not per-percentage) attribution; splitting a single transaction across multiple RIAs is out of scope by design.

## 6. Functional Requirements

### FR-1: Ingestion
- FR-1.1 The system shall validate every uploaded document before parsing, rejecting empty, corrupted, wrong-type, duplicate, or unresolvable-password-protected files with a structured, human-readable reason.
- FR-1.2 The system shall support re-upload as a versioned correction (`supersedes_document_id`), retaining the original record rather than deleting it.
- FR-1.3 The system shall classify RIA-sourced statements distinctly from direct bank/depository/AMC sources and require an advisor identification field before accepting the upload.
- FR-1.4 The system shall trace every parsed holding/transaction back to its source document.

### FR-2: Advisor Attribution & Mandate Enforcement
- FR-2.1 The system shall maintain a master list of RIAs and their mandate history (which entities they were/are engaged by, over what date ranges).
- FR-2.2 The system shall attribute each individual holding, corporate holding, and cash-flow transaction to at most one RIA (per-transaction, not co-advisory).
- FR-2.3 The system shall reject, at the database level, any attempt to attribute a transaction to an RIA that had no active mandate for that entity on that transaction's date. This is a **hard** enforcement requirement — no application-layer bypass is permitted.

### FR-3: Performance Computation
- FR-3.1 The system shall compute XIRR and TWRR for any legal entity/layer over any date range.
- FR-3.2 The system shall compute XIRR and TWRR for any individual RIA advisor, aggregated across every entity and layer that advisor is attributed to, sourced from the cash-flow transaction timeline (not holding snapshots).
- FR-3.3 The system shall never blend entity-scoped and advisor-scoped results in a single computed output.
- FR-3.4 The system shall restrict advisor selection to advisors with at least one attributed holding or transaction.
- FR-3.5 The system shall compute historical ROI trajectories with the same dual-scope (entity/advisor) behavior as FR-3.1–3.2.

### FR-4: Liquidity & Cash Flow
- FR-4.1 The system shall provide filterable monthly cash-flow reporting by entity, month, and transaction type.
- FR-4.2 The system shall track company-layer treasury balances with idle/dead-cash flagging.
- FR-4.3 The system shall support named, non-destructive "what-if" liquidity forecast scenarios that never alter actual records.
- FR-4.4 The system shall alert ~15 days before a projected entity-level cash deficit.

### FR-5: Tax Computation & Regulatory Drift Management
- FR-5.1 The system shall identify tax-loss harvesting opportunities, strictly segregated between individual tax-slab logic and corporate Section 80M logic.
- FR-5.2 The system shall surface Section 80M-eligible inter-corporate dividend flows at the company layer only.
- FR-5.3 The system shall detect tax-rule drift (rate changes and/or government section-renumbering) and stage it as a draft configuration row requiring explicit human sign-off before any downstream tax computation may consume it.
- FR-5.4 The system shall never silently apply an unverified tax rule to a live computation.

### FR-6: Market Intelligence
- FR-6.1 The system shall benchmark held assets against category averages, ratings, and peer performance.
- FR-6.2 The system shall detect and alert on upcoming corporate actions affecting held stocks, auto-adjusting cost basis.
- FR-6.3 The system shall detect cross-layer concentration risk (the same asset/sector held by both individuals and corporate entities).

### FR-7: Traceability & Compliance
- FR-7.1 Every AI-agent action shall be logged with agent name, triggering user (if any), scope, input parameters, output summary, and source data references.
- FR-7.2 Every agent action attributed to a specific RIA advisor shall log the `advisor_id` explicitly, distinct from entity-scoped runs.
- FR-7.3 Any holding, transaction, or computed figure shall be traceable back to its originating document and/or agent run on request.

### FR-8: Access Control
- FR-8.1 The system shall enforce data visibility per user based on granted entity scopes, not client-side filtering alone.
- FR-8.2 The authorization design shall support full, read-only, and aggregate-only access levels, even though Phase 1 only issues full-access grants to internal users.

## 7. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Performance** | Entity- or advisor-scoped XIRR/TWRR queries over a multi-year range should return within interactive latency (target: low single-digit seconds); nightly precomputation/caching is acceptable to meet this. |
| **Auditability** | No agent-driven data mutation (cost-basis adjustment, tax-rule staging, advisor attribution) may occur without a corresponding `agent_run_log` entry. |
| **Data Integrity** | Mandate enforcement must be DB-level (trigger), not application-level, to guarantee it cannot be bypassed by a future service that forgets to check. |
| **Reliability** | Scheduled jobs (corporate actions poll, liquidity check, tax-rule scan) must be idempotent and safely re-runnable after failure. |
| **Extensibility** | Schema and service changes must be additive (new tables/columns/endpoints), consistent with the project's established no-restructuring principle, to avoid breaking Phase 2 rollout or prior agent behavior. |
| **Security** | All endpoints must enforce entity-scope authorization server-side; no endpoint may rely on the frontend to withhold unauthorized data. |
| **Explainability** | Every synthesized answer from the natural-language query service must cite the underlying source data references used to produce it. |

## 8. Assumptions

- Phase 1 users are entirely internal (Tax Team, Family Office) and are granted full access to all entities; no Phase 2 access-narrowing logic is exercised yet, only designed for.
- RIA statement formats are heterogeneous enough that the RIA Statement Classification & Ingestion Agent must reuse the existing document-processing/PDF-fallback pipeline rather than assuming a single standard format.
- Live API pipelines described in `Apex_Ledger_AI.md` (AA, MFCentral, custodian, H2H banking) are a future phase; this phase's backend is designed so those pipelines can later feed the same ingestion/parsing services without restructuring (they would simply become new `source_pipeline` values, matching the existing extensibility pattern).
- A single financial year's tax rule set is small enough that human review of Tax Rule Sentinel drafts is operationally feasible without additional tooling beyond the review queue endpoint.

## 9. Constraints

- All schema changes must remain backward-compatible and additive — no destructive migrations without an explicit decision record (established project convention, schema v4 changelog).
- Internal agent-name identifiers (e.g., `CASH_FLOW_ANALYTICS_AGENT`) must remain stable regardless of UI display-label changes, to avoid breaking `agent_run_log` historical continuity.
- Mandate enforcement strictness (DB trigger) is intentionally stricter than Section 80M enforcement (app-layer only) — this asymmetry is a deliberate, documented decision and must not be "normalized" to one pattern without a new decision record.

## 10. Success Criteria

1. 100% of ingested documents pass through validation before any parsing cost is incurred.
2. 0 instances of advisor attribution bypassing mandate validation (enforced structurally, verifiable via DB trigger test coverage).
3. Every visible figure in the frontend (holding, XIRR, tax event) is traceable to a source document or agent run within the Audit Trail.
4. RIA-scoped XIRR/TWRR is available for 100% of RIAs with attributed activity, with zero cross-contamination between advisor-scoped and entity-scoped results.
5. Zero unverified `tax_rule_config` rows ever consumed by a live tax computation (verifiable via query-layer constraint, not just convention).
6. Phase 2 rollout requires zero backend schema or authorization-code changes — only new `permission_grant` rows.

## 11. Open Items Requiring a Decision

Carried forward from prior architectural review, still unresolved at the backend layer:
1. **Uploads page `advisor_name` free-text vs. `ria_advisor` master** — the ingestion service (BE-05) is specified against the v4 `ria_advisor` master, but the currently built Uploads UI still uses the v3 free-text pattern. Needs a decision on whether/when to propagate v4 naming into that page before BE-05 can be fully wired end-to-end.
2. **Internal table/agent-name vs. UI display-label divergence** (`cash_flow_transaction`/`treasury_balance`/`CASH_FLOW_ANALYTICS_AGENT` vs. "Fund Flow"/"Fund Position" labels) — backend services will continue using schema-accurate internal names per FR/BE conventions; confirm this divergence remains intentional and permanent rather than a pending rename.
3. **Advisor-concentration risk** (FR out of scope, §5.2) — confirm this stays out of scope, or add as a new user story if leadership wants it.
