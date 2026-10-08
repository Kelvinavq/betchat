-- ============================================================
-- Retiros HG Cash / Caudal - paridad operativa v2
-- Ejecutar despues de alters_withdrawal_auto_v1.sql y alters_caudal_v3.sql.
-- ============================================================

-- Evita que reintentos concurrentes creen dos retiros HG Cash.
-- Los valores NULL siguen permitidos para solicitudes historicas.
ALTER TABLE `withdrawal_requests`
  DROP INDEX `idx_wr_idempotency`,
  ADD UNIQUE INDEX `idx_wr_idempotency` (`chat_id`, `idempotency_key`);

-- Caudal ya dispone de uq_caudal_withdrawal_source_ref
-- (account_external_id, client_reference_id) en alters_caudal_v3.sql.
