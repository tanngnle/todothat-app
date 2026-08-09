# Finance Improvements — QA Test Case Matrix

Branch/worktree: `finance-entry-improvements`
Scope: `/expenses` (transactions, wallets, categories, people, bulk entry, image import, CSV export) and `/expenses/investments`.

## Environment markers (legend)

- **[MIG-005]** — requires `supabase/migrations/005_finance_fix.sql` applied (balance trigger, `chk_transfer_destination`, `source`/`attachment_url` columns, `reconcile_wallet_balances()`, `receipts` bucket + storage policies).
- **[MODELSTUDIO]** — requires `MODELSTUDIO_API_KEY` (Alibaba Cloud Model Studio) set in the runtime environment.
- **[NO-MODELSTUDIO]** — requires `MODELSTUDIO_API_KEY` absent/unset.
- **[UTC+7-EDGE]** — must be executed between 17:00–23:59 UTC (i.e. 00:00–06:59 local UTC+7) where `new Date().toISOString()` returns the previous day but the local date is already "today".

Automation levels: `manual-browser` (E2E via browser on dev server), `manual-db` (SQL / Supabase console / storage console), `code-review` (static verification of implementation contracts).

Grounding references: `src/actions/transactions.ts`, `wallets.ts`, `categories.ts`, `people.ts`, `investments.ts`; `src/lib/finance/schemas.ts`, `money.ts`, `dates.ts`, `draft.ts`; `src/lib/utils/export.ts`; `supabase/migrations/005_finance_fix.sql`; `src/components/expenses/*`. Cases for `bulk-entry-panel` and `image-import-dialog` are written against the plan contract; re-verify selectors once those components land.

## Case counts

| Area | Prefix | Count |
|---|---|---|
| 1. Balance accounting | BAL | 17 |
| 2. Single-entry UX | TXN | 27 |
| 3. Management dialog | MGT | 15 |
| 4. Bulk entry & CSV paste | BULK | 24 |
| 5. Image extraction | IMG | 12 |
| 6. Investments | INV | 10 |
| 7. Data / export correctness | EXP | 9 |
| 8. Security / RLS | SEC | 8 |
| 9. Regressions & build | REG | 8 |
| **Total** | | **130** |

---

## 1. Balance accounting (trigger-maintained balances)

| ID | Area | Title | Preconditions | Steps | Expected Result | Priority | Automation |
|---|---|---|---|---|---|---|---|
| BAL-01 | Balance | Expense create decreases wallet balance | [MIG-005] Wallet A balance 1,000,000 | Create expense 300,000 on wallet A via dialog; reload | Wallet A balance = 700,000; single `transactions` row inserted; no manual balance update in TS | P0 | manual-browser + manual-db |
| BAL-02 | Balance | Income create increases wallet balance | [MIG-005] Wallet A balance 500,000 | Create income 200,000 on wallet A; reload | Wallet A balance = 700,000 | P0 | manual-browser + manual-db |
| BAL-03 | Balance | Transfer moves money source→dest | [MIG-005] Wallet A=1,000,000, Wallet B=100,000 | Create transfer 250,000 A→B; reload | A=750,000, B=350,000 | P0 | manual-browser + manual-db |
| BAL-04 | Balance | Edit amount up corrects delta | [MIG-005] Expense 300,000 exists on A (A already −300,000) | Edit amount to 500,000; reload | Wallet A balance decreases by additional 200,000 (trigger reverses OLD + applies NEW) | P0 | manual-browser + manual-db |
| BAL-05 | Balance | Edit amount down corrects delta | [MIG-005] Expense 500,000 on A | Edit amount to 200,000 | Wallet A balance increases by 300,000 | P0 | manual-browser + manual-db |
| BAL-06 | Balance | Edit type expense→income flips both | [MIG-005] Expense 100,000 on A | Edit type to income | Wallet A balance increases by 200,000 total (reverse −100,000, apply +100,000) | P0 | manual-db |
| BAL-07 | Balance | Edit wallet_id moves the delta | [MIG-005] Expense 100,000 on A; wallet B exists | Edit wallet from A to B | A restored +100,000; B reduced −100,000 | P0 | manual-db |
| BAL-08 | Balance | Convert expense→transfer | [MIG-005] Expense 100,000 on A; B exists | Edit type to transfer A→B, same amount | Trigger reverses expense (A +100,000) then applies transfer (A −100,000, B +100,000): A balance unchanged vs pre-edit state, B +100,000 | P0 | manual-db |
| BAL-09 | Balance | Convert transfer→expense | [MIG-005] Transfer 100,000 A→B exists | Edit type to expense on A | B loses 100,000 (transfer-in reversed); A unchanged net (reverse transfer +100,000, expense −100,000) | P0 | manual-db |
| BAL-10 | Balance | Delete expense restores balance | [MIG-005] Expense 300,000 on A | Delete the transaction via row menu | Wallet A balance +300,000 back to pre-insert value | P0 | manual-browser + manual-db |
| BAL-11 | Balance | Delete income restores balance | [MIG-005] Income 200,000 on A | Delete it | Wallet A balance −200,000 | P0 | manual-db |
| BAL-12 | Balance | Delete transfer restores both legs | [MIG-005] Transfer 250,000 A→B | Delete it | A +250,000, B −250,000 | P0 | manual-db |
| BAL-13 | Balance | Transfer to same wallet blocked at DB | [MIG-005] Wallet A exists | Attempt direct insert `type='transfer', wallet_id=A, to_wallet_id=A` via SQL as the user | Insert fails with `chk_transfer_destination` CHECK violation; balance untouched | P0 | manual-db |
| BAL-14 | Balance | Batch insert applies every row's delta | [MIG-005] Wallet A=1,000,000 | Submit batch of 3 rows (income 100k, expense 50k, transfer 200k A→B) | A = 1,000,000 +100,000 −50,000 −200,000 = 850,000; B +200,000; single multi-row insert | P0 | manual-db |
| BAL-15 | Balance | reconcile_wallet_balances() repairs drift | [MIG-005] Manually corrupt a wallet balance via SQL (e.g. `UPDATE wallets SET balance = balance + 999`) | Run `SELECT reconcile_wallet_balances();` | Wallet balance recomputed to SUM(income) − SUM(expense) − transfer-out + transfer-in; matches trigger-consistent value | P1 | manual-db |
| BAL-16 | Balance | Reconcile resets no-transaction wallets to 0 | [MIG-005] Wallet created with opening balance 500,000 and zero transactions | Run `reconcile_wallet_balances()` | Balance becomes 0 (documented semantics: deltas always start from zero) | P2 | manual-db |
| BAL-17 | Balance | Trigger functions are SECURITY INVOKER | [MIG-005] Migration 005 applied | Code-review `apply_delta`, `apply_transaction_delta`, `reconcile_wallet_balances` definitions; verify `SET search_path = public` | All three declared `SECURITY INVOKER` with pinned search_path, so wallets RLS applies to trigger-driven updates | P1 | code-review |

## 2. Single-entry UX (transaction-dialog, select-with-create, row actions)

| ID | Area | Title | Preconditions | Steps | Expected Result | Priority | Automation |
|---|---|---|---|---|---|---|---|
| TXN-01 | Single-entry | Dialog opens from "Add transaction" | Logged in, on /expenses | Click "Add transaction" | Dialog opens titled "Add transaction"; submit button labeled "Add transaction" | P0 | manual-browser |
| TXN-02 | Single-entry | Create-mode defaults | Dialog freshly opened | Inspect fields | Type=Expense, amount empty, wallet unselected, date = today (local), note empty | P0 | manual-browser |
| TXN-03 | Single-entry | Close without saving | Dialog open with entered data | Click Cancel; reopen | Dialog closes; nothing persisted; reopening in create mode shows clean defaults | P1 | manual-browser |
| TXN-04 | Single-entry | Create expense with all fields | Wallet + expense category + person exist | Fill type=expense, amount 50000, wallet, category, person, date, note "Cơm trưa"; submit | Success toast "Transaction added"; dialog closes; row appears grouped under its date showing category, wallet, "−50.000 ₫"-style formatted amount | P0 | manual-browser |
| TXN-05 | Single-entry | Create income | Income category exists | Create income 1,000,000 | Row renders with green + amount; wallet balance increases | P0 | manual-browser |
| TXN-06 | Single-entry | To-wallet field appears only for transfer | Dialog open | Switch Type to Transfer | "To wallet" select appears; Category and Person fields disappear | P0 | manual-browser |
| TXN-07 | Single-entry | Type switch clears stale selections | Dialog with category + person selected as expense | Switch to transfer, then back to expense | category_id reset (must reselect); to_wallet cleared when leaving transfer; no stale category from wrong type submitted | P1 | manual-browser |
| TXN-08 | Single-entry | Category options type-scoped | Expense cats {Food}, income cats {Salary} exist | Open dialog as expense → inspect Category; switch to income | Expense mode shows only expense categories; income mode shows only income categories | P0 | manual-browser |
| TXN-09 | Single-entry | Person select optional | People exist | Create expense with and without person | Saves in both cases; person displayed/stored when set, null otherwise | P1 | manual-browser |
| TXN-10 | Single-entry | Date default = local today at UTC+7 midnight edge | [UTC+7-EDGE] Browser TZ UTC+7, local time 00:30 | Open dialog; check date field; save | Date field shows current local date (not previous day from `toISOString()`); stored `date` equals local `yyyy-MM-dd` (`todayLocalISO()` uses date-fns `format`) | P0 | manual-browser |
| TXN-11 | Single-entry | Amount 0 rejected | Dialog open | Enter 0, submit | Error toast "Amount must be greater than zero"; no row created | P0 | manual-browser |
| TXN-12 | Single-entry | Negative amount rejected | Dialog open | Enter −50000, submit | Error toast "Amount must be a positive whole number (VND)"; nothing saved | P0 | manual-browser |
| TXN-13 | Single-entry | Decimal amount rejected | Dialog open | Enter 100.5, submit | `toIntegerVnd` throws (non-integer) → error toast; server schema `int().positive()` also rejects; nothing saved | P0 | manual-browser |
| TXN-14 | Single-entry | Non-numeric amount rejected | Dialog open | Enter "abc" (or paste text) | Error toast; nothing saved | P0 | manual-browser |
| TXN-15 | Single-entry | Empty amount rejected | Dialog open, wallet selected | Leave amount blank, submit | Error toast "Amount must be a positive whole number (VND)" | P0 | manual-browser |
| TXN-16 | Single-entry | Huge amount handling | Dialog open | Enter 90071992547409999 (> MAX_SAFE_INTEGER) | `toIntegerVnd` clamps to `Number.MAX_SAFE_INTEGER`; schema max allows it → saved as clamped value (document behavior; verify no crash and consistent display) | P2 | manual-browser |
| TXN-17 | Single-entry | Missing wallet rejected | Dialog open | Enter valid amount, no wallet, submit | Error toast "Choose a wallet" | P0 | manual-browser |
| TXN-18 | Single-entry | Transfer without destination rejected | Type=transfer, wallet chosen | Submit without To wallet | Error toast "Choose a destination wallet" | P0 | manual-browser |
| TXN-19 | Single-entry | Same source/destination blocked in UI | Type=transfer, wallet A chosen | Open To wallet dropdown; also attempt selecting A | Dropdown excludes the currently selected source wallet; server-side zod `superRefine` message "to_wallet_id must differ from wallet_id" guards bypass | P0 | manual-browser |
| TXN-20 | Single-entry | Inline add-new wallet + immediate selection | Dialog open | Click "+ Add new" on Wallet, type "VCB", Enter | `createWallet` called with `extraFields type=cash`; success toast 'Wallet "VCB" created'; option appended and auto-selected; no page reload | P0 | manual-browser |
| TXN-21 | Single-entry | Inline add-new category inherits type | Dialog Type=expense | Add new category "Coffee" inline | `createCategory` receives `type=expense` in FormData; created category appears in the expense-scoped list and is selected | P0 | manual-browser |
| TXN-22 | Single-entry | Inline add-new person + selection | Dialog open | Add person "Mẹ" inline | Person created, appended, selected; toast confirms | P1 | manual-browser |
| TXN-23 | Single-entry | Inline-created option persists across dialogs | Just created wallet inline | Close dialog, reopen, also open Manage dialog | New wallet present in all selects (lifted `walletOptions` state in `expenses-content`), before any refresh | P1 | manual-browser |
| TXN-24 | Single-entry | Edit prefill | Transaction with all fields exists | Open row menu → Edit | Dialog titled "Edit transaction"; type, amount, wallet, to_wallet, category, person, date, note all prefilled | P0 | manual-browser |
| TXN-25 | Single-entry | Edit save feedback | Edit dialog open | Change amount, submit | Toast "Transaction updated"; dialog closes; list and balances refreshed via `router.refresh()` | P0 | manual-browser |
| TXN-26 | Single-entry | Delete confirmation flow | Transaction exists | Row menu → Delete → "Confirm delete"; separately test Cancel | Confirm: toast "Transaction deleted", row removed, balances reverted. Cancel: menu returns to normal state, row untouched. Confirmation copy mentions balances reverted | P0 | manual-browser |
| TXN-27 | Single-entry | Note validation & trimming | Dialog open | Enter note with surrounding spaces; separately a 501-char note | Trimmed note stored (empty-after-trim → null); >500 chars rejected by schema ("note" max 500) with error surfaced | P1 | manual-browser |

## 3. Management dialog (wallets / categories / people)

| ID | Area | Title | Preconditions | Steps | Expected Result | Priority | Automation |
|---|---|---|---|---|---|---|---|
| MGT-01 | Manage | Dialog opens with 3 tabs | On /expenses | Click "Manage" | Dialog "Manage wallets, categories & people" with tabs Wallets / Categories / People; default tab Wallets | P0 | manual-browser |
| MGT-02 | Manage | Create wallet with type | Manage dialog open | Enter name "Momo", type E-wallet, Add | Row appears instantly; toast 'Wallet "Momo" created'; DB row has `type='ewallet'`, `balance=0`, `sort_order=65536`; available in transaction dialog without reload | P0 | manual-browser + manual-db |
| MGT-03 | Manage | Rename wallet inline (Enter/Escape) | Wallet exists | Pencil → edit name → Enter; repeat with Escape | Enter: saved, toast "Wallet renamed". Escape: draft restored, no save. Empty/unchanged name: silently exits without a server call | P1 | manual-browser |
| MGT-04 | Manage | Deactivate wallet | Wallet exists | Click Archive icon | `is_active=false`; row removed from active list; toast "Wallet deactivated"; `getWallets` (filters `is_active=true`) no longer returns it in selects | P0 | manual-browser + manual-db |
| MGT-05 | Manage | Delete wallet with no transactions | Unused wallet | Click Trash → completes | Wallet hard-deleted; toast "Wallet deleted" | P0 | manual-browser |
| MGT-06 | Manage | Delete wallet referenced as source is archived | Wallet has ≥1 transaction as `wallet_id` | Click Trash | Wallet is SOFT-deleted (`is_active=false`), NOT blocked: toast "Wallet archived — transaction history kept"; wallet disappears from active lists/selects; its transactions remain intact and render with the wallet name; action checks references with `or(wallet_id.eq.X,to_wallet_id.eq.X)` and `deleteWallet` returns `"archived"` | P0 | manual-browser + code-review |
| MGT-07 | Manage | Delete wallet referenced only as destination is archived | Wallet referenced only as `to_wallet_id` | Click Trash | Same archive semantics — soft-delete with history preserved, toast "Wallet archived — transaction history kept"; reference query covers both FK columns; `deleteWallet` returns `"archived"` (unreferenced wallets return `"deleted"` and are hard-deleted, per MGT-05) | P1 | manual-db + manual-browser |
| MGT-08 | Manage | Create category with type | Manage dialog, Categories tab | Add "Salary", type Income | Created with `type='income'`, `sort_order=65536`; shows meta label Income; available to income transactions | P0 | manual-browser |
| MGT-09 | Manage | Rename category | Category exists | Inline rename | Saved; historical transactions show the new name (FK unchanged) | P1 | manual-browser |
| MGT-10 | Manage | Deactivate category | Category exists | Archive icon | `is_active=false`; hidden from category selects (`getCategories` filters active); history intact | P0 | manual-browser |
| MGT-11 | Manage | Delete category nulls history references | Category used by past transactions | Delete category | Category hard-deleted; historical transactions' `category_id` becomes NULL (FK ON DELETE SET NULL); UI renders "—" for those rows; balances unaffected | P0 | manual-browser + manual-db |
| MGT-12 | Manage | Create person | People tab | Add "Bố", Add | Person created (relationship null), sorted by name in future loads, immediately selectable | P1 | manual-browser |
| MGT-13 | Manage | Delete person nulls history | Person used by transactions | Delete person | Person deleted; transactions' `person_id` NULL via FK; rows still render | P1 | manual-browser + manual-db |
| MGT-14 | Manage | Empty/blank create blocked | Any tab | Type spaces only | Add button disabled; no server call; whitespace-only rename also exits without saving | P1 | manual-browser |
| MGT-15 | Manage | Active-only reads after deactivation | Wallet/category deactivated in MGT-04/MGT-10 | Reload /expenses, open transaction dialog | Deactivated options absent from Wallet/Category selects but DB rows preserved | P0 | manual-browser |

## 4. Bulk entry & CSV paste

Component: `bulk-entry-panel` (plan contract — verify selectors when implemented). Server contract: `createTransactionsBatch(json)`, `transactionBatchSchema` = array(transactionSchema).min(1).max(200).

| ID | Area | Title | Preconditions | Steps | Expected Result | Priority | Automation |
|---|---|---|---|---|---|---|---|
| BULK-01 | Bulk | Add row | Bulk panel open | Click Add row | New draft row appended (`newDraft` defaults: type=expense, empty amount, date=today local, source=bulk context) | P0 | manual-browser |
| BULK-02 | Bulk | Remove row | ≥2 rows present | Remove one row | Row removed; other drafts untouched; unique keys stable (no re-render data loss) | P1 | manual-browser |
| BULK-03 | Bulk | 200-row cap enforced in UI | Bulk panel | Add rows until 200; try adding one more | Add disabled/blocked at 200 with explanatory message (UI enforces `transactionBatchSchema.max(200)`) | P0 | manual-browser |
| BULK-04 | Bulk | 201-row payload rejected by server | Server action reachable | Call `createTransactionsBatch` with 201 valid rows | Returns `{ error }` referencing array max; zero rows inserted | P0 | code-review + manual-db |
| BULK-05 | Bulk | Per-row validation badges | Rows mixing valid/invalid data | Observe grid | Invalid rows flagged with badge/message; valid rows unmarked; submit disabled or error listing offending rows | P0 | manual-browser |
| BULK-06 | Bulk | Enter advances to next row | Row 1 amount cell focused | Type amount, press Enter | Focus moves to next row/field; Enter on last row appends a new row (per plan contract) | P1 | manual-browser |
| BULK-07 | Bulk | Submit saves N rows with source='bulk' | 5 valid rows | Submit | Result `{ saved: 5 }`; 5 DB rows with `source='bulk'`, correct user_id; success toast with count | P0 | manual-browser + manual-db |
| BULK-08 | Bulk | Batch updates balances atomically | [MIG-005] Known wallet balances | Submit valid 3-row batch | Each wallet delta equals sum of per-row effects (trigger fires per row within one insert) | P0 | manual-db |
| BULK-09 | Bulk | Empty batch rejected | No rows | Submit | Error via `transactionBatchSchema.min(1)`; nothing inserted | P1 | manual-browser |
| BULK-10 | Bulk | Partial failure reporting (all-or-nothing + path) | Batch containing one invalid row at index 3 (e.g. transfer missing to_wallet) | Submit | Single error identifying the offending row, e.g. `3.to_wallet_id: to_wallet_id is required for transfers`; insert is atomic — zero rows saved; toast shows error | P0 | manual-browser + manual-db |
| BULK-11 | Bulk | Invalid JSON payload guarded | Server action reachable | Call `createTransactionsBatch("not-json")` | Returns `{ error: "Invalid JSON payload" }` — no throw | P1 | code-review |
| BULK-12 | Bulk | CSV paste — comma delimited | Bulk panel with paste support | Paste `date,type,amount,wallet,category,note` rows comma-separated | Parsed into draft rows correctly | P0 | manual-browser |
| BULK-13 | Bulk | CSV paste — tab delimited | Same | Paste tab-separated content | Parsed identically to comma variant | P1 | manual-browser |
| BULK-14 | Bulk | CSV paste — quoted fields with commas/quotes | Same | Paste row containing `"Cơm, trà đá"` and embedded `""` quotes | Field values unquoted correctly; no column shift | P1 | manual-browser |
| BULK-15 | Bulk | CSV paste — header mapping | Same | Paste with header row | Header detected and mapped to columns; header not treated as data row | P0 | manual-browser |
| BULK-16 | Bulk | Tolerant dates dd/mm/yyyy | Same | Paste date `31/12/2025` | Parsed to `2025-12-31` ISO draft date | P0 | manual-browser |
| BULK-17 | Bulk | Tolerant dates yyyy-mm-dd | Same | Paste date `2025-12-31` | Accepted as-is | P0 | manual-browser |
| BULK-18 | Bulk | Invalid date flagged | Same | Paste `99/99/2025` and `abc` | Row flagged invalid; schema rejects non `yyyy-MM-dd` before insert | P1 | manual-browser |
| BULK-19 | Bulk | Wallet name→UUID mapping | Wallets "Cash", "VCB" exist | Paste rows referencing wallet names | Drafts resolve names to wallet UUIDs (case/whitespace tolerant per plan); unknown names flagged | P0 | manual-browser |
| BULK-20 | Bulk | Category name→UUID mapping | Categories exist | Paste rows referencing category names | Resolved to UUIDs; type-scope respected where possible | P0 | manual-browser |
| BULK-21 | Bulk | Unresolved wallet name flagged | No wallet "GhostBank" | Paste row with that wallet name | Row flagged as invalid (wallet unresolvable — wallet_id required UUID); cannot submit until fixed | P0 | manual-browser |
| BULK-22 | Bulk | Unresolved category name handling | No category "ZZZ" | Paste row with that category | Per plan: flagged for user decision (clear to none or create); server never receives a name string in `category_id` | P1 | manual-browser + code-review |
| BULK-23 | Bulk | Empty rows skipped | Bulk paste | Paste content with blank lines between rows | Blank rows ignored; only real rows become drafts | P1 | manual-browser |
| BULK-24 | Bulk | >200-row CSV rejected | Bulk paste | Paste 201+ rows | Rejected up front with cap message (mirrors `transactionBatchSchema.max(200)`); nothing staged/saved | P0 | manual-browser |

## 5. Image extraction (receipt import)

Component: `image-import-dialog` (plan contract — verify selectors when implemented). Env: `MODELSTUDIO_API_KEY`; storage bucket `receipts` (private, 10 MB, jpeg/png/webp), path `{user_id}/{filename}`.

| ID | Area | Title | Preconditions | Steps | Expected Result | Priority | Automation |
|---|---|---|---|---|---|---|---|
| IMG-01 | Image | Guard card without API key | [NO-MODELSTUDIO] | Open /expenses; open image import entry point | Guard/explainer card shown; no crash, no console errors; extraction UI disabled or hidden; rest of page fully functional | P0 | manual-browser |
| IMG-02 | Image | JPEG ≤10MB accepted | [MODELSTUDIO][MIG-005] 2MB .jpg receipt | Upload | Upload succeeds to `receipts/{user_id}/…`; extraction runs | P0 | manual-browser |
| IMG-03 | Image | PNG and WebP accepted | [MODELSTUDIO][MIG-005] | Upload .png then .webp | Both accepted and extracted | P1 | manual-browser |
| IMG-04 | Image | >10MB rejected | [MODELSTUDIO] 12MB jpeg | Upload | Rejected client-side and/or by bucket limit (10485760); clear error; no partial row | P0 | manual-browser |
| IMG-05 | Image | Wrong MIME type rejected | [MODELSTUDIO] .gif or .pdf | Upload | Rejected (bucket allows only image/jpeg, image/png, image/webp); clear error message | P0 | manual-browser |
| IMG-06 | Image | Downscale before extraction | [MODELSTUDIO] Very large-resolution jpeg (>2000px) | Upload | Image downscaled prior to model call (per plan); extraction still succeeds; no payload-size failure | P2 | manual-browser + code-review |
| IMG-07 | Image | Extraction returns editable drafts | [MODELSTUDIO] Receipt image | Upload & extract | Extracted rows shown in editable form (type, amount, wallet, category/name, date, note) conforming to `extractedTransactionSchema`; user can modify before save | P0 | manual-browser |
| IMG-08 | Image | 1 image → 1 row default | [MODELSTUDIO] Single-item receipt | Upload & extract | Exactly one draft row by default; amount positive integer VND | P0 | manual-browser |
| IMG-09 | Image | Save stamps source='image' + attachment_url | [MODELSTUDIO][MIG-005] Extracted draft saved | Save, inspect DB | Row has `source='image'` and `attachment_url` pointing at the uploaded receipt; balance delta applied | P0 | manual-browser + manual-db |
| IMG-10 | Image | Storage path per-user isolation | [MODELSTUDIO][MIG-005] Two users A, B | A uploads receipt; check object path | Object stored at `receipts/{A_user_id}/{filename}` | P0 | manual-db |
| IMG-11 | Image | Cross-user read denied | [MIG-005] User A receipt exists | As user B, request the object (storage console/API) | 403/denied — `receipts_select_own` requires first path segment = own uid | P0 | manual-db |
| IMG-12 | Image | Cross-user write denied | [MIG-005] As user B | Attempt upload to `receipts/{A_user_id}/evil.jpg` | Denied by `receipts_insert_own` (WITH CHECK on foldername[1] = auth.uid()) | P0 | manual-db |

## 6. Investments

| ID | Area | Title | Preconditions | Steps | Expected Result | Priority | Automation |
|---|---|---|---|---|---|---|---|
| INV-01 | Investments | Create account | On /expenses/investments | Create account platform=DNSE, name="CP VN", type optional blank, balance, invested | Account created; empty `type` normalized to null; revalidated on `/expenses/investments` | P0 | manual-browser |
| INV-02 | Investments | Edit account | Account exists | Edit platform/name/balance/invested | Partial update succeeds; other fields untouched (`.partial()` schema) | P0 | manual-browser |
| INV-03 | Investments | Delete account is soft delete | Account with transactions | Delete account | `is_active=false` only — transactions preserved (no cascade); account hidden from active list | P0 | manual-browser + manual-db + code-review |
| INV-04 | Investments | Add transaction all 4 types | Account exists | Add buy / profit / loss / sell transactions | All four types persist with correct amount, date, note; list ordered by date desc with account name/platform join | P0 | manual-browser |
| INV-05 | Investments | Ownership check on add | Another user's `account_id` known | Call `createInvestmentTransaction` with foreign account_id | Throws "Investment account not found" (ownership-scoped `maybeSingle`); nothing inserted | P0 | manual-db + code-review |
| INV-06 | Investments | Transaction date defaults to local today | Dialog open | Leave date blank, submit | Stored date = `todayLocalISO()` | P1 | manual-browser |
| INV-07 | Investments | Delete transaction | Investment transaction exists | Delete via row actions | Row deleted; ownership enforced via RLS through parent account (no `user_id` column on table) | P0 | manual-browser + code-review |
| INV-08 | Investments | Summary math | Account with invested 1,000,000, balance 1,200,000 | View investments page | Derived totals (gain/loss, profit %) computed correctly from balance vs invested; integer VND formatting | P1 | manual-browser |
| INV-09 | Investments | Invalid input rejected | Dialog open | Negative/non-integer amount; bad date; unknown type | Schema (`coerce.number().int()`, ISO date regex, enum buy/profit/loss/sell) rejects with surfaced error; nothing saved | P1 | manual-browser |
| INV-10 | Investments | Cross-user isolation of reads | Two users with data | User B loads /expenses/investments | `getInvestmentAccounts`/`getInvestmentTransactions` return only B's rows (`.eq user_id` + RLS) | P0 | manual-browser + manual-db |

## 7. Data / export correctness

| ID | Area | Title | Preconditions | Steps | Expected Result | Priority | Automation |
|---|---|---|---|---|---|---|---|
| EXP-01 | Export | CSV amounts are integer VND (no /100) | Transactions incl. 1,500,000 | Export expenses CSV | `amount` column shows `1500000` — raw integer, no cents division (per `exportExpensesToCSV` comment "no cents conversion") | P0 | manual-browser |
| EXP-02 | Export | Zero amount exports as "0" not blank | Unit-level | Call `convertToCSV([{a:0}],["a"])` | Cell equals `0` — `String(value ?? "")` only blanks null/undefined, never 0 | P1 | code-review + unit check |
| EXP-03 | Export | Escaping of comma/quote/newline fields | Note containing `Cơm, "ngon"` and an embedded newline | Export CSV | Field wrapped in double quotes, inner quotes doubled (`""`), newline preserved inside quotes; CSV parses back identically | P0 | manual-browser |
| EXP-04 | Export | Date display not timezone-shifted | [UTC+7-EDGE] Transaction dated local today | View list + export | List header via `format(parseISO(date), …)` renders the stored calendar date exactly; export `date` column equals stored `yyyy-MM-dd` (no ±1 day drift) | P0 | manual-browser |
| EXP-05 | Export | CSV header & column order | Any data | Export | Header exactly `date,type,amount,category_name,wallet_name,to_wallet_name,person_name,note,created_at` | P1 | manual-browser |
| EXP-06 | Export | Missing optionals export as blank | Transaction with no category/person/note/to_wallet | Export | Those cells are empty strings (not `null`, not `undefined`) | P1 | manual-browser |
| EXP-07 | Export | Type capitalized in export | Mixed types | Export | Values `Income` / `Expense` / `Transfer` (first-letter uppercase) | P2 | manual-browser |
| EXP-08 | Export | Filename convention | Any | Export | Download named `expenses_<yyyy-mm-dd>.csv` with UTF-8 CSV blob | P2 | manual-browser |
| EXP-09 | Export | Empty data guard | No transactions | Invoke export path | `convertToCSV([],…)` returns `""`; no crash (ExportButton behavior verified) | P2 | code-review |

## 8. Security / RLS

| ID | Area | Title | Preconditions | Steps | Expected Result | Priority | Automation |
|---|---|---|---|---|---|---|---|
| SEC-01 | Security | Actions require auth | Signed out | Call createTransaction / createWallet / createCategory / createPerson / createTransactionsBatch | Returns `{ error: "Not authenticated" }` (transaction actions) or throws "Not authenticated" (wallet/category/person); reads return `[]` | P0 | code-review + manual-browser |
| SEC-02 | Security | Cross-user wallet FK rejected | User B session, user A's wallet_id known | Attempt insert transaction with A's wallet_id | Denied: RLS/WITH CHECK + FK visibility — row not created, no balance change on A's wallet | P0 | manual-db |
| SEC-03 | Security | Cross-user category FK rejected | Same | Insert transaction referencing A's category_id | Denied or category invisible; `category_id` never resolves across users | P0 | manual-db |
| SEC-04 | Security | Ownership-scoped update/delete | User B knows user A's transaction id | Call `updateTransaction(idA, …)` / `deleteTransaction(idA)` | `.eq("user_id", user.id)` matches 0 rows → A's row and balances untouched | P0 | manual-db + code-review |
| SEC-05 | Security | Storage policies per-user path | [MIG-005] | Review policies `receipts_insert_own/select_own/update_own/delete_own` | All four restrict to `bucket_id='receipts' AND (storage.foldername(name))[1] = auth.uid()::text` | P0 | code-review + manual-db |
| SEC-06 | Security | RLS enabled on all finance tables | [MIG-005] | Inspect pg policies | `wallets`, `expense_categories`, `people`, `transactions`, `investment_accounts`, `investment_transactions` all `ENABLE ROW LEVEL SECURITY` with user-scoped policies (migration 001) | P0 | code-review + manual-db |
| SEC-07 | Security | Investment transaction delete relies on parent RLS | Two users' investment transactions exist | As B attempt `deleteInvestmentTransaction(A_txn_id)` | Delete affects 0 rows — RLS via parent `investment_accounts` (documented in action comment); B's data never exposed | P0 | manual-db + code-review |
| SEC-08 | Security | Batch rows stamped with caller's user_id | Authenticated user | Submit batch; inspect DB | Every inserted row's `user_id` = caller's id regardless of payload content (`rows.map(...row, user_id: user.id)`); payload-supplied user_id cannot spoof | P0 | code-review + manual-db |

## 9. Regressions & build

| ID | Area | Title | Preconditions | Steps | Expected Result | Priority | Automation |
|---|---|---|---|---|---|---|---|
| REG-01 | Regression | Task pages unaffected | Seed task data | Browse Inbox, Today, Upcoming, a Project page | Task CRUD, display options, grouping identical to baseline; no finance code paths invoked | P0 | manual-browser |
| REG-02 | Regression | Task CSV export unchanged | Tasks exist | Export tasks CSV | `exportTasksToCSV` columns/transforms unchanged (`P#` priority, Yes/No completed, labels joined) | P1 | manual-browser |
| REG-03 | Regression | Project CSV export unchanged | Projects exist | Export projects CSV | `exportProjectsToCSV` output identical to baseline | P1 | manual-browser |
| REG-04 | Regression | Sidebar/navigation intact | Logged in | Inspect sidebar links, counts, collapse behavior | All nav items render and route correctly incl. Expenses and Investments links | P1 | manual-browser |
| REG-05 | Regression | Lint green | Worktree clean install | `npm run lint` | No errors/warnings introduced | P0 | code-review |
| REG-06 | Regression | Build green | Worktree clean install | `npm run build` | Production build succeeds | P0 | code-review |
| REG-07 | Regression | Migration 005 idempotent | [MIG-005] already applied | Re-run migration 005 | No errors: `CREATE OR REPLACE`, `IF NOT EXISTS`, constraint existence check, `ON CONFLICT DO NOTHING`, `DROP POLICY IF EXISTS` guard everything | P1 | manual-db |
| REG-08 | Regression | Expenses summary cards math | Mixed transactions + wallets | View /expenses | Income = Σ income rows; Expenses = Σ expense rows; Total Balance = Σ wallet balances (transfers excluded from income/expense totals) | P0 | manual-browser |

---

### Notes for executors

- Record per-case status as PASS / FAIL / SKIPPED(reason). Skips must cite the blocker (e.g. "requires MIG-005 — not applied to test project", "requires MODELSTUDIO_API_KEY", "component not yet implemented").
- Balance cases (BAL-*) depend on migration 005; run them after confirming `trg_transactions_balance` exists (`SELECT tgname FROM pg_trigger WHERE tgname='trg_transactions_balance';`).
- BAL-08/BAL-09 expectations encode the reverse-OLD-then-apply-NEW semantics; compute expected balances from the pre-edit snapshot before executing.
- `bulk-entry-panel.tsx` and `image-import-dialog.tsx` cases (BULK-*, IMG-*) are contract-based; if implementation deviates, update steps/selectors but keep the expected-result semantics.
