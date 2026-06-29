// ============================================================
// hooks/useMutabaah.ts
// TanStack Query hooks untuk mutabaah data
// ============================================================

'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useOfflineStore }  from '@/stores/offlineStore'
import { queueMutabaah }    from '@/lib/utils/offline'
import { getTodayWIB }      from '@/lib/utils/date'
import type { MutabaahDayData, WeeklyData, MonthlyData } from '@/lib/types/app'

// -----------------------------------------------------------
// Fetch mutabaah hari ini
// -----------------------------------------------------------
export function useTodayMutabaah(tanggal?: string) {
  const today = tanggal ?? getTodayWIB()

  return useQuery<MutabaahDayData>({
    queryKey: ['mutabaah', 'today', today],
    queryFn:  async () => {
      const res = await fetch(`/api/parent/mutabaah?tanggal=${today}`)
      if (!res.ok) throw new Error('Gagal memuat mutabaah')
      return res.json()
    },
    staleTime:          0,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  })
}

// -----------------------------------------------------------
// Fetch data 7 hari terakhir untuk chart
// -----------------------------------------------------------
export function useWeeklyMutabaah() {
  return useQuery<WeeklyData[]>({
    queryKey: ['mutabaah', 'weekly'],
    queryFn:  async () => {
      const res = await fetch('/api/parent/mutabaah?range=weekly')
      if (!res.ok) throw new Error('Gagal memuat data mingguan')
      return res.json()
    },
    staleTime: 5 * 60 * 1000, // 5 menit
  })
}

// -----------------------------------------------------------
// Fetch data satu bulan untuk heatmap
// -----------------------------------------------------------
export function useMonthlyMutabaah(year: number, month: number) {
  return useQuery<MonthlyData[]>({
    queryKey: ['mutabaah', 'monthly', year, month],
    queryFn:  async () => {
      const res = await fetch(`/api/parent/mutabaah?range=monthly&year=${year}&month=${month}`)
      if (!res.ok) throw new Error('Gagal memuat data bulanan')
      return res.json()
    },
    staleTime: 5 * 60 * 1000,
  })
}

// -----------------------------------------------------------
// Toggle satu item mutabaah (auto-save dengan offline support)
// -----------------------------------------------------------
export function useToggleMutabaah() {
  const queryClient = useQueryClient()
  const { isOnline } = useOfflineStore()

  return useMutation({
    mutationFn: async ({
      itemId,
      tanggal,
      isChecked,
      catatan,
    }: {
      itemId:    string
      tanggal:   string
      isChecked: boolean
      catatan?:  string | null
    }) => {
      if (!isOnline) {
        // Offline: simpan ke IndexedDB queue
        await queueMutabaah({
          id:         `${itemId}_${tanggal}`,
          siswaId:    '', // diisi dari server saat sync
          itemId,
          tanggal,
          isChecked,
          queuedAt:   Date.now(),
          retryCount: 0,
        })
        return { queued: true }
      }

      // Online: langsung ke server
      const res = await fetch('/api/parent/mutabaah', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ itemId, tanggal, isChecked, catatan }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Gagal menyimpan')
      }

      return res.json()
    },

    // Optimistic update — langsung update UI sebelum server konfirmasi
    onMutate: async ({ itemId, tanggal, isChecked, catatan }) => {
      const queryKey = ['mutabaah', 'today', tanggal]
      await queryClient.cancelQueries({ queryKey })

      const previous = queryClient.getQueryData<MutabaahDayData>(queryKey)

      // Update optimistically — handle both flat and hierarchical
      queryClient.setQueryData<MutabaahDayData>(queryKey, (old) => {
        if (!old) return old

        const updatedItems = old.items.map((item) => {
          // Update parent if matches
          if (item.id === itemId) {
            return { ...item, is_checked: isChecked, catatan: catatan ?? item.catatan }
          }
          // Update child if matches
          if (item.children) {
            const updatedChildren = item.children.map(c =>
              c.id === itemId ? { ...c, is_checked: isChecked, catatan: catatan ?? c.catatan } : c
            )
            return { ...item, children: updatedChildren }
          }
          return item
        })

        // Recalculate percentage from leaf items only (not parents)
        const allItems = updatedItems.flatMap(p =>
          p.children && p.children.length > 0 ? p.children : [p]
        )
        const checked    = allItems.filter(i => i.is_checked).length
        const percentage = allItems.length > 0
          ? Math.round((checked / allItems.length) * 100)
          : 0

        return { ...old, items: updatedItems, percentage }
      })

      return { previous, queryKey }
    },

    // Rollback jika server error
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.queryKey, context.previous)
      }
    },

    // Invalidate untuk memastikan konsistensi
    onSettled: (_data, _err, { tanggal }) => {
      queryClient.invalidateQueries({ queryKey: ['mutabaah', 'today', tanggal] })
      queryClient.invalidateQueries({ queryKey: ['mutabaah', 'weekly'] })
    },
  })
}
