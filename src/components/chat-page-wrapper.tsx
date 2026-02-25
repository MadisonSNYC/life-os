'use client'

import { useState, useEffect } from 'react'
import { ChatInterface } from './chat-interface'
import { ChatThreadList } from './chat-thread-list'
import { Menu, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type ChatThread = {
  id: string
  title: string
  project_id: string | null
  created_at: string
  updated_at: string
  last_message?: string
}

type Message = {
  id?: string
  role: 'user' | 'assistant'
  content: string
  metadata?: any
  created_at?: string
}

export function ChatPageWrapper({
  initialThreads,
  initialMessages,
  initialThreadId,
  projectId,
}: {
  initialThreads: ChatThread[]
  initialMessages: Message[]
  initialThreadId: string | null
  projectId?: string
}) {
  const [threads, setThreads] = useState<ChatThread[]>(initialThreads)
  const [activeThreadId, setActiveThreadId] = useState<string | null>(initialThreadId)
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [showSidebar, setShowSidebar] = useState(false)
  const supabase = createClient()

  async function loadThreadMessages(threadId: string) {
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true })

    setMessages(data || [])
    setActiveThreadId(threadId)
    setShowSidebar(false)
  }

  function handleNewThread() {
    setActiveThreadId(null)
    setMessages([])
    setShowSidebar(false)
  }

  function handleThreadCreated(threadId: string, title: string) {
    const newThread: ChatThread = {
      id: threadId,
      title,
      project_id: projectId || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_message: title,
    }
    setThreads(prev => [newThread, ...prev])
    setActiveThreadId(threadId)
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] relative">
      {/* Mobile sidebar toggle */}
      <button
        onClick={() => setShowSidebar(!showSidebar)}
        className="absolute top-3 left-3 z-30 p-2 text-gray-400 hover:text-white bg-gray-900/80 rounded-lg backdrop-blur-sm lg:hidden"
      >
        {showSidebar ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
      </button>

      {/* Thread sidebar */}
      <div className={`absolute lg:relative inset-y-0 left-0 z-20 w-64 bg-gray-950 border-r border-gray-800/50 transition-transform lg:translate-x-0 ${
        showSidebar ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="pt-14 lg:pt-0 h-full">
          <ChatThreadList
            threads={threads}
            activeThreadId={activeThreadId}
            projectId={projectId}
            onSelectThread={loadThreadMessages}
            onNewThread={handleNewThread}
          />
        </div>
      </div>

      {/* Backdrop for mobile sidebar */}
      {showSidebar && (
        <div
          className="fixed inset-0 bg-black/50 z-10 lg:hidden"
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* Chat area */}
      <div className="flex-1 min-w-0">
        <ChatInterface
          projectId={projectId}
          initialMessages={messages}
          threadId={activeThreadId}
          onThreadCreated={handleThreadCreated}
        />
      </div>
    </div>
  )
}
