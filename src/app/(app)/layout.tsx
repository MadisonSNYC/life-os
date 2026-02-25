import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BottomNav } from '@/components/bottom-nav'
import { QuickAddButton } from '@/components/quick-add-button'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  return (
    <div className="min-h-screen bg-gray-950 pb-20">
      <main className="max-w-lg mx-auto">
        {children}
      </main>
      <QuickAddButton />
      <BottomNav />
    </div>
  )
}
