import { getTodayItems, getSpaces, getAllProjects } from '@/lib/actions'
import { TodayView } from '@/components/today-view'

export default async function DashboardPage() {
  const [todayItems, spaces, { ownProjects }] = await Promise.all([
    getTodayItems(),
    getSpaces(),
    getAllProjects(),
  ])

  return (
    <div className="px-4 pt-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Today</h1>
        <p className="text-gray-400 text-sm mt-0.5">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>
      <TodayView items={todayItems || []} projects={ownProjects} />
    </div>
  )
}
