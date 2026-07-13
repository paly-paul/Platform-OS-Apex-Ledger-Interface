# Apex Portfolio OS — Frontend Migration Status

> Fill this in at each checkpoint (end of stage 1–3, and again after each
> page migrated in stage 4). Purpose: let a new Claude Code session or a
> teammate pick up the migration without re-deriving context. Keep it short —
> this is a status snapshot, not a design doc (see BRD/Agents doc for "why").

**Last updated:** 2026-07-13
**Updated by / session:** Claude Code — branch `claude/apex-nextjs-frontend-setup-vtb2mk`

---

## 1. Where things stand

| Stage | Status | Notes |
|---|---|---|
| 1. Scaffold Next.js project + boot confirmed | ✅ Done | Next.js 15.3.3 (v16.2.6 doesn't exist on npm — accepted deviation). `npm run build` passes, zero type errors. |
| 2. Login screen (hardcoded creds, Redux auth slice) | ✅ Done | Dev credentials in `src/lib/auth-config.ts`. sessionStorage persist/rehydrate. Client-side auth guard on dashboard. Log-out in Topbar. |
| 3. Shell migration into components (topbar, sidebar, chat popup) | ✅ Done | Topbar, Sidebar, ChatPopup components live under `src/app/dashboard/_components/`. SummaryPage + DebriefPage fully ported. 11 remaining pages are structural stubs. |
| 4. Page-by-page feature migration | ☐ Not started | Awaiting confirmation — see open questions below |

## 2. Page migration tracker (Stage 4)

| Page | Migrated? | Location (`src/features/...`) | Known gaps / TODOs |
|---|---|---|---|
| AI Insights Summary | ✅ Full port | `summary/SummaryPage.tsx` | Live countdown + exception accordion use React state. Ask Apex chips open ChatPopup but don't pre-fill input yet (imperative handle deferred). |
| De-Briefing | ✅ Full port | `debrief/DebriefPage.tsx` | Agenda checklist + finalize logic in React state. View Trail buttons dispatch `setActivePage('audit')`. |
| Uploads | ☐ Stub only | `uploads/UploadsPage.tsx` | US-01–05, US-23. Note: advisor_name field + RIA toggle logic in original HTML — see open question below. |
| Account Master | ☐ Stub only | `account-master/AccountMasterPage.tsx` | US-25. RIA roster section, entity filter chips, CSV/PDF export logic all in original HTML. Large JS section to port. |
| Performance (XIRR) | ☐ Stub only | `performance/PerformancePage.tsx` | US-06, US-07, US-24. perfSeed() / setPerfLens() / setPerfLayer() / renderPerformance() — seeded mock data pattern to preserve. |
| Historical ROI | ☐ Stub only | `historical-roi/HistoricalRoiPage.tsx` | US-08, US-24. setHroiLens() / setHroiLayer() / renderHistoricalRoi() — inline SVG chart to port. |
| Fund Flow (cashflow) | ☐ Stub only | `cashflow/CashflowPage.tsx` | US-10, US-11. cfFormatAmount(), cfTagClass(), populateCfFilters(), renderCashFlow(), renderTreasury() to port. |
| Liquidity Forecast | ☐ Stub only | `forecast/ForecastPage.tsx` | US-12, US-13, US-14. createForecastScenario() and scenario comparison logic to port. |
| Tax Assessment | ☐ Stub only | `tax/TaxPage.tsx` | US-15–17, US-22. Tax-gold visual treatment already in Tailwind tokens. Tax Rule Sentinel review queue to port. |
| Benchmarking | ☐ Stub only | `benchmarking/BenchmarkingPage.tsx` | US-18. |
| Corporate Actions | ☐ Stub only | `corp-actions/CorpActionsPage.tsx` | US-19. |
| Concentration Risk | ☐ Stub only | `concentration/ConcentrationPage.tsx` | US-20. |
| Audit Trail | ☐ Stub only | `audit/AuditPage.tsx` | US-05, US-21. Expandable rows — good styled-components candidate. |

## 3. Decisions made mid-flight (not yet in the prompt/BRD)

- **Next.js version:** 16.2.6 (specified in prompt) does not exist on npm. Used Next.js 15.3.3 (latest stable). Accepted.
- **Navigation pattern changed (confirm before stage 4):** `navigateTo()` / `builtPages` DOM toggling replaced with Redux `setActivePage` + conditional render in `dashboard/page.tsx`. Pages now mount/unmount on nav switch rather than hiding with `display:none`. This is a deliberate behavior change — page-local state resets on navigation. Confirm this is accepted before stage-4 content porting begins.
- **Styled-components scope:** Used for `ChatPopup` only (animated open/close, layered positioning). All other components use Tailwind. This matches the "reach for styled-components only when needed" rule in the prompt.
- **Redux slice split:** `auth` slice (global, `src/features/auth/authSlice.ts`) + `ui` slice (global, `src/features/ui/uiSlice.ts`) covering sidebar/chat/activePage/activeLayer. Per-feature slices to be added in stage 4 as pages are ported and local state patterns become clear.
- **CSS custom properties preserved:** All `--paper`, `--ink`, `--verified`, `--tax-gold`, etc. kept as `:root` vars in `globals.css` in addition to being Tailwind tokens — ensures styled-components and any non-Tailwind usage continues to resolve them correctly.

## 4. Known deviations from the original prompt

- **Next.js 15.3.3 instead of 16.2.6** — v16 doesn't exist. Nearest stable used.
- **`src/app/page.tsx` is a redirect**, not content — root `/` immediately redirects to `/dashboard` which then guards to `/login` if unauthenticated. The prompt didn't specify root-page behavior; this is the conventional Next.js App Router approach.
- **SummaryPage + DebriefPage migrated in stage 3** rather than deferred to stage 4 — they were needed to have something meaningful to render in the shell, and they're the two most structurally representative pages. This means stage 4 has 11 remaining pages instead of 13.

## 5. Open questions / blocked on

- **Navigation behavior change (blocker for stage 4):** Confirm that `setActivePage` + conditional render (mount/unmount) replacing `navigateTo()` DOM toggle is accepted. If page state must survive navigation (e.g. partially filled upload form), the pattern needs to change to render-all-hide-inactive or URL-based routing before stage 4 starts.
- **Uploads page — advisor_name field (US-23):** The original HTML has `toggleRiaField()` showing/hiding the RIA advisor name input based on document_type selection. The BRD notes `advisor_name` is stored on `document_upload` (not a new legal entity). No ambiguity in the spec, but the form has the most complex submission logic of any page (`submitUpload()` + `reUpload()`) — worth flagging before porting.
- **Account Master — renderAccountMaster() / renderRiaRoster():** Large DOM-rendering functions that build table rows imperatively. These are the biggest JS-to-React translation work in stage 4.
- **Per-feature Redux slices:** Performance page has seeded deterministic mock data (`perfSeed()`), forecast page has scenario creation form state — decide slice ownership (feature-local vs. global ui slice) before porting these pages.

## 6. Next session should start with

1. **Confirm the navigation behavior decision** (mount/unmount vs. hide-inactive) — this gates all of stage 4.
2. **Then pick up stage 4 in this order** (simplest → most complex):
   - Benchmarking, Corporate Actions, Concentration Risk (light pages, mostly static display)
   - Audit Trail (expandable rows — good styled-components candidate)
   - Fund Flow + Liquidity Forecast (filter state, amount formatting)
   - Tax Assessment (tax-gold visuals already tokenised, Sentinel review queue)
   - Historical ROI + Performance (seeded mock data, inline SVG/chart)
   - Uploads (form with RIA toggle + re-upload logic — most complex form)
   - Account Master (largest: entity hierarchy + RIA roster + filter chips + CSV/PDF export)
