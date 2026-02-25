import { getProject, getItems, getProjectShares } from '@/lib/actions'
import { createClient } from '@/lib/supabase/server'
import { ProjectView } from '@/components/project-view'
import { notFound } from 'next/navigation'

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) notFound()

    const [project, items, shares] = await Promise.all([
      getProject(id),
      getItems(id),
      getProjectShares(id).catch(() => []),
    ])

    if (!project) notFound()

    // Fetch planning pages
    const { data: planningPages } = await supabase
      .from('planning_pages')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: false })

    // Fetch chat messages for this project
    const { data: chatMessages } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('project_id', id)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(50)

    const isOwner = project.owner_id === user.id

    return (
      <ProjectView
        project={project}
        items={items || []}
        shares={shares || []}
        isOwner={isOwner}
        planningPages={planningPages || []}
        chatMessages={chatMessages || []}
      />
    )
  } catch {
    notFound()
  }
}
