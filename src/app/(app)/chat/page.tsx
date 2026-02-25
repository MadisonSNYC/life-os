import { createClient } from '@/lib/supabase/server'
import { ChatPageWrapper } from '@/components/chat-page-wrapper'

export default async function ChatPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Fetch all global threads (no project)
  const { data: threads } = await supabase
    .from('chat_threads')
    .select('*')
    .eq('user_id', user.id)
    .is('project_id', null)
    .order('updated_at', { ascending: false })

  // Load most recent thread's messages if any
  let initialMessages: any[] = []
  let initialThreadId: string | null = null

  if (threads && threads.length > 0) {
    initialThreadId = threads[0].id
    const { data: messages } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('thread_id', initialThreadId)
      .order('created_at', { ascending: true })
    initialMessages = messages || []
  }

  // Add last_message preview to threads
  const threadsWithPreview = await Promise.all(
    (threads || []).map(async (thread) => {
      const { data: lastMsg } = await supabase
        .from('chat_messages')
        .select('content')
        .eq('thread_id', thread.id)
        .eq('role', 'user')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      return {
        ...thread,
        last_message: lastMsg?.content?.substring(0, 60) || '',
      }
    })
  )

  return (
    <ChatPageWrapper
      initialThreads={threadsWithPreview}
      initialMessages={initialMessages}
      initialThreadId={initialThreadId}
    />
  )
}
