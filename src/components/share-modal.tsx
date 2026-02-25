'use client'

import { useState } from 'react'
import { X, Copy, Check, Trash2, Link2 } from 'lucide-react'
import { createShareLink, removeShare } from '@/lib/actions'
import type { ProjectShare } from '@/lib/types'

export function ShareModal({ projectId, shares, onClose }: {
  projectId: string
  shares: ProjectShare[]
  onClose: () => void
}) {
  const [role, setRole] = useState<'view' | 'edit'>('edit')
  const [copied, setCopied] = useState(false)
  const [newLink, setNewLink] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleCreateLink() {
    setLoading(true)
    try {
      const share = await createShareLink(projectId, role)
      const link = `${window.location.origin}/invite/${share.invite_token}`
      setNewLink(link)
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(newLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleRemove(shareId: string) {
    await removeShare(shareId)
    onClose()
  }

  const acceptedShares = shares.filter(s => s.accepted)
  const pendingShares = shares.filter(s => !s.accepted)

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-gray-900 rounded-t-2xl sm:rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Share Project</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Generate Link */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="edit">Can edit</option>
              <option value="view">View only</option>
            </select>
            <button
              onClick={handleCreateLink}
              disabled={loading}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg flex items-center justify-center gap-2"
            >
              <Link2 className="w-4 h-4" />
              {loading ? 'Creating...' : 'Create Invite Link'}
            </button>
          </div>

          {newLink && (
            <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-3">
              <input
                type="text"
                value={newLink}
                readOnly
                className="flex-1 bg-transparent text-sm text-gray-300 outline-none truncate"
              />
              <button
                onClick={handleCopy}
                className="text-gray-400 hover:text-white p-1"
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          )}
        </div>

        {/* Collaborators */}
        {acceptedShares.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-2">Collaborators</h3>
            <div className="space-y-1">
              {acceptedShares.map((share: any) => (
                <div key={share.id} className="flex items-center justify-between bg-gray-800/50 rounded-lg px-3 py-2">
                  <div>
                    <p className="text-sm text-white">
                      {share.invited_user?.display_name || share.invited_user?.email || 'User'}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">{share.role}</p>
                  </div>
                  <button
                    onClick={() => handleRemove(share.id)}
                    className="text-gray-500 hover:text-red-400 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {pendingShares.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-2">Pending Invites</h3>
            <div className="space-y-1">
              {pendingShares.map((share) => (
                <div key={share.id} className="flex items-center justify-between bg-gray-800/50 rounded-lg px-3 py-2">
                  <div>
                    <p className="text-sm text-gray-400">Pending invite</p>
                    <p className="text-xs text-gray-500 capitalize">{share.role}</p>
                  </div>
                  <button
                    onClick={() => handleRemove(share.id)}
                    className="text-gray-500 hover:text-red-400 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
