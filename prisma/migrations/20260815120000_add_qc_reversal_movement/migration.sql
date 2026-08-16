-- Resetting a quality check has to put the rejected units back. The ledger is
-- append-only, so the reversal is a new positive movement rather than a delete,
-- and it carries its own reason so the pair reads correctly in the movement list.
ALTER TYPE "MovementReason" ADD VALUE IF NOT EXISTS 'QC_REVERSAL';
