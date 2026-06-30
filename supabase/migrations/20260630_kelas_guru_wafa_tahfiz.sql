-- ============================================================
-- Migrasi: Tambah kolom guru_wafa_id & guru_tahfiz_id ke kelas
-- ============================================================

ALTER TABLE kelas
  ADD COLUMN IF NOT EXISTS guru_wafa_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS guru_tahfiz_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
