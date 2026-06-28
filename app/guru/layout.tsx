import { GuruShell } from '@/components/guru/GuruShell'

export default function GuruLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <GuruShell>{children}</GuruShell>
}
