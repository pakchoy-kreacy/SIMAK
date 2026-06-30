// ============================================================
// lib/types/database.ts
// Tipe database yang di-generate dari Supabase schema.
// Pada project nyata, jalankan:
//   npx supabase gen types typescript --project-id $ID > lib/types/database.ts
// ============================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      tahun_ajaran: {
        Row: {
          id:         string
          nama:       string
          is_active:  boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?:        string
          nama:       string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?:        string
          nama?:      string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }

      kelas: {
        Row: {
          id:              string
          tahun_ajaran_id: string
          nama_kelas:      string
          wali_kelas_id:   string | null
          guru_wafa_id:    string | null
          guru_tahfiz_id:  string | null
          created_at:      string
          updated_at:      string
        }
        Insert: {
          id?:             string
          tahun_ajaran_id: string
          nama_kelas:      string
          wali_kelas_id?:  string | null
          guru_wafa_id?:   string | null
          guru_tahfiz_id?: string | null
          created_at?:     string
          updated_at?:     string
        }
        Update: {
          tahun_ajaran_id?: string
          nama_kelas?:      string
          wali_kelas_id?:   string | null
          guru_wafa_id?:    string | null
          guru_tahfiz_id?:  string | null
          updated_at?:      string
        }
        Relationships: []
      }

      siswa: {
        Row: {
          id:              string
          nisn:            string
          nama_lengkap:    string
          parent_name:     string | null
          parent_phone:    string | null
          photo_url:       string | null
          jenis_kelamin:   string | null
          is_active:       boolean
          created_at:      string
          updated_at:      string
        }
        Insert: {
          id?:             string
          nisn:            string
          nama_lengkap:    string
          parent_name?:    string | null
          parent_phone?:   string | null
          photo_url?:      string | null
          jenis_kelamin?:  string | null
          is_active?:      boolean
          created_at?:     string
          updated_at?:     string
        }
        Update: {
          nisn?:           string
          nama_lengkap?:   string
          parent_name?:    string | null
          parent_phone?:   string | null
          photo_url?:      string | null
          jenis_kelamin?:  string | null
          is_active?:      boolean
          updated_at?:     string
        }
        Relationships: []
      }

      siswa_kelas: {
        Row: {
          id:              string
          siswa_id:        string
          kelas_id:        string
          tahun_ajaran_id: string
          created_at:      string
          updated_at:      string
        }
        Insert: {
          id?:             string
          siswa_id:        string
          kelas_id:        string
          tahun_ajaran_id: string
          created_at?:     string
          updated_at?:     string
        }
        Update: {
          siswa_id?:        string
          kelas_id?:        string
          tahun_ajaran_id?: string
          updated_at?:      string
        }
        Relationships: []
      }

      mutabaah_item: {
        Row: {
          id:              string
          tahun_ajaran_id: string
          nama_item:       string
          parent_id:       string | null
          urutan:          number
          is_active:       boolean
          created_at:      string
          updated_at:      string
        }
        Insert: {
          id?:             string
          tahun_ajaran_id: string
          nama_item:       string
          parent_id?:      string | null
          urutan?:         number
          is_active?:      boolean
          created_at?:     string
          updated_at?:     string
        }
        Update: {
          nama_item?:  string
          parent_id?:  string | null
          urutan?:     number
          is_active?:  boolean
          updated_at?: string
        }
        Relationships: []
      }

      mutabaah_log: {
        Row: {
          id:           string
          siswa_id:     string
          item_id:      string
          tanggal:      string
          is_checked:   boolean
          locked_after: string
          created_at:   string
          updated_at:   string
        }
        Insert: {
          id?:          string
          siswa_id:     string
          item_id:      string
          tanggal:      string
          is_checked?:  boolean
          locked_after: string
          created_at?:  string
          updated_at?:  string
        }
        Update: {
          is_checked?:  boolean
          updated_at?:  string
        }
        Relationships: []
      }

      tahfiz_log: {
        Row: {
          id:         string
          siswa_id:   string
          guru_id:    string
          tanggal:    string
          surah:      string
          ayat_awal:  number | null
          ayat_akhir: number | null
          status:     'setoran_baru' | 'murajaah' | 'lulus'
          catatan:    string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?:        string
          siswa_id:   string
          guru_id:    string
          tanggal:    string
          surah:      string
          ayat_awal?: number | null
          ayat_akhir?: number | null
          status:     'setoran_baru' | 'murajaah' | 'lulus'
          catatan?:   string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          surah?:      string
          ayat_awal?:  number | null
          ayat_akhir?: number | null
          status?:     'setoran_baru' | 'murajaah' | 'lulus'
          catatan?:    string | null
          updated_at?: string
        }
        Relationships: []
      }

      wafa_log: {
        Row: {
          id:         string
          siswa_id:   string
          guru_id:    string
          tanggal:    string
          jilid:      string
          halaman:    number | null
          status:     'naik' | 'lanjut' | 'mengulang'
          catatan:    string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?:        string
          siswa_id:   string
          guru_id:    string
          tanggal:    string
          jilid:      string
          halaman?:   number | null
          status:     'naik' | 'lanjut' | 'mengulang'
          catatan?:   string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          jilid?:      string
          halaman?:    number | null
          status?:     'naik' | 'lanjut' | 'mengulang'
          catatan?:    string | null
          updated_at?: string
        }
        Relationships: []
      }

      user_profile: {
        Row: {
          id:         string
          nama:       string
          role:       'admin' | 'wali_kelas' | 'guru_tahfiz' | 'guru_wafa'
          is_active:  boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id:         string
          nama:       string
          role:       'admin' | 'wali_kelas' | 'guru_tahfiz' | 'guru_wafa'
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          nama?:      string
          role?:      'admin' | 'wali_kelas' | 'guru_tahfiz' | 'guru_wafa'
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }

      parent_sessions: {
        Row: {
          id:           string
          siswa_id:     string
          token:        string
          expired_at:   string
          created_at:   string
          last_used_at: string | null
        }
        Insert: {
          id?:          string
          siswa_id:     string
          token:        string
          expired_at?:  string
          created_at?:  string
          last_used_at?: string | null
        }
        Update: {
          last_used_at?: string | null
        }
        Relationships: []
      }

      user_roles: {
        Row: {
          id:         string
          user_id:    string
          role:       string
          created_at: string
        }
        Insert: {
          id?:        string
          user_id:    string
          role:       string
          created_at?: string
        }
        Update: {
          user_id?:   string
          role?:      string
        }
        Relationships: []
      }

      kelas_mutabaah_item: {
        Row: {
          id:               string
          kelas_id:         string
          mutabaah_item_id: string
          created_at:       string
        }
        Insert: {
          id?:              string
          kelas_id:         string
          mutabaah_item_id: string
          created_at?:      string
        }
        Update: {
          kelas_id?:         string
          mutabaah_item_id?: string
        }
        Relationships: []
      }
    }

    Views: {}

    Enums: {}

    CompositeTypes: {}

    Functions: {
      create_parent_session: {
        Args: { p_nisn: string }
        Returns: {
          success:   boolean
          token:     string | null
          siswa_id:  string | null
          nama:      string | null
          error_msg: string | null
        }[]
      }
      verify_parent_session: {
        Args: { p_token: string }
        Returns: {
          valid:     boolean
          siswa_id:  string | null
          nama:      string | null
        }[]
      }
      revoke_parent_session: {
        Args: { p_token: string }
        Returns: void
      }
      get_mutabaah_percentage: {
        Args: { p_siswa_id: string; p_tanggal: string }
        Returns: number
      }
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type TahunAjaran  = Tables<'tahun_ajaran'>
export type Kelas        = Tables<'kelas'>
export type Siswa        = Tables<'siswa'>
export type SiswaKelas   = Tables<'siswa_kelas'>
export type MutabaahItem = Tables<'mutabaah_item'>
export type MutabaahLog  = Tables<'mutabaah_log'>
export type TahfizLog    = Tables<'tahfiz_log'>
export type WafaLog      = Tables<'wafa_log'>
export type UserProfile       = Tables<'user_profile'>
export type ParentSession     = Tables<'parent_sessions'>
export type KelasMutabaahItem = Tables<'kelas_mutabaah_item'>
