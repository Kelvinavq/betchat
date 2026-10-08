SET NAMES utf8mb4;

-- ============================================================
-- betchat: alters_caudal_v2.sql
-- Agrega columna client_menu_caudal en system_config
-- para habilitar/deshabilitar los items de menú Caudal
-- (depósito y retiro) desde el panel de ajustes.
-- Ejecutar manualmente sobre la base de datos betchat
-- Fecha: 2026-07-10
-- ============================================================

ALTER TABLE `system_config`
  ADD COLUMN `client_menu_caudal` TINYINT(1) NOT NULL DEFAULT 0
    AFTER `client_menu_faq`;
