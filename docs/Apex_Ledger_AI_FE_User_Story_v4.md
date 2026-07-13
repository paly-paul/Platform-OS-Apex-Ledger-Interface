User Stories — Phase 1 (Internal Tax & Family Office Team)

> **v4 changelog:** Adds US-24 (Stage 1 — RIA Performance Attribution) and US-25
> (Stage 4 — RIA roster & mandate management). Multiple RIAs may each independently
> manage investments across companies, individuals, family, and the Group layer;
> each purchase/transaction is attributed to exactly one RIA (per-transaction
> attribution, not co-advisory splitting — see schema v4). This lets the Family
> Office evaluate a specific RIA's actual performance to decide whether to keep
> engaging them. Fix is additive: new `ria_advisor` + `advisor_mandate` tables,
> `advisor_id` on `individual_holding`/`corporate_holding`/`cash_flow_transaction`,
> and a hard DB trigger preventing attribution to an RIA never engaged by that
> entity (schema v4, section 13). No existing story renumbered or removed.

> **v3 changelog:** Adds US-23 (Stage 0 — RIA Statement ingestion). Companies and
> individuals/family members may delegate investment management to an external
> Registered Investment Advisor (RIA); statements then arrive from the RIA rather
> than directly from the bank/depository/AMC. Fix is additive: new `RIA_STATEMENT`
> document_type + source_pipeline value, plus a nullable `advisor_name` column
> (schema v3) + this new story. No existing story renumbered or removed. The RIA
> is modeled as a document source, not a new legal_entity — see schema v3 changelog.

> **v2 changelog:** Adds US-22 (Stage 3 — Tax Rule Sentinel review) following AY 2027-28
> tax research: Union Budget 2026 made no rate changes, but the Income-tax Act 2025
> (effective AY 2027-28) renumbers sections — a structural risk the original schema's
> hardcoded `SECTION_80M_DEDUCTION` enum didn't anticipate. Fix is additive: new
> `tax_rule_config` table (schema v2, section 10) + this new story. No existing story
> renumbered or removed.

Stage 0: Data Ingestion (Upload, Validation, Re-upload)
US-01: As a Tax/Family Office analyst, I want to upload a bank/demat/CAS statement for a specific entity (Company/Family/Individual), so that its holdings and transactions are captured without waiting for API integration.

Acceptance: Upload form requires entity selection + document type; file lands in document_upload with validation_status = PENDING.

US-02: As an analyst, I want the system to automatically reject empty, corrupted, or wrong-type documents with a clear reason, so that I know immediately to re-upload rather than waiting for a failed parse.

Acceptance: Validation runs pre-parse; rejection surfaces one of the defined validation_rejection_reason values with a plain-language prompt (e.g., "This file appears empty — please re-upload").

US-03: As an analyst, I want to re-upload a corrected document that supersedes a previous wrong/rejected upload, so that the correction is tracked without losing the original record.

Acceptance: New upload references supersedes_document_id; original marked is_superseded = TRUE, remains queryable, not deleted.

US-04: As an analyst, I want to see the parsing status of each uploaded document (uploaded → validating → parsing → parsed/failed), so that I know when data is ready to review.

Acceptance: Status visible in an upload dashboard/list view per entity.

US-05: As an analyst, I want to trace any holding or transaction back to the source document it came from, so that I can verify or audit a figure during tax review.

Acceptance: Holding/transaction detail view shows linked source_document_id with a link to view the original file.

US-23: As an analyst, I want to upload a statement that arrives from a Registered Investment Advisor (RIA) managing an entity's or individual's investments, and record which RIA it came from, so that RIA-sourced holdings/transactions are captured and distinguishable from direct bank/depository/AMC sources.

Acceptance: Selecting document_type = RIA_STATEMENT reveals a required "RIA / Advisor Name" field; submission is blocked with a clear message if the name is missing. The Upload Dashboard shows a Source column — "Direct" for bank/depository/AMC-sourced documents, "Via RIA: <name>" for RIA-sourced ones. advisor_name is stored on document_upload (NULL for non-RIA document types) and is not used to create a new legal_entity — the RIA is a document source, not a party in the entity hierarchy.

US-25: As a Family Office analyst, I want to see the full roster of Registered Investment Advisors alongside the Group/Company/Family/Individual hierarchy in Account Master, including which entities each RIA currently or previously held a mandate for, so that I have one place to see every party — ownership and advisory — touching the portfolio.

Acceptance: Account Master gains a "Registered Investment Advisors" section, listed as a peer to the existing hierarchy groups (not nested inside them, since an RIA is a service provider, not part of the ownership tree). Each RIA row shows ria_code, name, SEBI registration number, active/inactive status, and its mandate history (entity, start date, end date or "ongoing"). An entity may show multiple concurrent mandates; an RIA may span multiple entities and layers, including GROUP-level mandates.


Stage 1: Reporting (Performance, Historical)
US-06: As an analyst, I want to view current holdings and valuations at Individual, Company, Family, or Group level, so that I can report performance at the right granularity.

Acceptance: Layer selector drives which legal_entity scope's holdings/valuations render; Group view aggregates across Company + Family.

US-07: As an analyst, I want to see XIRR and TWRR for a selected entity/layer over a selected date range, so that I can report accurate returns net of capital movement noise.

Acceptance: Date-range picker; XIRR/TWRR computed via engine, displayed with as-of timestamp per data-freshness note from earlier journey design.

US-08: As an analyst, I want to view historical ROI charted against past market cycles (e.g., 2020 correction), so that I can assess portfolio resilience for board reporting.

Acceptance: Chart overlays entity's historical valuation against a labeled market-event timeline.

US-09: As an analyst, I want each report to show its data-as-of timestamp per source, so that I don't misrepresent stale upload-based data as real-time.

Acceptance: Every reporting view surfaces per-holding or per-layer freshness (e.g., "Company 4: last updated 3 days ago via manual upload").

US-24: As a Family Office analyst, I want to view XIRR/TWRR and historical ROI filtered by a specific RIA rather than by legal entity, so that I can evaluate that RIA's actual investment performance across every entity and holding they manage and decide whether to continue engaging them.

Acceptance: Performance and Historical ROI pages offer a "View by: Legal Entity / RIA Advisor" toggle. Selecting an RIA aggregates XIRR/TWRR/rolling returns/historical trajectory across every holding and transaction attributed to that advisor_id, spanning whichever entities and layers that RIA happens to touch — never blended with unattributed or other-RIA activity. Only RIAs with at least one attributed holding or transaction appear as selectable.


Stage 2: Monthly Cash Flow & Liquidity
US-10: As an analyst, I want to view monthly inflows/outflows and exits by entity and asset class, so that I can compile the monthly investment/exit report.

Acceptance: Filterable by entity, month, txn_type.

US-11: As an analyst, I want to see current treasury/cash balances per company with flags for idle/dead cash, so that I can recommend redeployment.

Acceptance: Company-layer view only (not individual/family); balance shown with EOD/intraday freshness tag.

US-12: As an analyst, I want to create a named liquidity forecast scenario with custom assumptions (e.g., surplus fund deployment, receivable delay), so that I can model "what-if" liquidity outcomes without altering actual records.

Acceptance: Form creates a forecast_assumption row with scenario_label, assumption_type, structured params; actuals untouched.

US-13: As an analyst, I want to run the liquidity forecast with or without an active assumption scenario, so that I can compare baseline vs. scenario-adjusted projections side by side.

Acceptance: Forecast view toggles between actuals-only and actuals+assumption; both results visible for comparison.

US-14: As an analyst, I want to be alerted ~15 days before an entity is projected to run a deficit, so that I can act before a shortfall occurs.

Acceptance: Alert threshold configurable; surfaces on entry dashboard per earlier journey design (Stage 0 of journey, not to be confused with ingestion Stage 0 above — naming collision noted below).


Stage 3: Yearly Tax Assessment
US-15: As an analyst, I want to see unrealized gains/losses across all holdings matched against booked gains, so that I can identify tax-loss harvesting opportunities before March 31.

Acceptance: Segregated by Individual (tax-slab logic) vs. Corporate (Section 80M logic) — never blended in the same view, per schema constraint.

US-16: As an analyst, I want to see Section 80M-eligible inter-corporate dividend flows per company, so that I can plan deduction routing before liability crystallizes.

Acceptance: Company-layer only; individual entities structurally excluded (matches tax_event constraint).

US-17: As an analyst, I want to generate an entity-wise and individual-wise tax liability projection report, so that I can hand it to the CA/auditor.

Acceptance: Exportable report, grouped by financial_year and entity.

US-22: As a Tax/Family Office analyst, I want to review and approve/reject AI-detected changes to tax rules (slabs, Section 80M mechanics, capital gains rates, section renumbering) each assessment year, so that stale or misapplied rules never silently affect tax computations.

Acceptance: Tax Rule Sentinel Agent stages draft `tax_rule_config` rows (post-Budget and on-demand); review queue surfaces category + rule delta (rate change vs. renumbering, distinguished explicitly); approval sets `verified_by_user_id`/`verified_at`, only then does the Tax Harvesting & 80M Optimizer agent read the row; rejected drafts retained with reason, not deleted — same pattern as `document_upload.is_superseded`.


Stage 4: Market Intelligence
US-18: As an analyst, I want to see which holdings are underperforming their category benchmark, so that I can flag them for review.

Acceptance: Comparison view driven by Value Research Integration Agent data against asset_master.category.

US-19: As an analyst, I want to be notified of upcoming corporate actions (splits/bonuses/mergers) affecting held stocks, so that cost basis stays accurate without manual tracking.

Acceptance: Alert list per entity, linked to affected asset_id.

US-20: As an analyst, I want to see cross-layer concentration risk (e.g., family and Company 3 both holding the same stock), so that I can flag true group-wide exposure.

Acceptance: Aggregates across individual_holding + corporate_holding by asset_id/sector, surfaced regardless of layer.

US-21: As an analyst, I want to ask a plain-English question spanning multiple layers (e.g., liquidity impact of a scenario), so that I get a synthesized, traceable answer without manual cross-referencing.

Acceptance: Query interface logs to agent_run_log with source_data_refs, answer cites underlying data.


Flag: naming collision, not a decision conflict
US-14 references "Stage 0" of the journey (entry dashboard), while this document's US-01–05 use "Stage 0" for ingestion. Both are legitimate uses from different artifacts (journey doc vs. this story set) — not a contradiction, just overlapping labels. Recommend renaming ingestion stories to "Stage 0.1 — Ingestion" in any frontend backlog tool to avoid confusion with the dashboard entry stage. No action needed unless you're loading both into the same tracker.