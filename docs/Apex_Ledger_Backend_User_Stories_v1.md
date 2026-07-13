# Apex Portfolio OS — Backend User Stories (v1)

> **Scope:** These stories describe the backend/infrastructure layer (Python services,
> agent orchestration, APIs, schedulers) that implements `Apex_Ledger_AI_FE_User_Story_v4.md`
> and `Apex_Ledger_AI_Agents.md` (v2). Frontend stories describe *what the analyst sees*;
> these describe *what serves it*. Numbered `BE-XX`, independent of the `US-XX` numbering
> to avoid the naming-collision pattern already flagged in the frontend story doc.
> Phase 1 scope only (Internal Tax & Family Office team, all-scope grants) — Phase 2
> (CFO/MD/family-member narrowed access) requires no story changes here, only new
> `permission_grant` rows and enforcement at the API layer (see BE-19).

---

## Stage 0 — Ingestion Services

**BE-01: Document Upload API & Storage**
As the ingestion service, I need an endpoint that accepts a file + `entity_id` + `document_type`, persists it to object storage, and writes a `document_upload` row with `validation_status = PENDING`, so the frontend upload flow (US-01) has something to poll against.
*Acceptance:* `POST /documents` returns `document_id` immediately (async processing); file stored with a content-addressed path; SHA-256 computed inline for later dedup check (BE-02).

**BE-02: Pre-Parse Validation Service**
As the validation service, I need to run empty/corrupted/wrong-type/duplicate/password-protected checks *before* any AI-extraction cost is incurred, so that US-02's rejection reasons are accurate and cheap to produce.
*Acceptance:* Runs synchronously in the upload pipeline; writes one of the defined `validation_rejection_reason` enum values on failure; duplicate check compares `file_hash` against existing non-superseded rows for the same `entity_id`.

**BE-03: Re-upload / Supersession Handler**
As the ingestion service, I need to accept a `supersedes_document_id` on upload, mark the original `is_superseded = TRUE`, and never delete it, so that US-03's audit trail is preserved.
*Acceptance:* Original row remains queryable; new row's validation runs independently (a corrected re-upload is not assumed valid).

**BE-04: Parsing Orchestrator**
As the parsing service, I need to move `document_upload.parse_status` through `NOT_STARTED → PARSING → PARSED/PARSE_FAILED`, dispatching to the correct format-specific extractor (bank statement / demat / CAS / MF statement / RIA statement / other), so that US-04's status view reflects real progress.
*Acceptance:* Each extractor writes structured rows to `individual_holding`/`corporate_holding`/`cash_flow_transaction`/`treasury_balance` with `source_document_id` set (US-05 traceability); failures write `parse_error_detail` and leave existing data untouched.

**BE-05: RIA Statement Classification & Ingestion Agent — Service Implementation**
As the RIA ingestion service, I need to implement the RIA Statement Classification & Ingestion Agent (Agents v2 §I): validate the advisor field is present, resolve it against `ria_advisor.ria_code`, extract holdings/transactions, and attempt the write with `advisor_id` set.
*Acceptance:* Unresolved/unrecognized advisor names are staged for analyst confirmation, not silently created; a DB trigger rejection (no matching `advisor_mandate`) is caught and surfaced as a `parse_status = PARSE_FAILED` with a human-readable reason distinct from a generic parse error; Upload Dashboard Source column value is derived from this agent's output, not stored redundantly.
*Depends on:* BE-04, BE-15 (mandate schema access).

**BE-06: Email Ingestion Fallback Worker**
As the fallback ingestion worker, I need to poll a dedicated mailbox for AMC statement emails, decrypt password-protected PDFs where a known password pattern applies, and route successful extractions into the same `document_upload` + parsing pipeline as manual uploads, per the `Apex_Ledger_AI.md` fallback protocol.
*Acceptance:* `source_channel = 'EMAIL_INGESTION'`; `uploaded_by_user_id` is null; unresolvable password-protected files land in `validation_rejection_reason = 'PASSWORD_PROTECTED_UNRESOLVED'` for manual handling rather than silently dropping.

---

## Stage 1 — Reporting Services

**BE-07: XIRR/TWRR Computation Service**
As the returns computation service, I need to implement the XIRR & TWRR Engine with dual scoping (`entity_id` or `advisor_id`, per Agents v2 §II), pulling the cash-flow timeline from `cash_flow_transaction` and current valuations from `asset_valuation`.
*Acceptance:* `GET /returns?scope_type=entity&scope_id=...` and `GET /returns?scope_type=advisor&scope_id=...` are mutually exclusive parameter sets, never blended in one response; every run writes an `agent_run_log` row with `agent_name = 'XIRR_TWRR_ENGINE'`, `input_params` including `advisor_id` when advisor-scoped (Agents v2 §V); response includes as-of timestamp per data-freshness convention (US-09).
*Performance:* Must return in well under UI-perceptible latency for a single entity/advisor over a 5-year range — precompute/cache nightly rollups if raw computation proves too slow for on-demand ranges spanning many holdings.

**BE-08: Historical ROI Analytics Service**
As the historical analytics service, I need to implement the Historical ROI Analytics Agent with the same dual-scope pattern as BE-07, reusing its cash-flow resolution rather than re-deriving it, and overlay a labeled market-event timeline (e.g., 2020 correction) for chart rendering.
*Acceptance:* `GET /historical-roi?scope_type=...&scope_id=...&range=...`; market-event timeline is a maintained static/config dataset, not agent-derived.

**BE-09: Advisor Selectability Filter**
As the API layer, I need `GET /advisors?selectable=true` to return only RIAs with at least one attributed holding or transaction (join against `individual_holding`/`corporate_holding`/`cash_flow_transaction` on `advisor_id IS NOT NULL`), so the frontend's "View by: RIA Advisor" toggle (US-24) never offers a dead-end selection.
*Acceptance:* Query is indexed (schema v4 already adds partial indexes on `advisor_id IS NOT NULL` for all three tables) to stay performant as data grows.

**BE-10: Data Freshness Annotation Service**
As the reporting layer, I need every holdings/valuation/report response to carry a per-source `as_of_timestamp`-derived freshness label (e.g., "last updated 3 days ago via manual upload"), so US-09 is satisfied without each frontend view re-deriving it.
*Acceptance:* Shared utility function, not duplicated per endpoint; freshness label format centralized so it can't drift between pages.

---

## Stage 2 — Liquidity Services

**BE-11: Monthly Cash Flow Query Service**
As the reporting API, I need a filterable endpoint over `cash_flow_transaction` by `entity_id`, month, and `txn_type`, so US-10 can compile the monthly report.
*Acceptance:* `GET /cash-flows?entity_id=...&month=...&txn_type=...`.

**BE-12: Treasury Balance Service (Fund Position)**
As the treasury service, I need to expose current `treasury_balance` rows per company with idle/dead-cash flags, tagged with `INTRADAY`/`EOD` freshness, so US-11 can drive redeployment recommendations.
*Acceptance:* Company-layer scope only, enforced at the query layer (not just UI); "dead cash" threshold is a configurable parameter, not hardcoded.
*Naming note:* Internal table remains `treasury_balance`; UI displays "Fund Position" — service layer uses schema names internally and should not leak the UI label into API contracts.

**BE-13: Forecast Assumption Service**
As the liquidity service, I need CRUD on `forecast_assumption` (create/list/deactivate scenarios) with `assumption_params` validated per `assumption_type`, so US-12 can create named what-if scenarios without touching actuals.
*Acceptance:* `POST /forecast-assumptions` never writes to `cash_flow_transaction`/`treasury_balance`; scenario deactivation is a soft flag (`is_active = FALSE`), not a delete.

**BE-14: Predictive Liquidity Forecaster Service**
As the forecasting service, I need to implement the Predictive Liquidity Forecaster agent: run baseline-only and baseline+assumption projections side by side (US-13), and emit a deficit alert ~15 days ahead (US-14, configurable threshold).
*Acceptance:* `GET /liquidity-forecast?entity_id=...&assumption_id=optional` returns both series when no assumption is pinned to "actuals only" mode; alert emission is a scheduled job (see BE-20), not computed inline per request.

---

## Stage 3 — Tax Services

**BE-15: RIA Mandate & Advisor Master Service**
As the Account Master service, I need CRUD on `ria_advisor` and `advisor_mandate` (create/end a mandate, list roster with status), so US-25's Account Master section and BE-05's ingestion validation both have a single source of truth.
*Acceptance:* `POST /advisor-mandates` relies on the existing DB trigger for downstream enforcement — this service does not duplicate mandate-date-overlap validation logic beyond what's needed for a good error message; mandate end-dating is additive (new row/updated `end_date`), never a delete of history.

**BE-16: Tax Loss/Gain Matching Service**
As the tax service, I need to match unrealized gains/losses across holdings against booked gains, segregated by Individual (tax-slab logic) vs. Corporate (Section 80M logic), never blended in one query result, per US-15.
*Acceptance:* Two distinct endpoints or a mandatory `layer` discriminator parameter — never a single unfiltered union query, to make the "never blended" constraint structurally hard to violate.

**BE-17: Section 80M Routing Service**
As the tax service, I need to surface company-layer-only Section 80M-eligible dividend flows for deduction routing planning (US-16), reading only `verified_at`-set `tax_rule_config` rows for current rates/thresholds.
*Acceptance:* Individual entities structurally excluded at the query layer (`entity_type = 'COMPANY'` filter is non-optional, not a default).

**BE-18: Tax Rule Sentinel Scheduled Job**
As the scheduler, I need to run the Tax Rule Sentinel Agent post-Budget (annual, date-configurable) and on-demand (manual trigger endpoint), staging draft `tax_rule_config` rows and never setting `verified_at`.
*Acceptance:* `POST /tax-rules/scan` (on-demand) and a cron-triggered equivalent; review queue endpoint (`GET /tax-rules/pending`) surfaces `rule_category` + delta type (rate change vs. renumbering) explicitly, per US-22; approval endpoint (`POST /tax-rules/{id}/approve`) sets `verified_by_user_id`/`verified_at`; rejection endpoint retains the row with a reason field, mirroring `document_upload.is_superseded`'s retain-don't-delete pattern.

---

## Stage 4 — Market Intelligence & Cross-Cutting Services

**BE-19: Permission & Access Control Layer**
As the API gateway, I need every endpoint to resolve the requesting `app_user`'s `permission_grant` rows and filter results to their granted `scope_entity_id` set (or reject with 403), so Phase 1's broad internal grants and Phase 2's narrowed CFO/MD/family grants use identical enforcement code.
*Acceptance:* No endpoint queries tables without passing through a shared authorization filter function; `AGGREGATE_ONLY` access level (Phase 2 lever, currently an open question) is a recognized enum value in the auth layer even though Phase 1 never grants it, so Phase 2 requires zero code changes to the enforcement path — only new grant rows.

**BE-20: Alerting & Scheduled Jobs Runner**
As the platform, I need a job scheduler (e.g., APScheduler or a Celery beat equivalent) running: nightly XIRR/TWRR rollup precompute (supports BE-07), daily corporate-actions poll, daily liquidity-deficit check (BE-14), and the annual/on-demand tax-rule scan (BE-18).
*Acceptance:* Each job writes its own `agent_run_log` row on completion (success or failure), so job health is visible via the existing Audit Trail page without a separate ops dashboard.

**BE-21: Value Research Integration Service**
As the market intelligence service, I need to implement the Value Research Integration Agent — a scheduled pull of star ratings, category averages, expense ratios, exit loads, and fund-manager-change data mapped against `asset_master`, so US-18's benchmarking view has data to compare against.
*Acceptance:* External API failures degrade gracefully (serve last-known data with a staleness flag) rather than blanking the benchmarking page.

**BE-22: Corporate Actions Tracking Service**
As the market intelligence service, I need to implement the Corporate Actions Tracking Agent — poll exchange feeds for bonuses/splits/rights issues/mergers on held stocks and auto-adjust `avg_cost_basis` on affected `individual_holding`/`corporate_holding` rows, so US-19's alerts stay accurate without manual tracking.
*Acceptance:* Cost-basis adjustments are logged as a new `agent_run_log` entry with before/after values in `output_summary` — never a silent in-place update with no trace.

**BE-23: Concentration & Compliance Risk Service**
As the risk service, I need to implement the Concentration & Compliance Risk Agent — aggregate `individual_holding` + `corporate_holding` by `asset_id`/sector across all layers, so US-20's cross-layer exposure view is accurate regardless of which table a holding lives in.
*Acceptance:* `GET /concentration-risk?group_by=asset|sector`; result is a UNION-style aggregation across both holding tables, computed server-side, not left to the frontend to merge two separate calls.

**BE-24: Natural-Language Query Service (Insight Chat)**
As the chat backend, I need to implement the plain-English query interface (US-21): parse the question, determine which agent(s)/services above can answer it, execute, and return a synthesized answer that cites underlying `source_data_refs`.
*Acceptance:* Every query logs to `agent_run_log` with `source_data_refs` populated from whatever downstream service(s) it called; multi-layer questions (e.g., liquidity impact of a scenario) may internally call BE-14 + BE-11 and merge results — this service is an orchestrator over existing services, not a new data-access path.

**BE-25: Agent Run Log Write Path (shared library)**
As a shared internal library, I need a single `log_agent_run(agent_name, triggered_by_user_id, scope_entity_id, input_params, output_summary, source_data_refs)` function that every service above calls, so `advisor_id`-in-`input_params` logging (Agents v2 §V) and general audit consistency can't drift service-by-service.
*Acceptance:* No service writes to `agent_run_log` via raw SQL/ORM insert outside this shared function; unit tests assert the function signature is used across BE-05/07/08/14/18/21/22/23/24.

---

## Non-Functional / Infra Stories

**BE-26: Idempotent Job Execution**
As the scheduler, I need every scheduled job (BE-20) to be safely re-runnable without duplicating `agent_run_log` rows or double-adjusting cost bases, so a retry after a transient failure doesn't corrupt data.

**BE-27: Structured Error Contract**
As the API layer, I need all endpoints to return errors in a consistent shape (`{error_code, message, detail}`), with DB-trigger rejections (e.g., mandate violations) translated into a stable `error_code` (e.g., `ADVISOR_MANDATE_NOT_FOUND`) rather than a raw Postgres exception string leaking to the frontend.

**BE-28: Migration Discipline**
As the platform, I need all schema changes to ship as additive, reviewed SQL migrations matching the versioning convention already established in `apex_ledger_schema_v4.sql` (numbered sections, changelog header, no destructive `ALTER`/`DROP` without an explicit decision record).
