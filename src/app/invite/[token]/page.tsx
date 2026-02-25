'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { acceptInvite } from '@/lib/actions'
import { createClient } from '@/lib/supabase/client'

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'accepting' | 'error' | 'needsAuth'>('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    checkAuthAndAccept()
  }, [])

  async function checkAuthAndAccept() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setStatus('needsAuth')
      return
    }

    setStatus('accepting')
    try {
      const projectId = await acceptInvite(token)
      router.push(`/project/${projectId}`)
    } catch (err: any) {
      setError(err.message || 'Failed to accept invite')
      setStatus('error')
    }
  }

  if (status === 'loading' || status === 'accepting') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-400">Accepting invite...</p>
        </div>
      </div>
    )
  }

  if (status === 'needsAuth') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <h1 className="text-2xl font-bold text-white mb-2">You&apos;re invited!</h1>
          <p className="text-gray-400 mb-6">Sign in or create an account to accept this project invite.</p>
          <a
            href={`/auth/login?next=/invite/${token}`}
            className="block w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-xl transition-colors mb-3"
          >
            Sign In
          </a>
          <a
            href={`/auth/signup?next=/invite/${token}`}
            className="block w-full bg-gray-800 hover:bg-gray-700 text-white font-medium py-3 rounded-xl transition-colors"
          >
            Create Account
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <h1 className="text-xl font-bold text-red-400 mb-2">Invite Error</h1>
        <p className="text-gray-400 mb-6">{error}</p>
        <a
          href="/dashboard"
          className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 px-6 rounded-xl"
        >
          Go to Dashboard
        </a>
      </div>
    </div>
  )
}
