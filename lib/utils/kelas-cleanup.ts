// ============================================================
// lib/utils/kelas-cleanup.ts
// Hapus kelas yang tidak punya siswa_kelas (orphan rows)
// ============================================================

export async function deleteOrphanKelas(supabase: any) {
  const { data: allKelas } = await supabase.from('kelas').select('id')
  const { data: usedKelas } = await supabase.from('siswa_kelas').select('kelas_id')
  const usedIds = new Set((usedKelas ?? []).map((r: any) => r.kelas_id))
  const orphanIds = (allKelas ?? [])
    .filter((k: any) => !usedIds.has(k.id))
    .map((k: any) => k.id)

  if (orphanIds.length === 0) return

  // Hapus relasi terlebih dahulu agar delete kelas tidak terhalang FK
  await supabase.from('kelas_mutabaah_item').delete().in('kelas_id', orphanIds)
  await supabase.from('kelas').delete().in('id', orphanIds)
}
