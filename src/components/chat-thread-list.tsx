'use client'

import { useState } from 'react'
import { Plus, MessageSquare, Trash2, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type ChatThread = {
  id: string
  title: string
  project_id: string | null
  created_at: string
  updated_at: string
  message_count?: number
  last_message?: string
}

export function ChatThreadList({
  threads,
  activeThreadId,
  projectId,
  onSelectThread,
  onNewThread,
}: {
  threads: ChatThread[]
  activeThreadId: string | null
  projectId?: string
  onSelectThread: (threadId: string) => void
  onNewThread: () => void
}) {
  const [deleting, setDeleting] = useState<string | null>(null)
  const supabase = createClient()

  async function handleDelete(e: React.MouseEvent, threadId: string) {
    e.stopPropagation()
    if (!confirm('Delete this conversation?')) return

    setDeleting(threadId)
    await supabase.from('chat_threads').delete().eq('id', threadId)
    setDeleting(null)

    // If deleting the active thread, trigger new chat
    if (threadId === activeThreadId) {
      onNewThread()
    } else {
      // Just refresh to remove from list
      window.location.reload()
    }
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="flex flex-col h-full">
      {/* New Chat button */}
      <div className="p-3 border-b border-gray-800/50">
        <button
          onClick={onNewThread}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </button>
      </div>

      {/* Thread list */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {threads.length === 0 ? (
          <div className="text-center py-12 px-4">
            <Sparkles className="w-6 h-6 text-gray-700 mx-auto mb-2" />
            <p className="text-gray-600 text-xs">No conversations yet</p>
          </div>
        ) : (
          <div className="p-2 space-y-0.5">
            {threads.map((thread) => (
              <button
                key={thread.id}
                onClick={() => onSelectThread(thread.id)}
                className={`w-full text-left rounded-xl px-3 py-2.5 transition-all group ${
                  activeThreadId === thread.id
                    ? 'bg-gray-800 ring-1 ring-gray-700'
                    : 'hover:bg-gray-900/50'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <MessageSquare className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${
                    activeThreadId === thread.id ? 'text-indigo-400' : 'text-gray-600'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${
                      activeThreadId === thread.id ? 'text-white' : 'text-gray-300'
                    }`}>
                      {thread.title}
                    </p>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-[10px] text-gray-600 truncate max-w-[140px]">
                        {thread.last_message || 'Empty conversation'}
                      </p>
                      <span className="text-[10px] text-gray-600 flex-shrink-0 ml-2">
                        {formatDate(thread.updated_at)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, thread.id)}
                    className={`opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 p-1 flex-shrink-0 transition-opacity ${
                      deleting === thread.id ? 'opacity-100' : ''
                    }`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
