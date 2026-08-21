-- =============================================================================
-- A shop that loses utang must still be able to collect what it is owed
-- -----------------------------------------------------------------------------
-- 20260815111000 put a trigger on credit_payments alongside the one on sales,
-- reasoning that "a store that cannot sell on credit cannot collect on it
-- either". That reasoning is wrong, and the way it is wrong compounds.
--
-- Picture the shop it applies to. Aling Nena has fifty thousand pesos of utang
-- spread across forty neighbours. Her plan changes -- a downgrade, a lapsed
-- subscription, an operator revoking the capability. §08 holds: every debt is
-- still there and still readable, nothing was destroyed.
--
-- And now nobody can ever pay her back. Not in the system. The neighbours come
-- in through the week and hand over cash, as they always have; she takes it,
-- because of course she does; and the ledger goes on insisting they owe her.
-- Every repayment makes her books further from the truth. Six months later the
-- record of who owes what is worthless -- not because data was destroyed, but
-- because the system refused to record reality.
--
-- That is a worse outcome than anything the entitlement was protecting.
--
-- THE PRINCIPLE. §08 withdraws WRITES so a tenant cannot take on NEW
-- commitments. It was never meant to trap them in a state they cannot get out
-- of. A credit sale creates an obligation; a credit payment discharges one.
-- Blocking the first is the entitlement working. Blocking the second is a
-- door that locks from the inside.
--
-- The limit layer already got this right and is worth matching: enforcement
-- there is INSERT-only on growth, and "a tenant already over keeps everything
-- and simply cannot add more" (20260815102000). Winding down is not using the
-- feature. It is leaving it.
--
-- No abuse follows. With new credit sales refused, a balance can only fall.
-- There is nothing to gain by recording a payment against a debt you can no
-- longer create.
--
-- The trigger on `sales` STAYS. That is the half that actually withholds the
-- capability, and 240_feature_enforcement still proves a credit sale is
-- refused.
--
-- Affected schemas : public (one trigger and its function, dropped)
-- Rollback         : recreate both from 20260815111000
-- Risk             : low, and one-directional -- this only ever permits a
--                    write that was refused before, and only one that
--                    reduces what a customer owes
-- =============================================================================

drop trigger if exists trg_credit_payments_utang_feature on public.credit_payments;
drop function if exists public.enforce_utang_feature_on_payment();

comment on table public.credit_payments is
  'Repayments against an utang balance. Deliberately NOT gated on pos.utang: a '
  'store that loses the capability keeps its outstanding debts (§08) and must '
  'still be able to record them being settled, or its books drift permanently '
  'from reality. Taking on NEW credit is what the entitlement withholds -- see '
  'the trigger on `sales`.';
