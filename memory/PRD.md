# Pinkas Hamakhires — Auction Ledger (Rebuilt)

## Original Problem Statement
> rebuild this app same feachers new layout and desishn you can also fix and add feachers

User uploaded a Yiddish/Hebrew Auction Ledger ("Sales Board") used by a synagogue gabbai to track weekly aliyah auctions on Shabbos. Asked for a rebuild with the same features but a brand-new design. User granted full creative freedom ("choose your own something good").

## Architecture
- **Stack**: React 19 + FastAPI + MongoDB
- **Aesthetic**: Old leather pinkas (synagogue ledger book) meets modern fintech — warm parchment palette, deep burgundy + oxidized gold accents, Hebrew typography (Frank Ruhl Libre + Assistant + Space Mono)
- **Layout**: Right-aligned RTL sidebar (280px), main content pushed left (mr-[280px])
- **Storage**: MongoDB via Motor. Five collections — customers, products, sales, payments, extra_charges. All ids are uuid4 strings (no ObjectId leaks).
- **API**: All routes prefixed `/api`. Generic CRUD generator `_register_crud(...)` registers list/create/get/update/delete for each entity. Plus `/api/snapshot` (all-in-one), `/api/seed` (idempotent demo data), `/api/wipe`.
- **No auth** — open access (matches original's audience: one gabbai per ledger).

## User Personas
- **Gabbai / Treasurer**: enters weekly auction results live during/after services, tracks who owes what, sends statements.
- **Rabbi / Board**: views overall congregational financial standing.

## Core Requirements (static)
1. CRUD: customers (first/last/phone/notes), products (name/default_price), sales (customer × product × week × price), payments (customer × amount × date × optional link to specific sale), extra charges (customer × description × amount × date)
2. Built-in standard aliyos catalog (17 honors: hotzaah, kohen, levi, shlishi … maftir, hagbah, glilah, mincha, bentshen, geshnadt 1-3)
3. Weekly Auction Mode with quick-price chips and increment chips, plus "likely buyers" suggestions based on history
4. Dashboard with current Parsha banner, financial metrics, weekly chart, high-debt alerts, customer balance table
5. Customer Detail with PDF/CSV statement download
6. Jewish Calendar (month grid with Hebrew dates side-by-side, parshiyos by chumash book, yomim tovim, aliyos catalog)
7. Transactions master ledger with customer + date filters
8. RTL Yiddish/Hebrew UI throughout, British pound (£) currency, tabular figures

## What's Implemented (June 23, 2026)
### Iteration 5 — Full Jewish-calendar Shabbos picker on Auction page
- [x] **New `ShabbosCalendarPicker`** at `/app/frontend/src/components/ShabbosCalendarPicker.jsx`: popover month-grid Jewish calendar with Gregorian + Hebrew dates side by side, parsha labels on each Saturday, yom tov chips, prev/next month navigation, "This Shabbos" quick-jump, accessibility `aria-label` per day, and majority-of-days Hebrew-month header.
- [x] Replaced the old flat dropdown picker on `/sales`. Only Saturday cells are clickable.
- [x] Iteration 5 test: 9/9 acceptance criteria pass.

### Iteration 3 — Excel import for Customers and Sales
- [x] **New shared `ImportModal`** at `/app/frontend/src/components/ImportModal.jsx` (SheetJS / `xlsx`): drag-drop or click-to-pick `.xlsx` / `.xls` / `.csv`, parses, validates per-row, shows preview table with OK / error icons and a summary, lets the user download a starter template, imports one row at a time with a progress counter.
- [x] **Customers import**: 'Import from Excel' button at top of `/customers`. Columns `first_name` (required), `last_name`, `phone`, `notes`. Header aliases supported (case-insensitive; Hebrew + English).
- [x] **Sales import**: 'Import' button on `/sales`. Columns `customer`, `product`, `week`, `price`. The customer column matches existing customers by full name, first name, last name, reversed, or contains-match. The product column resolves to a standard aliyah by id (`kohen`), Yiddish label (`כהן`), or English transliteration; falls back to a free-text product name. The week column accepts ISO, D/M/Y, M/D/Y (auto-detected), and Excel date serials, then snaps non-Saturday dates to the nearest Shabbos.
- [x] **CRITICAL date-bug fix**: SheetJS reformats ISO dates as US `m/d/yy` strings under `raw:false`. Switched to `cellDates:false` + `raw:true` and rewrote `toShabbosISO` with explicit ISO branch + >12-day detection. 8/8 unit cases pass; iteration 4 retest confirms end-to-end fix.
- [x] **CSV Hebrew/UTF-8 fix**: CSVs are now read via `readAsText(file, 'utf-8')` so Hebrew/Yiddish customer names persist intact.

### Iteration 2 — Professional redesign + working PDF + English UI
- [x] New "professional" design system: clean white-canvas + slate-navy + emerald + amber + danger palette, Plus Jakarta Sans + Heebo + JetBrains Mono typography.
- [x] LTR layout with the sidebar moved to the LEFT (260px).
- [x] All UI labels switched to English. Hebrew preserved in customer names, parsha names, aliyah names, Hebrew calendar dates.
- [x] Real PDF statement generation (`html2canvas` + `jsPDF`) on both Customer Detail and Transactions pages. Hebrew renders perfectly (DOM captured with Heebo font).

### Iteration 1 — Initial rebuild (still in place)
- [x] Backend FastAPI + MongoDB CRUD for all five entities
- [x] `/api/snapshot` aggregate endpoint
- [x] Idempotent `/api/seed` with 10 sample customers, 4 products, 30 sales, 5 payments, 1 extra
- [x] Dashboard, Sales (Auction + List), Customers, Customer Detail, Products, Jewish Calendar, Transactions

## Backlog (prioritized)
- **P1** — Reinstate Excel import modals for bulk customer / payment / extra-charge import (CSV download already supported)
- **P1** — PDF statement generation (currently CSV)
- **P2** — Styled date picker matching the parchment theme on Transactions filter (currently native HTML5)
- **P2** — SMS Manager (Twilio integration to send balance reminders to customers — was in original)
- **P2** — Dark theme variant
- **P3** — Multi-shul (multi-tenant) support with simple Emergent Google login
- **P3** — Mobile-first responsive variant (sidebar collapses)
- **P3** — Excel/Xlsx file export (currently CSV-only)

## Deferred / Skipped from Original
- Authentication (Base44 RLS) — open access for now
- Twilio SMS + AI command parser — too costly/complex to set up without explicit demand
- Stripe — was unused

## Next Tasks
- Await user feedback. Likely first iteration request: change theme, add an existing feature back (SMS, Excel import), or extend to multi-shul.
