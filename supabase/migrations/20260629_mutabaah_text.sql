-- ============================================================
-- Migrasi: Tambah tipe item (checkbox / text) dan catatan log
-- ============================================================

ALTER TABLE mutabaah_item
  ADD COLUMN IF NOT EXISTS tipe TEXT NOT NULL DEFAULT 'checkbox'
  CHECK (tipe IN ('checkbox', 'text'));

ALTER TABLE mutabaah_log
  ADD COLUMN IF NOT EXISTS catatan TEXT DEFAULT NULL;
