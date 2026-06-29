-- ============================================================
-- Migration: Tambah kolom jenis_kelamin ke tabel siswa
-- ============================================================

ALTER TABLE siswa
ADD COLUMN IF NOT EXISTS jenis_kelamin text CHECK (jenis_kelamin IN ('L', 'P'));
