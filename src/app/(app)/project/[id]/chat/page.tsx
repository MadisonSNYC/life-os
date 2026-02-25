import { createClient } from '@/lib/supabase/server'
import { ChatPageWrapper } from '@/components/chat-page-wrapper'
import { getProject } from '@/lib/actions'
import { notFound } from 'next/navigation'

export default async function ProjectChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  try {
    const project = await getProject(id)
    if (!project) notFound()

    // Fetch threads for this project
    const { data: threads } = await supabase
      .from('chat_threads')
      .select('*')
      .eq('user_id', user.id)
      .eq('project_id', id)
      .order('updated_at', { ascending: false })

    // Load most recent thread
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
      <div>
        <div className="px-4 pt-4 pb-2 border-b border-gray-800/50">
          <p className="text-sm text-gray-400">{project.emoji} {project.name}</p>
        </div>
        <ChatPageWrapper
          initialThreads={threadsWithPreview}
          initialMessages={initialMessages}
          initialThreadId={initialThreadId}
          projectId={id}
        />
      </div>
    )
  } catch {
    notFound()
  }
}
