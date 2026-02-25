'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Clock, Check, ChevronDown, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { TaskCard } from './task-card'
import type { Item, Project } from '@/lib/types'

type GroupedItems = {
  project: { id: string; name: string; emoji: string; spaceName?: string } | null
  items: Item[]
}

function groupByProject(items: Item[]): GroupedItems[] {
  const groups: Record<string, GroupedItems> = {}

  for (const item of items) {
    const proj = (item as any).project
    const key = proj?.id || 'none'

    if (!groups[key]) {
      groups[key] = {
        project: proj ? {
          id: proj.id,
          name: proj.name,
          emoji: proj.emoji,
          spaceName: proj.space?.name,
        } : null,
        items: [],
      }
    }
    groups[key].items.push(item)
  }

  return Object.values(groups).sort((a, b) => {
    if (!a.project) return 1
    if (!b.project) return -1
    return a.project.name.localeCompare(b.project.name)
  })
}

function ProjectGroup({ group, defaultExpanded = true }: { group: GroupedItems; defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  return (
    <div className="mb-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-1 py-2 hover:bg-gray-900/30 rounded-lg transition-colors group"
      >
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
        )}
        {group.project ? (
          <>
            <span className="text-sm">{group.project.emoji}</span>
            <Link
              href={`/project/${group.project.id}`}
              onClick={(e) => e.stopPropagation()}
              className="text-sm font-medium text-gray-200 hover:text-white truncate"
            >
              {group.project.name}
            </Link>
            {group.project.spaceName && (
              <span className="text-[10px] text-gray-600">{group.project.spaceName}</span>
            )}
          </>
        ) : (
          <span className="text-sm font-medium text-gray-400">No Project</span>
        )}
        <span className="text-[10px] text-gray-600 ml-auto">{group.items.length}</span>
      </button>

      {expanded && (
        <div className="space-y-1.5 mt-1 ml-1">
          {group.items.map(item => (
            <TaskCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}

export function TodayView({ items, projects }: { items: Item[]; projects: Project[] }) {
  const overdue = items.filter(i => i.due_date && i.due_date < new Date().toISOString().split('T')[0] && i.status !== 'done')
  const today = items.filter(i => i.due_date === new Date().toISOString().split('T')[0] && i.status !== 'done')
  const done = items.filter(i => i.status === 'done')

  const overdueGroups = groupByProject(overdue)
  const todayGroups = groupByProject(today)
  const doneGroups = groupByProject(done)

  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-3">🎉</div>
        <p className="text-gray-400">Nothing due today!</p>
        <p className="text-gray-500 text-sm mt-1">Tap + to add something</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {overdueGroups.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-2 px-1">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <h2 className="text-sm font-medium text-red-400">Overdue ({overdue.length})</h2>
          </div>
          {overdueGroups.map((group, i) => (
            <ProjectGroup key={group.project?.id || `none-${i}`} group={group} />
          ))}
        </section>
      )}

      {todayGroups.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-2 px-1">
            <Clock className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-medium text-gray-300">Due Today ({today.length})</h2>
          </div>
          {todayGroups.map((group, i) => (
            <ProjectGroup key={group.project?.id || `none-${i}`} group={group} />
          ))}
        </section>
      )}

      {doneGroups.length > 0 && (
        <details className="mt-2">
          <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400 mb-2 flex items-center gap-1.5 px-1">
            <Check className="w-3 h-3" />
            Completed ({done.length})
          </summary>
          {doneGroups.map((group, i) => (
            <ProjectGroup key={group.project?.id || `none-${i}`} group={group} defaultExpanded={false} />
          ))}
        </details>
      )}
    </div>
  )
}
