'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Paperclip, X, Image, FileText, Loader2, ChevronRight, CheckCircle2, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Attachment = {
  url: string
  type: string
  name: string
  preview?: string
}

type Message = {
  id?: string
  role: 'user' | 'assistant'
  content: string
  metadata?: {
    attachments?: Attachment[]
    created_items?: string[]
    created_project?: string | null
    has_planning_page?: boolean
  }
  created_at?: string
}

type ChatAction = {
  created_project_id: string | null
  created_items: string[]
  has_planning_page: boolean
}

export function ChatInterface({ projectId, initialMessages, threadId, onThreadCreated }: {
  projectId?: string
  initialMessages?: Message[]
  threadId?: string | null
  onThreadCreated?: (threadId: string, title: string) => void
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages || [])
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(threadId || null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [uploading, setUploading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Reset when thread changes
  useEffect(() => {
    setMessages(initialMessages || [])
    setCurrentThreadId(threadId || null)
  }, [threadId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    // Auto-resize textarea
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px'
    }
  }, [input])

  async function handleFileUpload(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)

    for (const file of Array.from(files)) {
      try {
        const formData = new FormData()
        formData.append('file', file)

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (!res.ok) throw new Error('Upload failed')

        const data = await res.json()

        // Create local preview for images
        let preview: string | undefined
        if (file.type.startsWith('image/')) {
          preview = URL.createObjectURL(file)
        }

        setAttachments(prev => [...prev, {
          url: data.url,
          type: file.type,
          name: file.name,
          preview,
        }])
      } catch (err) {
        console.error('Upload error:', err)
      }
    }
    setUploading(false)
  }

  function removeAttachment(index: number) {
    setAttachments(prev => {
      const removed = prev[index]
      if (removed.preview) URL.revokeObjectURL(removed.preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  async function handleSend() {
    const text = input.trim()
    if (!text && attachments.length === 0) return
    if (loading) return

    const userMessage: Message = {
      role: 'user',
      content: text,
      metadata: { attachments: attachments.length > 0 ? [...attachments] : undefined },
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setAttachments([])
    setLoading(true)

    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          projectId,
          threadId: currentThreadId,
          attachments: userMessage.metadata?.attachments?.map(a => ({
            url: a.url,
            type: a.type,
            name: a.name,
          })),
          history: messages.slice(-10).map(m => ({
            role: m.role,
            content: m.content,
            metadata: m.metadata,
          })),
        }),
      })

      if (!res.ok) throw new Error('Failed to get response')

      const data = await res.json()

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message,
        metadata: data.actions ? {
          created_items: data.actions.created_items,
          created_project: data.actions.created_project_id,
          has_planning_page: data.actions.has_planning_page,
        } : undefined,
      }

      setMessages(prev => [...prev, assistantMessage])

      // Track thread ID if newly created
      if (data.threadId && !currentThreadId) {
        setCurrentThreadId(data.threadId)
        onThreadCreated?.(data.threadId, data.threadTitle || text.substring(0, 50))
      }

      // Refresh the page data if actions were taken
      if (data.actions) {
        router.refresh()
      }
    } catch (err) {
      console.error('Chat error:', err)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
      }])
    }

    setLoading(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items
    if (!items) return

    const imageItems = Array.from(items).filter(item => item.type.startsWith('image/'))
    if (imageItems.length > 0) {
      e.preventDefault()
      const files = imageItems.map(item => item.getAsFile()).filter(Boolean) as File[]
      const dt = new DataTransfer()
      files.forEach(f => dt.items.add(f))
      handleFileUpload(dt.files)
    }
  }

  function renderMarkdown(text: string) {
    // Simple markdown rendering — bold, italic, headers, code, lists
    let html = text
      // Code blocks
      .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-gray-800 rounded-lg p-3 my-2 text-sm overflow-x-auto"><code>$2</code></pre>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code class="bg-gray-800 px-1.5 py-0.5 rounded text-sm">$1</code>')
      // Headers
      .replace(/^### (.+)$/gm, '<h3 class="text-sm font-semibold text-white mt-3 mb-1">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-base font-semibold text-white mt-4 mb-1.5">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="text-lg font-bold text-white mt-4 mb-2">$1</h1>')
      // Bold
      .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
      // Italic
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Bullet lists
      .replace(/^[*-] (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
      // Numbered lists
      .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="text-indigo-400 hover:underline">$1</a>')
      // Line breaks
      .replace(/\n\n/g, '<br/><br/>')
      .replace(/\n/g, '<br/>')

    return html
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-hide">
        {messages.length === 0 && (
          <div className="text-center py-16">
            <Sparkles className="w-8 h-8 text-indigo-400 mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-white mb-1">Life OS Chat</h2>
            <p className="text-gray-400 text-sm max-w-xs mx-auto">
              Tell me what you need to do and I'll create tasks, plans, and organize everything for you.
            </p>
            <div className="mt-6 space-y-2 max-w-xs mx-auto">
              {[
                'Plan a birthday dinner for 8 people',
                'I need to prep for my job interview Thursday',
                'Grocery list for meal prep this week',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => { setInput(suggestion); inputRef.current?.focus() }}
                  className="w-full text-left text-sm bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-xl px-4 py-2.5 text-gray-300 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] ${
              msg.role === 'user'
                ? 'bg-indigo-600 rounded-2xl rounded-br-md px-4 py-2.5'
                : 'bg-gray-900 rounded-2xl rounded-bl-md px-4 py-3'
            }`}>
              {/* Show image attachments */}
              {msg.metadata?.attachments && msg.metadata.attachments.length > 0 && (
                <div className="flex gap-2 mb-2 flex-wrap">
                  {msg.metadata.attachments.map((att, j) => (
                    att.type.startsWith('image/') ? (
                      <img
                        key={j}
                        src={att.preview || att.url}
                        alt={att.name}
                        className="w-32 h-32 object-cover rounded-lg"
                      />
                    ) : (
                      <div key={j} className="flex items-center gap-2 bg-black/20 rounded-lg px-3 py-2">
                        <FileText className="w-4 h-4 text-gray-300" />
                        <span className="text-xs text-gray-300 truncate max-w-[120px]">{att.name}</span>
                      </div>
                    )
                  ))}
                </div>
              )}

              {/* Message content */}
              {msg.role === 'user' ? (
                <p className="text-sm text-white whitespace-pre-wrap">{msg.content}</p>
              ) : (
                <div
                  className="text-sm text-gray-200 leading-relaxed prose-invert"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                />
              )}

              {/* Action indicators */}
              {msg.metadata?.created_project && (
                <Link
                  href={`/project/${msg.metadata.created_project}`}
                  className="mt-2 flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg px-3 py-2 hover:bg-indigo-500/20 transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs text-indigo-300">Project created</span>
                  <ChevronRight className="w-3 h-3 text-indigo-400 ml-auto" />
                </Link>
              )}

              {msg.metadata?.created_items && msg.metadata.created_items.length > 0 && !msg.metadata.created_project && (
                <div className="mt-2 flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  <span className="text-xs text-green-300">
                    {msg.metadata.created_items.length} task{msg.metadata.created_items.length > 1 ? 's' : ''} created
                  </span>
                </div>
              )}

              {msg.metadata?.has_planning_page && (
                <div className="mt-1.5 flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 rounded-lg px-3 py-2">
                  <FileText className="w-4 h-4 text-purple-400" />
                  <span className="text-xs text-purple-300">Planning page created</span>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-900 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                <span className="text-sm text-gray-400">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div className="px-4 pb-2">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1">
            {attachments.map((att, i) => (
              <div key={i} className="relative flex-shrink-0">
                {att.type.startsWith('image/') ? (
                  <div className="relative">
                    <img
                      src={att.preview || att.url}
                      alt={att.name}
                      className="w-16 h-16 object-cover rounded-lg border border-gray-700"
                    />
                    <button
                      onClick={() => removeAttachment(i)}
                      className="absolute -top-1.5 -right-1.5 bg-gray-800 border border-gray-700 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3 text-gray-400" />
                    </button>
                  </div>
                ) : (
                  <div className="relative flex items-center gap-1.5 bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-2">
                    <FileText className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs text-gray-300 max-w-[80px] truncate">{att.name}</span>
                    <button
                      onClick={() => removeAttachment(i)}
                      className="ml-1 text-gray-500 hover:text-gray-300"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-4 pb-4 pt-2">
        <div className="flex items-end gap-2 bg-gray-900 border border-gray-800 rounded-2xl px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex-shrink-0 text-gray-400 hover:text-white p-1.5 transition-colors"
          >
            {uploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Paperclip className="w-5 h-5" />
            )}
          </button>

          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="What do you need to do?"
            rows={1}
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 resize-none focus:outline-none max-h-[120px] py-1.5"
          />

          <button
            onClick={handleSend}
            disabled={loading || (!input.trim() && attachments.length === 0)}
            className="flex-shrink-0 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:hover:bg-indigo-600 text-white p-2 rounded-xl transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
          className="hidden"
          onChange={(e) => handleFileUpload(e.target.files)}
        />

        <p className="text-[10px] text-gray-600 text-center mt-1.5">
          Paste screenshots or attach files. AI will create tasks & plans from your messages.
        </p>
      </div>
    </div>
  )
}
