'use client'

import { useState, useEffect } from 'react'
import { useToast }            from '@/components/ui/Toast'
import { Breadcrumb }          from '@/components/ui/Breadcrumb'
import { cn }                  from '@/lib/utils/cn'

interface StaffRow {
  id:         string
  nama:       string
  email:      string
  role:       string
  is_active:  boolean
  kelas:      string[]
  created_at: string
}

const ROLE_LABEL: Record<string, string> = {
  admin:       'Admin',
  wali_kelas:  'Wali Kelas',
  guru_tahfiz: 'Guru Tahfiz',
  guru_wafa:   'Guru Wafa',
}

const ROLE_COLOR: Record<string, string> = {
  admin:       'bg-blue-100 text-blue-700',
  wali_kelas:  'bg-green-100 text-green-700',
  guru_tahfiz: 'bg-emerald-100 text-emerald-700',
  guru_wafa:   'bg-amber-100 text-amber-700',
}

export default function AdminStaffPage() {
  const [staffList,   setStaffList]   = useState<StaffRow[]>([])
  const [isLoading,   setIsLoading]   = useState(true)
  const [showForm,    setShowForm]    = useState(false)
  const [editStaff,   setEditStaff]   = useState<StaffRow | null>(null)
  const [confirmDel, setConfirmDel]   = useState<StaffRow | null>(null)
  const [delLoading,  setDelLoading]  = useState(false)

  // Form state
  const [formEmail,    setFormEmail]    = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formNama,     setFormNama]     = useState('')
  const [formRole,     setFormRole]     = useState('wali_kelas')
  const [formLoading,  setFormLoading]  = useState(false)
  const [formError,    setFormError]    = useState('')

  const { showToast, ToastComponent } = useToast()

  async function fetchStaff() {
    setIsLoading(true)
    const res  = await fetch('/api/admin/staff')
    const data = await res.json()
    setStaffList(Array.isArray(data) ? data : [])
    setIsLoading(false)
  }

  useEffect(() => { fetchStaff() }, [])

  function openAddForm() {
    setEditStaff(null)
    setFormEmail(''); setFormPassword(''); setFormNama(''); setFormRole('wali_kelas'); setFormError('')
    setShowForm(true)
  }

  function openEditForm(staff: StaffRow) {
    setEditStaff(staff)
    setFormNama(staff.nama); setFormRole(staff.role === 'admin' ? 'admin' : 'wali_kelas'); setFormEmail(''); setFormPassword(''); setFormError('')
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormLoading(true); setFormError('')

    if (editStaff) {
      const body: Record<string, unknown> = { nama: formNama, role: formRole }
      if (formPassword) body.newPassword = formPassword
      const res  = await fetch(`/api/admin/staff/${editStaff.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      const data = await res.json()
      if (res.ok) { showToast('Akun diperbarui', 'success'); setShowForm(false); fetchStaff() }
      else setFormError(data.error ?? 'Gagal memperbarui')
    } else {
      const res  = await fetch('/api/admin/staff', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formEmail, password: formPassword, nama: formNama, role: formRole }),
      })
      const data = await res.json()
      if (res.ok) { showToast('Akun berhasil dibuat', 'success'); setShowForm(false); fetchStaff() }
      else setFormError(data.error ?? 'Gagal membuat akun')
    }
    setFormLoading(false)
  }

  async function handleDelete() {
    if (!confirmDel) return
    setDelLoading(true)
    const res = await fetch(`/api/admin/staff/${confirmDel.id}`, { method: 'DELETE' })
    const data = await res.json()
    if (res.ok) {
      showToast(data.message ?? 'Akun dihapus', 'success')
      setConfirmDel(null)
      fetchStaff()
    } else {
      showToast(data.error ?? 'Gagal menghapus', 'error')
    }
    setDelLoading(false)
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="bg-white border-b border-neutral-100 px-4 py-4 sticky top-14 md:top-0 z-30">
        <Breadcrumb />
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-neutral-800">Kelola Guru</h2>
            <p className="text-xs text-neutral-400 mt-0.5">{staffList.filter(s => s.is_active).length} akun aktif</p>
          </div>
          <button onClick={openAddForm} className="h-9 px-3 bg-primary-500 text-white text-xs font-semibold rounded-lg">+ Buat Akun</button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-2">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 bg-neutral-200 rounded-lg animate-skeleton" />)
        ) : staffList.length === 0 ? (
          <div className="bg-white rounded-xl shadow-card border border-neutral-100 text-center py-12">
            <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" />
                <line x1="22" y1="11" x2="16" y2="11" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-neutral-600">Belum ada akun guru</p>
            <p className="text-xs text-neutral-400 mt-1">Buat akun guru untuk memulai</p>
          </div>
        ) : (
          staffList.map((staff, i) => (
            <div key={staff.id} className={cn('bg-white rounded-xl shadow-card border border-neutral-100 p-4 animate-in', !staff.is_active && 'opacity-60')} style={{ animationDelay: `${i * 0.03}s` }}>
              {confirmDel?.id === staff.id ? (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-neutral-700">
                    Hapus akun <span className="text-danger">{staff.nama}</span>?
                  </p>
                  <p className="text-xs text-neutral-400">
                    {staff.kelas.length > 0
                      ? 'Akun memiliki data kelas. Akses akan dinonaktifkan tapi data histori dipertahankan.'
                      : 'Akun akan dihapus permanen dari sistem.'}
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => setConfirmDel(null)} className="flex-1 py-2 text-xs border border-neutral-200 rounded-lg font-semibold">Batal</button>
                    <button onClick={handleDelete} disabled={delLoading} className="flex-1 py-2 text-xs bg-danger text-white rounded-lg font-semibold disabled:opacity-50">
                      {delLoading ? 'Menghapus...' : 'Hapus'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-700 font-bold text-sm">{staff.nama.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm text-neutral-800 truncate">{staff.nama}</p>
                      {!staff.is_active && <span className="text-[10px] bg-neutral-200 text-neutral-500 px-1.5 py-0.5 rounded-full font-semibold">Nonaktif</span>}
                    </div>
                    {staff.email && (
                      <p className="text-xs text-neutral-400 mt-0.5 truncate">{staff.email}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', ROLE_COLOR[staff.role] ?? 'bg-neutral-100 text-neutral-500')}>
                        {ROLE_LABEL[staff.role] ?? staff.role}
                      </span>
                      {staff.kelas.length > 0 && (
                        <span className="text-[10px] text-neutral-400">
                          Kelas: {staff.kelas.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => openEditForm(staff)} className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-primary-500 hover:bg-primary-50" title="Edit">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button onClick={() => setConfirmDel(staff)} className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-danger hover:bg-red-50" title="Hapus Akun">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/></svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
            <div className="flex items-center justify-between px-4 py-4 border-b border-neutral-100 sticky top-0 bg-white">
              <h3 className="font-bold text-neutral-800">{editStaff ? 'Edit Akun' : 'Buat Akun Baru'}</h3>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-100 text-neutral-500">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {formError && <div className="bg-red-50 border border-red-200 rounded-lg p-3"><p className="text-sm text-danger">{formError}</p></div>}

              {!editStaff && (
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-1.5">Email <span className="text-danger">*</span></label>
                  <input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="guru4@sch.id" className="w-full h-11 px-4 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" required />
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1.5">Nama Lengkap <span className="text-danger">*</span></label>
                <input type="text" value={formNama} onChange={e => setFormNama(e.target.value)} placeholder="Guru Kelas 4" className="w-full h-11 px-4 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" required />
                <p className="text-[11px] text-neutral-400 mt-1">Format: <strong>Guru Kelas [nama kelas]</strong></p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1.5">Role <span className="text-danger">*</span></label>
                <select value={formRole} onChange={e => setFormRole(e.target.value)} className="w-full h-11 px-3 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-300">
                  <option value="admin">Admin - Administrator penuh</option>
                  <option value="wali_kelas">Wali Kelas (akses penuh)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1.5">
                  Password {editStaff && <span className="text-neutral-400 font-normal">(kosongkan jika tidak ingin mengubah)</span>}
                  {!editStaff && <span className="text-danger"> *</span>}
                </label>
                <input
                  type="password"
                  value={formPassword}
                  onChange={e => setFormPassword(e.target.value)}
                  placeholder={editStaff ? 'Password baru (opsional)' : 'Min. 8 karakter'}
                  className="w-full h-11 px-4 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
                  required={!editStaff}
                  minLength={8}
                />
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 h-11 border border-neutral-200 rounded-lg text-sm font-semibold text-neutral-600">Batal</button>
                <button type="submit" disabled={formLoading} className={cn('flex-1 h-11 rounded-lg text-sm font-semibold text-white', formLoading ? 'bg-neutral-300' : 'bg-primary-500 hover:bg-primary-600')}>
                  {formLoading ? 'Menyimpan...' : editStaff ? 'Simpan' : 'Buat Akun'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {ToastComponent}
    </div>
  )
}
