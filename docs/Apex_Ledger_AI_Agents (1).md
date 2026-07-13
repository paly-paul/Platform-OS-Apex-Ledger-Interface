# Apex Portfolio OS — AI Agent Architecture (v2)

> **v2 changelog (delta from v1 — additive only, no restructuring):**
> Cross-referenced against finalized UI, schema v4, and `Apex_Ledger_AI_FE_User_Story_v4.md`.
> 1. **NEW agent**: RIA Statement Classification & Ingestion Agent (§I) — closes the gap
>    identified for US-23; no agent previously owned RIA-sourced document handling.
> 2. **EXTENDED**: The XIRR & TWRR Engine (§II) and Historical ROI Analytics Agent (§II)
>    now support `advisor_id` scoping alongside `entity_id` scoping, per US-24.
> 3. **DOCUMENTED**: Tax Rule Sentinel Agent (§IV) — was added to the schema/user-story
>    layer in v2 of those artifacts (US-22) but never formally written up here. Backfilled
>    for completeness; no functional change.
> 4. **CONFIRMED NO NEW AGENT**: US-25 (RIA roster & mandate management) is a CRUD/read
>    view over `ria_advisor` + `advisor_mandate` — explicitly not an agent function.
>    Mandate-validity enforcement (US-24/schema v4 §13) is a hard DB-level trigger, not
>    an agent — explicitly documented here to prevent future re-litigation of this boundary.
> 5. **NEW cross-cutting convention**: every agent that reads or writes advisor-attributed
>    data must log `advisor_id` in `agent_run_log.input_params` — see §V.
> No agent renamed, removed, or restructured. All existing agent-name identifiers
> (e.g. `CASH_FLOW_ANALYTICS_AGENT`) remain stable per the audit-trail taxonomy already
> in use in the app shell — this is a naming-stability guarantee independent of any
> UI display-label renaming (see open inconsistency log in project notes).

---

## I. Data Orchestration & Market Intelligence Agents

### Value Research Integration Agent
**Purpose:** Acts as a direct programmatic bridge to fetch external market data. Maps the 300+ current funds/stocks against Value Research's real-time star ratings, category averages, expense ratios, exit loads, peer performance, and fund manager changes to instantly flag if an asset on the ledger is underperforming its category benchmark.
**Feeds:** US-18 (Benchmarking).
**Scope key(s):** `asset_id`.

### Corporate Actions Tracking Agent
**Purpose:** Monitors exchange feeds and data endpoints for upcoming corporate actions (bonuses, splits, rights issues, mergers) across the 300 stocks, auto-adjusting acquisition cost bases for accurate computation.
**Feeds:** US-19 (Corporate Actions).
**Scope key(s):** `asset_id`.

### RIA Statement Classification & Ingestion Agent — **NEW (v2)**
**Purpose:** Closes the ingestion gap for RIA-sourced statements (US-23). On any `document_upload` row where `document_type = 'RIA_STATEMENT'`, this agent:
1. Validates the required advisor identification field is present (blocking submission otherwise, per US-23 acceptance criteria).
2. Resolves the free-text/selected advisor reference against the `ria_advisor` master (`ria_code`) — flagging a "new/unrecognized RIA" case for analyst confirmation rather than silently creating a row, consistent with the "no silent resolution of inconsistencies" principle already established for this project.
3. Extracts holdings/transactions from the statement (reusing the same document-processing pipeline as `EMAIL_PDF_FALLBACK` for password-protected PDFs, per `Apex_Ledger_AI.md`'s fallback protocol) and stages them for the existing holding/cash-flow write path.
4. Sets `advisor_id` on the resulting `individual_holding` / `corporate_holding` / `cash_flow_transaction` rows. This write will be rejected by the DB-level mandate trigger (schema v4 §13) if no `advisor_mandate` covers the (advisor, entity, date) — the agent does not duplicate that check; it relies on the trigger as the enforcement boundary and surfaces the trigger's rejection back to the analyst as a parse/reconciliation error.
5. Populates the Upload Dashboard's Source column value ("Via RIA: `<name>`") consumed by the frontend per US-23.
**Feeds:** US-23 (RIA statement ingestion), indirectly US-25 (mandate history visibility depends on correctly attributed data existing).
**Scope key(s):** `document_id`, `advisor_id`, `entity_id`.
**Note:** This agent does **not** create or modify `advisor_mandate` rows — mandate creation/termination is a CRUD action performed by a Family Office analyst via Account Master (US-25), not an agent decision. The agent only consumes existing mandates to validate attribution.

---

## II. Core Performance Analytics Agents

### The XIRR & TWRR Engine — **EXTENDED (v2)**
**Purpose:** Computes accurate Extended Internal Rate of Return (XIRR) and Time-Weighted Rate of Return (TWRR) at multiple levels. Strips out the noise of intermittent capital infusions/drawdowns across the 10 companies and family pools, computing point-in-time and rolling returns.
**v2 extension (US-24):** Accepts a scope of either `entity_id` (existing behavior, unchanged) **or** `advisor_id` (new). When scoped by `advisor_id`, the engine builds the cash-flow timeline from every `cash_flow_transaction` row where `advisor_id` matches — regardless of which `entity_id` each row belongs to — and computes a single blended XIRR/TWRR across all entities/layers that advisor touches. This is why schema v4 added `advisor_id` to `cash_flow_transaction` directly rather than deriving it from the holding tables: returns must be computed from the actual cash-flow timeline, not inferred from snapshots.
**Constraint:** Advisor-scoped and entity-scoped runs are never blended in one output (mirrors the existing individual-vs-corporate tax segregation principle). Only advisors with at least one attributed holding or transaction are computable/selectable, per US-24 acceptance criteria.
**Feeds:** US-07 (entity-scoped), US-24 (advisor-scoped).
**Scope key(s):** `entity_id` **or** `advisor_id` (mutually exclusive per run).

### Historical ROI Analytics Agent — **EXTENDED (v2)**
**Purpose:** Conducts historical vintage analysis. Visually charts absolute and annualized historical ROI cycles, analyzing how the portfolio performed across past economic milestones (e.g., market corrections, interest rate cycles) to evaluate true portfolio resilience.
**v2 extension (US-24):** Same dual-scope pattern as the XIRR & TWRR Engine above — accepts `advisor_id` as an alternate scope key to `entity_id`, producing an advisor-level historical trajectory chart spanning every entity/layer that advisor's attributed holdings touch. Reuses the XIRR & TWRR Engine's advisor-scoped cash-flow resolution rather than re-deriving it.
**Feeds:** US-08 (entity-scoped), US-24 (advisor-scoped).
**Scope key(s):** `entity_id` **or** `advisor_id`.

---

## III. Flow & Liquidity Orchestration Agents

### Cash Flow Analytics Agent
**Purpose:** Analyzes operational "Company Level" cash. Maps historical revenue collection cycles, accounts receivables, and core operational expenses across the 10 entities to identify dead cash balances that should be deployed into treasury.
**Feeds:** Displayed in-app as "Fund Flow Analytics Agent" (UI display-label override — internal identifier `CASH_FLOW_ANALYTICS_AGENT` and underlying table names `cash_flow_transaction`/`treasury_balance` are unchanged; see open inconsistency log).
**Scope key(s):** `entity_id` (COMPANY layer only).
**No v2 change.**

### Investment Flow Ingestion Agent
**Purpose:** Evaluates where capital is traveling. Tracks structural money movement — categorizing inflows and outflows into equity, debt, alternative investment funds (AIFs), and inter-corporate loans — to evaluate net asset deployment velocity.
**No v2 change.** *(Open question, not a confirmed change: should this agent also categorize RIA-attributed vs. direct flows separately? Deferred — no user story currently requires it.)*

### Predictive Liquidity Forecaster
**Purpose:** Conducts cash runway modeling. Overlays expected investment flows against definitive corporate liabilities (GST cycles, advance tax tranches, dividend payouts) and alerts the CFO ~15 days before an entity runs a deficit or structural surplus.
**Feeds:** US-12, US-13, US-14. Takes `forecast_assumption` rows as optional overlay input via `agent_run_log.input_params` — no new agent mechanism, only new usage (per schema v4 §11 comment).
**No v2 change.**

---

## IV. Tax & Regulatory Sentinel Agents

### Tax Harvesting & Section 80M Optimizer
**Purpose:** Scans the entire 300-asset universe to match unrealized short-term/long-term losses against booked gains. For corporate levels, monitors incoming dividends and applies Section 80M deduction routing logic to minimize tax liability before capital exits the corporate layer.
**Constraint:** Only reads `tax_rule_config` rows where `verified_by_user_id`/`verified_at` are set (i.e., only reads rows the Tax Rule Sentinel Agent staged and a human has approved) — never reads draft rows directly.
**Feeds:** US-15, US-16, US-17.
**No v2 change.**

### Tax Rule Sentinel Agent — **DOCUMENTED (backfilled from v2 of schema/user-story artifacts)**
**Purpose:** Detects tax-rule drift — slab changes, Section 80M mechanics changes, capital gains rate changes, and government section-renumbering (e.g., the Income-tax Act 2025 transition) — and stages the finding as a **draft** row in `tax_rule_config`, distinguishing explicitly between a rate change and a pure renumbering.
**Trigger cadence:** Post-Budget (annual) and on-demand.
**Constraint:** Never writes a row with `verified_at` set — only a human reviewer (US-22) can promote a draft to live via the review queue. This decouples "what we call the rule" (`tax_event.event_type`, stable) from "what the government currently calls/numbers it" (`tax_rule_config.section_reference`, volatile) — see schema v4 §10 rationale.
**Feeds:** US-22.
**Scope key(s):** `financial_year`, `rule_category`.

### Concentration & Compliance Risk Agent
**Purpose:** Aggregates stock holdings across all individual demats and corporate balance sheets. If the family owns Stock X personally and Company 3's treasury also buys Stock X, flags the true group-wide cumulative risk exposure to that single corporate house or sector.
**Feeds:** US-20.
**No v2 change.** *(Open question, not a confirmed change: should this agent also detect advisor-concentration risk — e.g., one RIA managing too large a share of group AUM? Out of scope for any current user story; flagged for future consideration, not actioned here.)*

---

## V. Cross-Cutting Conventions

### Audit Trail Logging (`agent_run_log`) — **NEW convention (v2)**
Any agent run above that reads or writes advisor-attributed data (the XIRR & TWRR Engine and Historical ROI Analytics Agent when advisor-scoped; the RIA Statement Classification & Ingestion Agent always) **must** include `advisor_id` inside `agent_run_log.input_params` (alongside the existing `scope_entity_id` column, which remains populated where a single entity is still meaningful, or left null for a true cross-entity advisor-scoped run). This is additive to the existing `agent_run_log` schema — no column change required, since `input_params` is already `JSONB`. Purpose: lets the Audit Trail page filter/display RIA-attributed agent runs distinctly from entity-attributed ones, closing the traceability gap noted during the last UI/schema reconciliation pass.

### Agent-vs-CRUD Boundary — **explicit restatement (v2)**
For future reference, the following are confirmed **not** agent responsibilities and must not be added to this roster without a new decision record:
- RIA roster display and mandate history (US-25) — CRUD/read layer only.
- Mandate-validity enforcement — DB-level trigger (schema v4 §13), not an agent.
- Section 80M event-type stability — enum constraint, not an agent decision.
