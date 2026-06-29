// ============================================================
// lib/types/app.ts
// Custom types untuk aplikasi SIMAK
// ============================================================

// ----------------------------------------
// Auth Types
// ----------------------------------------

export type StaffRole = 'admin' | 'wali_kelas' | 'guru_tahfiz' | 'guru_wafa'

export interface ParentSessionData {
  siswaId:   string
  siswaName: string
}

export interface StaffSessionData {
  userId: string
  email:  string
  nama:   string
  role:   StaffRole     // primary role (backward compat)
  roles:  StaffRole[]   // all roles (multi-role)
}

// ----------------------------------------
// Mutabaah Types
// ----------------------------------------

export interface MutabaahItemWithStatus {
  id:         string
  nama_item:  string
  urutan:     number
  is_checked: boolean
  is_locked:  boolean
  parent_id:  string | null
  tipe:       string
  catatan:    string | null
  children?:  MutabaahItemWithStatus[]
}

export interface MutabaahDayData {
  tanggal:    string   // YYYY-MM-DD
  items:      MutabaahItemWithStatus[]
  percentage: number
  is_locked:  boolean
}

export interface WeeklyData {
  tanggal:    string   // YYYY-MM-DD
  label:      string   // 'Sen', 'Sel', etc.
  percentage: number
  total:      number
  checked:    number
}

export interface MonthlyData {
  tanggal:    string
  percentage: number | null   // null = belum ada data
}

// ----------------------------------------
// Siswa Types
// ----------------------------------------

export interface SiswaWithKelas {
  id:           string
  nisn:         string
  nama_lengkap: string
  parent_name:  string | null
  parent_phone: string | null
  photo_url:    string | null
  kelas:        string
  tahun_ajaran: string
}

// ----------------------------------------
// API Response Types
// ----------------------------------------

export interface ApiResponse<T> {
  data:    T | null
  error:   string | null
  success: boolean
}

export interface ParentLoginResponse {
  success:   boolean
  siswaName: string | null
  error:     string | null
}

// ----------------------------------------
// Offline Queue Types
// ----------------------------------------

export interface OfflineQueueItem {
  id:         string   // `${siswaId}_${itemId}_${tanggal}`
  siswaId:    string
  itemId:     string
  tanggal:    string
  isChecked:  boolean
  queuedAt:   number   // timestamp
  retryCount: number
}
