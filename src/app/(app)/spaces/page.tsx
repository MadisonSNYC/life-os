import { getSpaces, getAllProjects } from '@/lib/actions'
import { SpacesView } from '@/components/spaces-view'

export default async function SpacesPage() {
  const [spaces, { ownProjects, sharedProjects }] = await Promise.all([
    getSpaces(),
    getAllProjects(),
  ])

  return (
    <div className="px-4 pt-6">
      <h1 className="text-2xl font-bold text-white mb-6">Spaces</h1>
      <SpacesView spaces={spaces || []} projects={ownProjects} sharedProjects={sharedProjects} />
    </div>
  )
}
