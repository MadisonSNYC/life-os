'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from '@/lib/actions'
import { LogOut, User } from 'lucide-react'
import type { Profile } from '@/lib/types'

export function SettingsView({ profile }: { profile: Profile }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleSignOut() {
    setLoading(true)
    await signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Profile */}
      <div className="bg-gray-900 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-600/20 rounded-full flex items-center justify-center">
            <User className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <p className="text-white font-medium">{profile.display_name || 'User'}</p>
            <p className="text-gray-400 text-sm">{profile.email}</p>
          </div>
        </div>
      </div>

      {/* Sign Out */}
      <button
        onClick={handleSignOut}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-red-400 font-medium py-3 rounded-xl transition-colors"
      >
        <LogOut className="w-4.5 h-4.5" />
        {loading ? 'Signing out...' : 'Sign Out'}
      </button>

      {/* App Info */}
      <div className="text-center text-xs text-gray-600 pt-4">
        <p>Life OS v1.0</p>
        <p className="mt-1">Built with Next.js + Supabase</p>
      </div>
    </div>
  )
}
