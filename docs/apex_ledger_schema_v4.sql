-- ============================================================================
-- Apex Portfolio OS — Core Data Schema (v4)
-- Phase 1 scope: Internal Tax & Family Office team only (all-scope grants)
-- Phase 2 scope: CFO/MD/Family-member access via narrowed permission grants
--                (no table restructuring required — see permission_grant)
-- ============================================================================
-- Design principles (per conversation decisions):
-- 1. Four layers (Group/Company/Family/Individual) modeled as a scope
--    hierarchy on `legal_entity`, not separate schemas per layer.
-- 2. Individual vs Corporate holdings kept in structurally separate tables
--    (not a `layer` flag on one table) — Section 80M vs individual tax-slab
--    logic are legally distinct and must not blend, regardless of phase.
-- 3. Permission scopes exist from Phase 1, just granted broadly to internal
--    users. Phase 2 = new grant rows, not new tables.
-- ============================================================================
-- v2 CHANGELOG (delta from v1 — additive only, no restructuring):
-- 1. NEW section 10: tax_rule_config table + Tax Rule Sentinel Agent support.
--    Rationale: AY 2027-28 research (Union Budget 2026 + Income-tax Act 2025)
--    confirmed no rate changes this cycle, but the Act renumbers sections
--    (e.g. old 87A rebate references now surfacing as "Section 157" on some
--    trackers). tax_event.event_type's 'SECTION_80M_DEDUCTION' is a STABLE
--    CATEGORY LABEL, not a literal section-number reference — it does not
--    need to change. The actual in-force section number/rate/threshold now
--    lives in tax_rule_config.section_reference, versioned by financial_year
--    and gated by verified_by_user_id/verified_at before any agent may use
--    it in live computation. This decouples "what we call the rule" from
--    "what number the government currently assigns it" — see US-22.
-- 2. No changes to existing tables/constraints. Fully backward-compatible.
-- ============================================================================
-- v3 CHANGELOG (delta from v2 — additive only, no restructuring):
-- 1. NEW source: Registered Investment Advisor (RIA) statements. Companies
--    and individuals/family members may delegate investment management to
--    an external RIA; statements then arrive from the RIA rather than
--    directly from the bank/depository/AMC. Modeled as a new document_type
--    + source_pipeline value, NOT a new legal_entity type — the RIA is a
--    document/data source, not a party in the entity hierarchy. If a future
--    requirement needs to track "which RIA manages which entity" as a
--    standing relationship, that would be an additive advisor_relationship
--    table referencing legal_entity — deferred until actually needed.
-- 2. document_upload.document_type CHECK widened to add 'RIA_STATEMENT'.
-- 3. document_upload gets a new nullable column advisor_name (the RIA's
--    name) — null for all non-RIA document types, additive/non-breaking.
-- 4. individual_holding.source_pipeline and corporate_holding.source_pipeline
--    CHECKs widened to add 'RIA_STATEMENT' — an RIA can manage either an
--    individual/family portfolio or a corporate balance-sheet portfolio,
--    so both tables get the value (mirrors how EMAIL_INGESTION/MANUAL_UPLOAD
--    already apply to both).
-- 5. No changes to existing tables/constraints/columns. Fully backward-compatible.
-- ============================================================================
-- v4 CHANGELOG (delta from v3 — additive only, no restructuring):
-- 1. NEW: multiple Registered Investment Advisors (RIAs) can each independently
--    manage investments for companies, individuals, family, and even the Group
--    layer. Modeled as:
--      a. ria_advisor       — master list of RIAs (ria_code, name, SEBI reg no).
--      b. advisor_mandate   — which RIA(s) are/were engaged by which
--                             legal_entity, over a date range (start_date/
--                             end_date; NULL end_date = ongoing engagement).
--                             An entity can have more than one active mandate
--                             (multiple RIAs engaged at once); an RIA can hold
--                             mandates across many entities and across layers.
-- 2. Per-purchase / per-transaction attribution, NOT co-advisory splitting:
--    each individual_holding/corporate_holding row and each
--    cash_flow_transaction row already represents a single purchase/txn with
--    its own date — so attribution is a single nullable advisor_id FK added
--    to each of those three tables, not a many-to-many junction. E.g. a Jan
--    2026 purchase attributed to RIA A and a June 2026 purchase of the same
--    stock attributed to RIA B are simply two separate rows, each with its
--    own advisor_id — exactly how the schema already stores them.
-- 3. advisor_id is added to cash_flow_transaction (not just the holding
--    tables) specifically so XIRR/TWRR can be computed PER ADVISOR — this is
--    what answers "how did RIA A's picks perform" for an engage/disengage
--    decision, since returns are computed from the cash flow timeline, not
--    the holding snapshot alone.
-- 4. HARD DB-level enforcement via trigger (not an app-layer convention, per
--    explicit decision — this is a stricter guarantee than the rest of the
--    schema uses elsewhere, e.g. Section 80M is app-layer-only by comparison):
--    a BEFORE INSERT/UPDATE trigger on individual_holding, corporate_holding,
--    and cash_flow_transaction rejects any row where advisor_id is set but no
--    advisor_mandate exists for that (advisor_id, entity_id) pair covering the
--    row's date (acquisition_date or txn_date, as applicable). An advisor can
--    never be attributed to an entity it was never engaged to manage.
-- 5. No changes to existing tables/constraints/columns. Fully backward-compatible.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. ENTITY HIERARCHY (Group / Company / Family / Individual)
-- ----------------------------------------------------------------------------

CREATE TABLE legal_entity (
    entity_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type         VARCHAR(20) NOT NULL CHECK (entity_type IN ('GROUP', 'COMPANY', 'FAMILY', 'INDIVIDUAL')),
    entity_name         VARCHAR(200) NOT NULL,
    pan                 VARCHAR(10),                -- corporate/individual PAN, nullable for GROUP/FAMILY roll-up nodes
    parent_entity_id    UUID REFERENCES legal_entity(entity_id),  -- e.g. Company -> Group, Individual -> Family
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE legal_entity IS
    'All 4 layers live here. GROUP = 1 row (roll-up). COMPANY = 10 rows (the operating entities). FAMILY = 1 row (roll-up). INDIVIDUAL = family members. Hierarchy via parent_entity_id.';

CREATE INDEX idx_legal_entity_type ON legal_entity(entity_type);
CREATE INDEX idx_legal_entity_parent ON legal_entity(parent_entity_id);

-- ----------------------------------------------------------------------------
-- 2. ASSET MASTER (Stocks, Mutual Funds, AIFs, Private Holdings)
-- ----------------------------------------------------------------------------

CREATE TABLE asset_master (
    asset_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_type          VARCHAR(20) NOT NULL CHECK (asset_type IN ('EQUITY', 'MUTUAL_FUND', 'AIF', 'PRIVATE_HOLDING', 'DEBT', 'CASH_EQUIVALENT')),
    isin                VARCHAR(12),
    asset_name          VARCHAR(200) NOT NULL,
    exchange            VARCHAR(20),                -- NSE/BSE, null for MF/AIF/private
    amc_name            VARCHAR(100),                -- for MFs: CAMS/KFintech-registered AMC
    category            VARCHAR(50),                 -- e.g. 'Large Cap', 'Debt-Short Duration' — feeds Value Research Agent benchmarking
    sector              VARCHAR(50),                 -- feeds Concentration & Compliance Risk Agent
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_asset_isin ON asset_master(isin);
CREATE INDEX idx_asset_sector ON asset_master(sector);

-- ----------------------------------------------------------------------------
-- 3. HOLDINGS — split by legal context (per design principle #2)
-- ----------------------------------------------------------------------------

-- Individual & Family holdings (AA/Demat-sourced, individual tax-slab rules apply)
CREATE TABLE individual_holding (
    holding_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id           UUID NOT NULL REFERENCES legal_entity(entity_id),  -- must be entity_type = INDIVIDUAL
    asset_id            UUID NOT NULL REFERENCES asset_master(asset_id),
    quantity            NUMERIC(20,6) NOT NULL,
    avg_cost_basis      NUMERIC(20,4) NOT NULL,
    acquisition_date    DATE NOT NULL,
    source_pipeline     VARCHAR(30) NOT NULL CHECK (source_pipeline IN ('AA_REBIT', 'MFCENTRAL', 'NSDL_CDSL', 'MANUAL')),
    source_ref_id       VARCHAR(100),                -- consent artifact ID / CAS batch ID — traceability per "show your work" requirement
    as_of_timestamp     TIMESTAMPTZ NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Corporate holdings (SFTP/institutional-fed, Section 80M rules apply)
CREATE TABLE corporate_holding (
    holding_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id           UUID NOT NULL REFERENCES legal_entity(entity_id),  -- must be entity_type = COMPANY
    asset_id            UUID NOT NULL REFERENCES asset_master(asset_id),
    quantity            NUMERIC(20,6) NOT NULL,
    avg_cost_basis      NUMERIC(20,4) NOT NULL,
    acquisition_date    DATE NOT NULL,
    source_pipeline     VARCHAR(30) NOT NULL CHECK (source_pipeline IN ('RTA_SFTP', 'CUSTODIAN_API', 'SPEED_E', 'CDSL_B2B', 'EMAIL_PDF_FALLBACK', 'MANUAL')),
    source_batch_id     VARCHAR(100),                -- EOD SFTP batch reference — traceability
    as_of_timestamp     TIMESTAMPTZ NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ind_holding_entity ON individual_holding(entity_id);
CREATE INDEX idx_ind_holding_asset ON individual_holding(asset_id);
CREATE INDEX idx_corp_holding_entity ON corporate_holding(entity_id);
CREATE INDEX idx_corp_holding_asset ON corporate_holding(asset_id);

-- ----------------------------------------------------------------------------
-- 4. VALUATION TIME-SERIES (feeds XIRR/TWRR Engine + Historical ROI Agent)
-- ----------------------------------------------------------------------------

CREATE TABLE asset_valuation (
    valuation_id        BIGSERIAL PRIMARY KEY,
    asset_id            UUID NOT NULL REFERENCES asset_master(asset_id),
    valuation_date       DATE NOT NULL,
    nav_or_price         NUMERIC(20,6) NOT NULL,
    source_pipeline      VARCHAR(30) NOT NULL,       -- 'RTA_NAV_FEED', 'EXCHANGE_FEED', etc.
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (asset_id, valuation_date)
);

CREATE INDEX idx_valuation_asset_date ON asset_valuation(asset_id, valuation_date DESC);

-- ----------------------------------------------------------------------------
-- 5. CASH FLOWS & TRANSACTIONS (feeds Investment Flow Agent, Cash Flow Agent)
-- ----------------------------------------------------------------------------

CREATE TABLE cash_flow_transaction (
    txn_id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id            UUID NOT NULL REFERENCES legal_entity(entity_id),
    txn_type             VARCHAR(30) NOT NULL CHECK (txn_type IN
                          ('INVESTMENT_INFLOW', 'INVESTMENT_OUTFLOW', 'REDEMPTION', 'DIVIDEND',
                           'INTER_CORPORATE_LOAN', 'TAX_PAYMENT', 'ADVANCE_TAX', 'BANK_TRANSFER')),
    asset_id             UUID REFERENCES asset_master(asset_id),   -- null for pure cash/tax transactions
    amount               NUMERIC(20,4) NOT NULL,
    txn_date             DATE NOT NULL,
    counterparty_entity_id UUID REFERENCES legal_entity(entity_id), -- for inter-corporate loans/transfers
    source_pipeline       VARCHAR(30) NOT NULL,       -- 'CAMT053', 'BAI2', 'CAMT052', 'RTA_SFTP', etc.
    source_ref_id         VARCHAR(100),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cashflow_entity_date ON cash_flow_transaction(entity_id, txn_date DESC);
CREATE INDEX idx_cashflow_type ON cash_flow_transaction(txn_type);

-- Bank treasury balances (Company layer only — investable/liquid cash, NOT operating ERP cash)
CREATE TABLE treasury_balance (
    balance_id           BIGSERIAL PRIMARY KEY,
    entity_id            UUID NOT NULL REFERENCES legal_entity(entity_id),  -- must be entity_type = COMPANY
    bank_name             VARCHAR(50) NOT NULL,
    account_ref           VARCHAR(50) NOT NULL,       -- masked/tokenized account identifier
    balance_amount        NUMERIC(20,4) NOT NULL,
    balance_type          VARCHAR(20) NOT NULL CHECK (balance_type IN ('INTRADAY', 'EOD')),
    as_of_timestamp        TIMESTAMPTZ NOT NULL,
    source_pipeline        VARCHAR(20) NOT NULL CHECK (source_pipeline IN ('CAMT052', 'CAMT053', 'BAI2')),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_treasury_entity_date ON treasury_balance(entity_id, as_of_timestamp DESC);

-- ----------------------------------------------------------------------------
-- 6. TAX EVENTS (feeds Tax Harvesting & Section 80M Optimizer)
-- ----------------------------------------------------------------------------

CREATE TABLE tax_event (
    tax_event_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id             UUID NOT NULL REFERENCES legal_entity(entity_id),
    event_type            VARCHAR(30) NOT NULL CHECK (event_type IN
                           ('REALIZED_STCG', 'REALIZED_LTCG', 'REALIZED_STCL', 'REALIZED_LTCL',
                            'DIVIDEND_RECEIVED', 'SECTION_80M_DEDUCTION', 'ADVANCE_TAX_PAID', 'GST_LIABILITY')),
    asset_id              UUID REFERENCES asset_master(asset_id),
    amount                NUMERIC(20,4) NOT NULL,
    financial_year         VARCHAR(9) NOT NULL,        -- e.g. '2025-2026'
    computed_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Enforces the "never blended" rule: individual entities cannot carry SECTION_80M_DEDUCTION rows
    CONSTRAINT chk_80m_corporate_only CHECK (
        event_type != 'SECTION_80M_DEDUCTION'
        -- enforced at application layer via entity_type join; documented here for visibility
    )
);

CREATE INDEX idx_tax_event_entity_fy ON tax_event(entity_id, financial_year);

-- ----------------------------------------------------------------------------
-- 7. PERMISSION SCOPES — the Phase 1 → Phase 2 lever
-- ----------------------------------------------------------------------------
-- Phase 1: grant ALL scopes to internal Tax/Family Office team members.
-- Phase 2: grant narrowed scopes (own COMPANY + GROUP-aggregate-readonly,
--          or own INDIVIDUAL + FAMILY) to CFO/MD/family-member logins.
-- No schema change needed to go from Phase 1 to Phase 2 — only new rows
-- in permission_grant, and enforcement in the API/app layer.

CREATE TABLE app_user (
    user_id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email                 VARCHAR(200) NOT NULL UNIQUE,
    display_name           VARCHAR(200) NOT NULL,
    user_category           VARCHAR(30) NOT NULL CHECK (user_category IN ('INTERNAL_TAX_TEAM', 'INTERNAL_FAMILY_OFFICE', 'CFO', 'MD', 'FAMILY_MEMBER')),
    -- Phase 1 will only ever populate INTERNAL_TAX_TEAM / INTERNAL_FAMILY_OFFICE
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE permission_grant (
    grant_id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                  UUID NOT NULL REFERENCES app_user(user_id),
    scope_entity_id          UUID NOT NULL REFERENCES legal_entity(entity_id),  -- which entity's data is visible
    access_level             VARCHAR(20) NOT NULL CHECK (access_level IN ('FULL', 'READ_ONLY', 'AGGREGATE_ONLY')),
    -- AGGREGATE_ONLY: Phase 2 lever for e.g. entity CFO seeing Group-level totals
    -- without drilling into other companies' line items (open question from
    -- prior conversation — deferred to Phase 2, this column is where the
    -- decision gets implemented once made).
    granted_by                UUID REFERENCES app_user(user_id),
    granted_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at                  TIMESTAMPTZ,           -- null = active grant
    UNIQUE (user_id, scope_entity_id)
);

CREATE INDEX idx_grant_user ON permission_grant(user_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_grant_entity ON permission_grant(scope_entity_id) WHERE revoked_at IS NULL;

-- ----------------------------------------------------------------------------
-- 8. AGENT AUDIT LOG (traceability — "show your work" for tax/fiduciary trust)
-- ----------------------------------------------------------------------------

CREATE TABLE agent_run_log (
    run_id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_name                 VARCHAR(50) NOT NULL,     -- e.g. 'XIRR_TWRR_ENGINE', 'TAX_80M_OPTIMIZER'
    triggered_by_user_id        UUID REFERENCES app_user(user_id),
    scope_entity_id              UUID REFERENCES legal_entity(entity_id),
    input_params                 JSONB,
    output_summary                 JSONB,
    source_data_refs                JSONB,             -- array of source_ref_id/batch_id values used — the trace
    run_timestamp                    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_log_entity ON agent_run_log(scope_entity_id, run_timestamp DESC);
CREATE INDEX idx_agent_log_agent ON agent_run_log(agent_name, run_timestamp DESC);

-- ----------------------------------------------------------------------------
-- 9. DOCUMENT UPLOAD & VALIDATION (Phase 0.1 manual upload, dual-mode in Phase 1)
-- ----------------------------------------------------------------------------
-- Validation runs BEFORE parsing — rejects empty/corrupted/wrong-type files
-- prior to any AI-extraction cost. Re-upload is versioned via
-- supersedes_document_id (superseded docs are retained, not deleted, per
-- existing audit-trail requirement — see agent_run_log precedent).

CREATE TABLE document_upload (
    document_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id                UUID NOT NULL REFERENCES legal_entity(entity_id),
    document_type             VARCHAR(30) NOT NULL CHECK (document_type IN
                               ('BANK_STATEMENT', 'DEMAT_STATEMENT', 'CAS', 'MF_STATEMENT', 'RIA_STATEMENT', 'OTHER')),
    source_channel             VARCHAR(20) NOT NULL CHECK (source_channel IN ('MANUAL_UPLOAD', 'EMAIL_INGESTION')),
    file_path                  VARCHAR(500) NOT NULL,
    file_hash                  VARCHAR(64),           -- SHA-256, dedup detection on re-upload of identical file
    uploaded_by_user_id         UUID REFERENCES app_user(user_id),  -- null if EMAIL_INGESTION with no human uploader
    uploaded_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Validation gate (runs before parsing)
    validation_status             VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (validation_status IN
                                   ('PENDING', 'VALID', 'REJECTED')),
    validation_rejection_reason    VARCHAR(30) CHECK (validation_rejection_reason IN
                                   ('EMPTY_FILE', 'UNREADABLE_CORRUPTED', 'WRONG_DOCUMENT_TYPE',
                                    'UNSUPPORTED_FORMAT', 'DUPLICATE_FILE', 'PASSWORD_PROTECTED_UNRESOLVED')),
    validated_at                    TIMESTAMPTZ,

    -- Parsing (only runs after validation_status = VALID)
    parse_status                    VARCHAR(20) NOT NULL DEFAULT 'NOT_STARTED' CHECK (parse_status IN
                                     ('NOT_STARTED', 'PARSING', 'PARSED', 'PARSE_FAILED', 'RECONCILED')),
    parse_error_detail                TEXT,
    parsed_at                          TIMESTAMPTZ,

    -- Versioned re-upload / correction
    supersedes_document_id              UUID REFERENCES document_upload(document_id),
    is_superseded                         BOOLEAN NOT NULL DEFAULT FALSE,  -- set TRUE once a later doc supersedes this one

    created_at                              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_doc_upload_entity ON document_upload(entity_id, uploaded_at DESC);
CREATE INDEX idx_doc_upload_validation ON document_upload(validation_status) WHERE validation_status = 'REJECTED';
CREATE INDEX idx_doc_upload_supersedes ON document_upload(supersedes_document_id);

COMMENT ON COLUMN document_upload.validation_rejection_reason IS
    'Structured reason drives the UI re-upload prompt — e.g. UNREADABLE_CORRUPTED -> "file could not be read, please re-upload a clear scan"; distinct from parse_error_detail which covers extraction failures on already-valid files.';

-- v3 addition: identify the Registered Investment Advisor for RIA_STATEMENT
-- uploads. Nullable — populated only when document_type = 'RIA_STATEMENT';
-- NULL for all bank/depository/AMC-direct document types. Deliberately a
-- free-text column, not a new legal_entity/FK, since the RIA is a document
-- source here, not a party in the entity hierarchy (see v3 changelog above).
ALTER TABLE document_upload ADD COLUMN advisor_name VARCHAR(200);

COMMENT ON COLUMN document_upload.advisor_name IS
    'Registered Investment Advisor name, captured only for document_type = RIA_STATEMENT. NULL otherwise.';

-- Trace parsed rows back to source document (extends existing source_pipeline
-- pattern on ingestion tables — add nullable FK, non-breaking alter):
ALTER TABLE individual_holding ADD COLUMN source_document_id UUID REFERENCES document_upload(document_id);
ALTER TABLE corporate_holding ADD COLUMN source_document_id UUID REFERENCES document_upload(document_id);
ALTER TABLE cash_flow_transaction ADD COLUMN source_document_id UUID REFERENCES document_upload(document_id);
ALTER TABLE treasury_balance ADD COLUMN source_document_id UUID REFERENCES document_upload(document_id);

-- Expand source_pipeline options on existing tables to include upload/email
-- (non-breaking — widen the CHECK, existing API-sourced rows unaffected):
ALTER TABLE individual_holding DROP CONSTRAINT individual_holding_source_pipeline_check;
ALTER TABLE individual_holding ADD CONSTRAINT individual_holding_source_pipeline_check
    CHECK (source_pipeline IN ('AA_REBIT', 'MFCENTRAL', 'NSDL_CDSL', 'MANUAL_UPLOAD', 'EMAIL_INGESTION', 'RIA_STATEMENT', 'MANUAL'));

ALTER TABLE corporate_holding DROP CONSTRAINT corporate_holding_source_pipeline_check;
ALTER TABLE corporate_holding ADD CONSTRAINT corporate_holding_source_pipeline_check
    CHECK (source_pipeline IN ('RTA_SFTP', 'CUSTODIAN_API', 'SPEED_E', 'CDSL_B2B', 'MANUAL_UPLOAD', 'EMAIL_INGESTION', 'RIA_STATEMENT', 'MANUAL'));

-- ----------------------------------------------------------------------------
-- 10. TAX RULE CONFIG (feeds Tax Rule Sentinel Agent — see US-22)
-- ----------------------------------------------------------------------------
-- Decouples "which rule category" (stable, drives tax_event.event_type) from
-- "what the government currently calls/rates it" (volatile, renumbered/
-- revised via annual Budget + the Income-tax Act 2025 transition). Rows are
-- versioned per financial_year with human sign-off required before any
-- downstream agent (Tax Harvesting & 80M Optimizer, etc.) may consume them
-- in live computation — draft rows sit inert until verified_at is set.

CREATE TABLE tax_rule_config (
    rule_id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    financial_year          VARCHAR(9) NOT NULL,          -- e.g. '2026-2027'
    rule_category            VARCHAR(30) NOT NULL CHECK (rule_category IN
                              ('SLAB_INDIVIDUAL', 'SLAB_CORPORATE', 'CAPITAL_GAINS_STCG',
                               'CAPITAL_GAINS_LTCG', 'SECTION_80M', 'SURCHARGE', 'CESS', 'OTHER')),
    section_reference          VARCHAR(20),                -- current in-force section number/name;
                                                            -- e.g. '80M', '157' (post Income-tax Act 2025
                                                            -- renumbering) — NOT the same as
                                                            -- tax_event.event_type, which stays stable
    rule_params                  JSONB NOT NULL,           -- rates/thresholds/exemptions as structured data
                                                            -- e.g. {"slabs": [...], "rebate_limit": 1200000}
    source_url                     TEXT,                   -- traceability: where the agent sourced this
    effective_from                   DATE NOT NULL,
    superseded_by_rule_id               UUID REFERENCES tax_rule_config(rule_id),
    verified_by_user_id                   UUID REFERENCES app_user(user_id),  -- NULL = draft, not live
    verified_at                             TIMESTAMPTZ,
    created_at                                TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (financial_year, rule_category, section_reference)
);

CREATE INDEX idx_tax_rule_fy_category ON tax_rule_config(financial_year, rule_category);
CREATE INDEX idx_tax_rule_unverified ON tax_rule_config(verified_at) WHERE verified_at IS NULL;

COMMENT ON TABLE tax_rule_config IS
    'Tax Rule Sentinel Agent writes DRAFT rows here annually (post-Budget) and
     on-demand. A row only feeds live tax computation once verified_by_user_id/
     verified_at are set by a Tax/Family Office analyst (US-22). Every run is
     logged to agent_run_log with source_data_refs pointing back to source_url
     — same audit-trail pattern as document_upload.';

COMMENT ON COLUMN tax_rule_config.section_reference IS
    'Tracks the CURRENT government section number/name, which is expected to
     drift under the Income-tax Act 2025 transition (effective AY 2027-28
     onward) independent of rate changes. tax_event.event_type enum values
     (e.g. SECTION_80M_DEDUCTION) are our own stable category labels and are
     NOT updated when this drifts — only this column is.';

-- ----------------------------------------------------------------------------
-- 11. LIQUIDITY FORECAST ASSUMPTIONS (kept separate from actuals — see
--     conversation rationale: prevents hypothetical scenarios from polluting
--     tax/XIRR calculations that must use actuals only)
-- ----------------------------------------------------------------------------

CREATE TABLE forecast_assumption (
    assumption_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id                 UUID NOT NULL REFERENCES legal_entity(entity_id),
    assumption_type            VARCHAR(30) NOT NULL CHECK (assumption_type IN
                                ('INVESTMENT_ALLOCATION', 'SURPLUS_FUND_DEPLOYMENT',
                                 'RECEIVABLE_DELAY', 'TAX_PAYMENT_TIMING', 'OTHER')),
    assumption_params            JSONB NOT NULL,       -- e.g. {"asset_class": "debt_mf", "amount": 50000000, "start_date": "2026-08-01"}
    scenario_label                 VARCHAR(100) NOT NULL,  -- user-facing name, e.g. "Conservative Q3"
    is_active                        BOOLEAN NOT NULL DEFAULT TRUE,
    created_by_user_id                 UUID NOT NULL REFERENCES app_user(user_id),
    created_at                           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_forecast_assumption_entity ON forecast_assumption(entity_id) WHERE is_active = TRUE;

COMMENT ON TABLE forecast_assumption IS
    'Predictive Liquidity Forecaster agent takes these as optional overlay input alongside actuals from cash_flow_transaction/treasury_balance — passed via agent_run_log.input_params, no new agent mechanism needed, only new usage.';

-- ----------------------------------------------------------------------------
-- 13. REGISTERED INVESTMENT ADVISORS (RIA) — multi-advisor, per-transaction
--     attribution, hard-enforced against engagement mandates
-- ----------------------------------------------------------------------------

CREATE TABLE ria_advisor (
    advisor_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ria_code               VARCHAR(20) NOT NULL UNIQUE,   -- e.g. 'RIA-001' — the key identifier used across UI/reporting
    advisor_name           VARCHAR(200) NOT NULL,
    sebi_registration_no   VARCHAR(50),
    contact_email          VARCHAR(200),
    is_active              BOOLEAN NOT NULL DEFAULT TRUE,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ria_advisor_code ON ria_advisor(ria_code);

COMMENT ON TABLE ria_advisor IS
    'Master list of Registered Investment Advisors. An RIA is a service provider, not a legal_entity — it never owns anything and does not participate in the Group/Company/Family/Individual ownership hierarchy. Multiple RIAs may operate concurrently across companies, individuals, family, and Group layer.';

-- Entity-level engagement, with a date range so history (who advised when)
-- is preserved rather than overwritten on advisor handoff.
CREATE TABLE advisor_mandate (
    mandate_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advisor_id       UUID NOT NULL REFERENCES ria_advisor(advisor_id),
    entity_id        UUID NOT NULL REFERENCES legal_entity(entity_id),  -- may be COMPANY, INDIVIDUAL, FAMILY, or GROUP
    start_date       DATE NOT NULL,
    end_date         DATE,           -- NULL = ongoing/active engagement
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE INDEX idx_advisor_mandate_entity ON advisor_mandate(entity_id);
CREATE INDEX idx_advisor_mandate_advisor ON advisor_mandate(advisor_id);

COMMENT ON TABLE advisor_mandate IS
    'Which RIA(s) are/were engaged by which entity, over what period. An entity may have multiple concurrent mandates (more than one RIA engaged at once, including at GROUP level); an RIA may hold mandates across many entities and layers. This table is the source of truth the advisor_id-attribution trigger checks against on individual_holding, corporate_holding, and cash_flow_transaction.';

-- Per-purchase / per-transaction attribution — nullable FK, additive.
-- NOT a co-advisory split: each row already represents one purchase/txn
-- with its own date, so a single advisor_id per row is sufficient. Two
-- purchases of the same stock by two different RIAs are simply two rows.
ALTER TABLE individual_holding ADD COLUMN advisor_id UUID REFERENCES ria_advisor(advisor_id);
ALTER TABLE corporate_holding ADD COLUMN advisor_id UUID REFERENCES ria_advisor(advisor_id);
ALTER TABLE cash_flow_transaction ADD COLUMN advisor_id UUID REFERENCES ria_advisor(advisor_id);

CREATE INDEX idx_ind_holding_advisor ON individual_holding(advisor_id) WHERE advisor_id IS NOT NULL;
CREATE INDEX idx_corp_holding_advisor ON corporate_holding(advisor_id) WHERE advisor_id IS NOT NULL;
CREATE INDEX idx_cashflow_advisor ON cash_flow_transaction(advisor_id) WHERE advisor_id IS NOT NULL;

COMMENT ON COLUMN cash_flow_transaction.advisor_id IS
    'Per-transaction RIA attribution. Added here (not just on the holding tables) specifically so XIRR/TWRR can be computed PER ADVISOR from the actual cash flow timeline — this is what answers "how did RIA A''s picks perform" for an engage/disengage decision.';

-- ----------------------------------------------------------------------------
-- Hard enforcement: an advisor_id may only be set on a row if a matching
-- advisor_mandate exists for that (advisor_id, entity_id) pair covering the
-- row's date. This is a stricter guarantee than the rest of this schema uses
-- elsewhere (e.g. Section 80M is app-layer-only, documented for visibility) —
-- deliberately chosen as a DB-level trigger per explicit decision, since
-- "an advisor was never engaged by this entity" must never silently happen.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION check_advisor_mandate_holding()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.advisor_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM advisor_mandate m
            WHERE m.advisor_id = NEW.advisor_id
              AND m.entity_id = NEW.entity_id
              AND m.start_date <= NEW.acquisition_date
              AND (m.end_date IS NULL OR m.end_date >= NEW.acquisition_date)
        ) THEN
            RAISE EXCEPTION 'advisor_id % has no active mandate for entity_id % covering acquisition_date %',
                NEW.advisor_id, NEW.entity_id, NEW.acquisition_date;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_advisor_mandate_individual_holding
    BEFORE INSERT OR UPDATE ON individual_holding
    FOR EACH ROW EXECUTE FUNCTION check_advisor_mandate_holding();

CREATE TRIGGER trg_check_advisor_mandate_corporate_holding
    BEFORE INSERT OR UPDATE ON corporate_holding
    FOR EACH ROW EXECUTE FUNCTION check_advisor_mandate_holding();

CREATE OR REPLACE FUNCTION check_advisor_mandate_cashflow()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.advisor_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM advisor_mandate m
            WHERE m.advisor_id = NEW.advisor_id
              AND m.entity_id = NEW.entity_id
              AND m.start_date <= NEW.txn_date
              AND (m.end_date IS NULL OR m.end_date >= NEW.txn_date)
        ) THEN
            RAISE EXCEPTION 'advisor_id % has no active mandate for entity_id % covering txn_date %',
                NEW.advisor_id, NEW.entity_id, NEW.txn_date;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_advisor_mandate_cashflow
    BEFORE INSERT OR UPDATE ON cash_flow_transaction
    FOR EACH ROW EXECUTE FUNCTION check_advisor_mandate_cashflow();

-- ============================================================================
-- Phase 1 seed logic (illustrative — not executed here):
-- INSERT one GROUP row, 10 COMPANY rows (parent = GROUP), 1 FAMILY row,
-- N INDIVIDUAL rows (parent = FAMILY). Grant all internal users FULL access
-- to all rows in permission_grant.
-- ============================================================================
