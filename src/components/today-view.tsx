'use client'

import { useState } from 'react'
import { toggleItem, updateItem } from '@/lib/actions'
import { useRouter } from 'next/navigation'
import { Check, Circle, AlertCircle, Clock } from 'lucide-react'
import Link from 'next/link'
import type { Item, Project } from '@/lib/types'

const priorityColors: Record<string, string> = {
  urgent: 'text-red-400 border-red-400',
  high: 'text-orange-400 border-orange-400',
  medium: 'text-yellow-400 border-yellow-400',
  low: 'text-blue-400 border-blue-400',
  none: 'text-gray-500 border-gray-600',
}

export function TodayView({ items, projects }: { items: Item[]; projects: Project[] }) {
  const router = useRouter()
  const [optimistic, setOptimistic] = useState<Record<string, boolean>>({})

  const overdue = items.filter(i => i.due_date && i.due_date < new Date().toISOString().split('T')[0] && i.status !== 'done')
  const today = items.filter(i => i.due_date === new Date().toISOString().split('T')[0] && i.status !== 'done')
  const done = items.filter(i => i.status === 'done')

  async function handleToggle(id: string) {
    setOptimistic(prev => ({ ...prev, [id]: true }))
    await toggleItem(id)
    router.refresh()
  }

  function ItemRow({ item }: { item: Item }) {
    const isDone = item.status === 'done' || optimistic[item.id]
    const project = item.project as any

    return (
      <div className="flex items-start gap-3 py-3 px-1 group">
        <button
          onClick={() => handleToggle(item.id)}
          className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
            isDone
              ? 'bg-indigo-600 border-indigo-600'
              : priorityColors[item.priority] || priorityColors.none
          }`}
        >
          {isDone && <Check className="w-3 h-3 text-white" />}
        </button>
        <div className="flex-1 min-w-0">
          <Link href={`/project/${item.project_id}`}>
            <p className={`text-sm ${isDone ? 'text-gray-500 line-through' : 'text-white'}`}>
              {item.title}
            </p>
          </Link>
          {project && (
            <p className="text-xs text-gray-500 mt-0.5">
              {project.emoji} {project.name}
              {project.space && ` · ${project.space.name}`}
            </p>
          )}
        </div>
      </div>
    )
  }

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
      {overdue.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <h2 className="text-sm font-medium text-red-400">Overdue ({overdue.length})</h2>
          </div>
          <div className="bg-gray-900/50 rounded-xl divide-y divide-gray-800/50 px-3">
            {overdue.map(item => <ItemRow key={item.id} item={item} />)}
          </div>
        </section>
      )}

      {today.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-medium text-gray-300">Due Today ({today.length})</h2>
          </div>
          <div className="bg-gray-900/50 rounded-xl divide-y divide-gray-800/50 px-3">
            {today.map(item => <ItemRow key={item.id} item={item} />)}
          </div>
        </section>
      )}

      {done.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-2">
            <Check className="w-4 h-4 text-green-400" />
            <h2 className="text-sm font-medium text-gray-500">Done ({done.length})</h2>
          </div>
          <div className="bg-gray-900/50 rounded-xl divide-y divide-gray-800/50 px-3">
            {done.map(item => <ItemRow key={item.id} item={item} />)}
          </div>
        </section>
      )}
    </div>
  )
}
