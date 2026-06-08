ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS session_version INT NOT NULL DEFAULT 0 COMMENT 'Incrementa para invalidar sesiones JWT de cliente';
