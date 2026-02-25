import { getProject, getItems, getProjectShares } from '@/lib/actions'
import { createClient } from '@/lib/supabase/server'
import { ProjectView } from '@/components/project-view'
import { notFound } from 'next/navigation'

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  try {
    const [project, items, shares] = await Promise.all([
      getProject(id),
      getItems(id),
      getProjectShares(id).catch(() => []),
    ])

    if (!project) notFound()

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const isOwner = project.owner_id === user?.id

    return (
      <ProjectView
        project={project}
        items={items || []}
        shares={shares || []}
        isOwner={isOwner}
      />
    )
  } catch {
    notFound()
  }
}
