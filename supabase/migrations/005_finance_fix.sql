-- ═══════════════════════════════════════════════════════════════
-- 005: Finance Fixes
--   1. Wallet balance trigger on transactions (insert/update/delete)
--   2. CHECK constraint: transfers must have a distinct destination wallet
--   3. transactions.source + transactions.attachment_url columns
--   4. wallets.opening_balance: preserve user-entered balances
--   5. reconcile_wallet_balances() repair function + one-shot run
--   6. Private 'receipts' storage bucket + per-user storage policies
-- Idempotent where cheap: CREATE OR REPLACE, IF NOT EXISTS, ON CONFLICT,
-- DROP POLICY IF EXISTS.
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════
-- 1. BALANCE TRIGGER — core accounting logic
-- ═══════════════════════════════════════════

-- Helper: applies the natural balance effect of a transaction of a given
-- type, multiplied by p_sign (+1 to apply, -1 to reverse).
--   expense  -> wallet_id  loses  amount
--   income   -> wallet_id  gains  amount
--   transfer -> wallet_id loses amount, to_wallet_id gains amount
-- SECURITY INVOKER so wallets RLS still applies to these updates.
CREATE OR REPLACE FUNCTION apply_delta(
  p_type        TEXT,
  p_amount      BIGINT,
  p_wallet_id   UUID,
  p_to_wallet_id UUID,
  p_sign        INT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF p_type = 'income' THEN
    -- Money in: increase source wallet balance.
    UPDATE wallets
       SET balance = balance + (p_sign * p_amount)
     WHERE id = p_wallet_id;
  ELSIF p_type = 'expense' THEN
    -- Money out: decrease source wallet balance.
    UPDATE wallets
       SET balance = balance - (p_sign * p_amount)
     WHERE id = p_wallet_id;
  ELSIF p_type = 'transfer' THEN
    -- Money moves: subtract from origin wallet, add to destination wallet.
    UPDATE wallets
       SET balance = balance - (p_sign * p_amount)
     WHERE id = p_wallet_id;
    UPDATE wallets
       SET balance = balance + (p_sign * p_amount)
     WHERE id = p_to_wallet_id;
  END IF;
END;
$$;

-- Trigger function: keeps wallets.balance in sync with transactions.
--   INSERT -> apply the transaction's delta          (sign +1)
--   DELETE -> reverse the transaction's delta        (sign -1, from OLD)
--   UPDATE -> reverse OLD delta, then apply NEW delta.
--             This correctly handles changes to type / amount / wallet_id /
--             to_wallet_id, including converting to/from a transfer.
-- SECURITY INVOKER so wallets RLS still applies.
CREATE OR REPLACE FUNCTION apply_transaction_delta()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM apply_delta(NEW.type, NEW.amount, NEW.wallet_id, NEW.to_wallet_id, 1);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Undo what the old row did, then apply what the new row does.
    PERFORM apply_delta(OLD.type, OLD.amount, OLD.wallet_id, OLD.to_wallet_id, -1);
    PERFORM apply_delta(NEW.type, NEW.amount, NEW.wallet_id, NEW.to_wallet_id, 1);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM apply_delta(OLD.type, OLD.amount, OLD.wallet_id, OLD.to_wallet_id, -1);
    RETURN OLD;
  END IF;
  RETURN NULL; -- unreachable; satisfies plpgsql return requirement
END;
$$;

-- Attach the trigger (drop first so re-running the migration is safe).
DROP TRIGGER IF EXISTS trg_transactions_balance ON transactions;
CREATE TRIGGER trg_transactions_balance
  AFTER INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION apply_transaction_delta();

-- ═══════════════════════════════════════════
-- 2. TRANSFER DESTINATION CHECK CONSTRAINT
-- ═══════════════════════════════════════════

-- Transfers must specify a destination wallet that differs from the source.
-- Non-transfer rows always pass the check.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_transfer_destination'
  ) THEN
    ALTER TABLE transactions
      ADD CONSTRAINT chk_transfer_destination
      CHECK (type <> 'transfer' OR (to_wallet_id IS NOT NULL AND to_wallet_id <> wallet_id));
  END IF;
END;
$$;

-- ═══════════════════════════════════════════
-- 3. NEW COLUMNS: source + attachment_url
-- ═══════════════════════════════════════════

-- Where the transaction came from: manual entry, bulk import, or image/receipt scan.
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';

-- Allowed source values. Guarded so re-running this migration after the
-- column already exists (but the constraint doesn't) still applies it.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_transaction_source'
  ) THEN
    ALTER TABLE transactions
      ADD CONSTRAINT chk_transaction_source
      CHECK (source IN ('manual', 'bulk', 'image'));
  END IF;
END;
$$;

-- URL of an uploaded receipt image, if any.
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS attachment_url TEXT;

-- ═══════════════════════════════════════════
-- 4. OPENING BALANCE PRESERVATION
-- ═══════════════════════════════════════════

-- Prior app code never actually mutated wallets.balance (the RPCs were
-- broken), so whatever balance is stored right now is exactly what the
-- user entered as the opening balance. Snapshot it before the trigger /
-- reconcile start layering transaction deltas on top.
ALTER TABLE wallets
  ADD COLUMN IF NOT EXISTS opening_balance BIGINT NOT NULL DEFAULT 0;

-- One-shot snapshot (no-op on re-runs: opening_balance is already set).
UPDATE wallets
   SET opening_balance = balance
 WHERE opening_balance = 0 AND balance <> 0;

-- ═══════════════════════════════════════════
-- 5. REPAIR: recompute wallet balances from transactions
-- ═══════════════════════════════════════════

-- Recomputes every wallet's balance as opening balance plus transaction
-- deltas:
--   balance = opening_balance + SUM(income) - SUM(expense)
--               - SUM(transfer out) + SUM(transfer in)
-- Wallets with no transactions converge to their opening balance.
-- The trigger applies relative deltas on top of the current balance, so
-- this reconcile preserves opening balances instead of resetting to zero.
-- SECURITY INVOKER so wallets RLS still applies.
CREATE OR REPLACE FUNCTION reconcile_wallet_balances()
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  UPDATE wallets w
     SET balance = w.opening_balance + COALESCE((
       SELECT SUM(
         CASE
           WHEN t.type = 'income' THEN t.amount
           WHEN t.type = 'expense' THEN -t.amount
           WHEN t.type = 'transfer' AND t.wallet_id = w.id THEN -t.amount
           WHEN t.type = 'transfer' AND t.to_wallet_id = w.id THEN t.amount
           ELSE 0
         END
       )
       FROM transactions t
       WHERE t.wallet_id = w.id OR t.to_wallet_id = w.id
     ), 0);
END;
$$;

-- Idempotent one-shot repair of any balance drift caused by previously
-- broken application code. Safe to re-run: it always converges.
SELECT reconcile_wallet_balances();

-- ═══════════════════════════════════════════
-- 6. STORAGE: 'receipts' bucket
-- ═══════════════════════════════════════════

-- Private bucket, max 10 MB per file, images only.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('receipts', 'receipts', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════
-- 7. STORAGE: per-user policies on 'receipts'
-- ═══════════════════════════════════════════

-- Path convention: '{user_id}/{filename}' — users can only touch objects
-- whose first path segment equals their own id.

DROP POLICY IF EXISTS "receipts_insert_own" ON storage.objects;
CREATE POLICY "receipts_insert_own" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "receipts_select_own" ON storage.objects;
CREATE POLICY "receipts_select_own" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "receipts_update_own" ON storage.objects;
CREATE POLICY "receipts_update_own" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "receipts_delete_own" ON storage.objects;
CREATE POLICY "receipts_delete_own" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
