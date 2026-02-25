'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, MoreHorizontal, Share2, Trash2, Check, Circle, GripVertical } from 'lucide-react'
import { createItem, toggleItem, deleteItem, updateItem, deleteProject } from '@/lib/actions'
import { ShareModal } from './share-modal'
import { ItemDetailModal } from './item-detail-modal'
import type { Project, Item, ProjectShare } from '@/lib/types'

const priorityColors: Record<string, string> = {
  urgent: 'border-red-400',
  high: 'border-orange-400',
  medium: 'border-yellow-400',
  low: 'border-blue-400',
  none: 'border-gray-600',
}

export function ProjectView({ project, items, shares, isOwner }: {
  project: Project
  items: Item[]
  shares: ProjectShare[]
  isOwner: boolean
}) {
  const router = useRouter()
  const [newTitle, setNewTitle] = useState('')
  const [showMenu, setShowMenu] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [optimisticDone, setOptimisticDone] = useState<Record<string, boolean>>({})

  const todoItems = items.filter(i => i.status !== 'done')
  const doneItems = items.filter(i => i.status === 'done')
  const isGrocery = project.type === 'grocery'

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    await createItem({
      project_id: project.id,
      title: newTitle.trim(),
    })
    setNewTitle('')
    router.refresh()
  }

  async function handleToggle(id: string) {
    setOptimisticDone(prev => ({ ...prev, [id]: !prev[id] }))
    await toggleItem(id)
    router.refresh()
  }

  async function handleDelete(id: string) {
    await deleteItem(id)
    router.refresh()
  }

  async function handleDeleteProject() {
    if (!confirm('Delete this project and all its items?')) return
    await deleteProject(project.id)
    router.push('/spaces')
  }

  return (
    <div className="px-4 pt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-white p-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <span>{project.emoji}</span>
              <span>{project.name}</span>
            </h1>
            {project.space && (
              <p className="text-xs text-gray-500">{(project.space as any).name}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isOwner && (
            <button onClick={() => setShowShare(true)} className="text-gray-400 hover:text-white p-2">
              <Share2 className="w-4.5 h-4.5" />
            </button>
          )}
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="text-gray-400 hover:text-white p-2">
              <MoreHorizontal className="w-4.5 h-4.5" />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-20 w-48 overflow-hidden">
                  {isOwner && (
                    <button
                      onClick={() => { handleDeleteProject(); setShowMenu(false) }}
                      className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-400 hover:bg-gray-700"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Project
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Progress */}
      {items.length > 0 && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>{doneItems.length} of {items.length} done</span>
            <span>{items.length > 0 ? Math.round((doneItems.length / items.length) * 100) : 0}%</span>
          </div>
          <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-300"
              style={{ width: `${items.length > 0 ? (doneItems.length / items.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Add Item */}
      <form onSubmit={handleAdd} className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder={isGrocery ? 'Add item...' : 'Add task...'}
            className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={!newTitle.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white px-3 rounded-xl transition-colors"
          >
            <Plus className="w-4.5 h-4.5" />
          </button>
        </div>
      </form>

      {/* Items */}
      <div className="space-y-1 mb-4">
        {todoItems.map((item) => {
          const isDone = optimisticDone[item.id]
          return (
            <div
              key={item.id}
              className="flex items-start gap-3 bg-gray-900/50 rounded-xl px-3 py-3 group"
            >
              <button
                onClick={() => handleToggle(item.id)}
                className={`mt-0.5 w-5 h-5 rounded-${isGrocery ? 'md' : 'full'} border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                  isDone ? 'bg-indigo-600 border-indigo-600' : priorityColors[item.priority]
                }`}
              >
                {isDone && <Check className="w-3 h-3 text-white" />}
              </button>
              <button
                onClick={() => setEditingItem(item)}
                className="flex-1 min-w-0 text-left"
              >
                <p className={`text-sm ${isDone ? 'text-gray-500 line-through' : 'text-white'}`}>
                  {item.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  {item.due_date && (
                    <span className="text-xs text-gray-500">{new Date(item.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  )}
                  {item.priority !== 'none' && (
                    <span className={`text-xs capitalize ${
                      item.priority === 'urgent' ? 'text-red-400' :
                      item.priority === 'high' ? 'text-orange-400' :
                      item.priority === 'medium' ? 'text-yellow-400' : 'text-blue-400'
                    }`}>{item.priority}</span>
                  )}
                  {item.tags.length > 0 && (
                    <span className="text-xs text-gray-500">{item.tags.join(', ')}</span>
                  )}
                </div>
              </button>
            </div>
          )
        })}
      </div>

      {/* Done Items */}
      {doneItems.length > 0 && (
        <details className="mb-8">
          <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-400 mb-2">
            Completed ({doneItems.length})
          </summary>
          <div className="space-y-1">
            {doneItems.map((item) => (
              <div key={item.id} className="flex items-center gap-3 px-3 py-2.5 group">
                <button
                  onClick={() => handleToggle(item.id)}
                  className="w-5 h-5 rounded-full bg-indigo-600/20 border-2 border-indigo-600/40 flex items-center justify-center flex-shrink-0"
                >
                  <Check className="w-3 h-3 text-indigo-400" />
                </button>
                <p className="text-sm text-gray-500 line-through flex-1">{item.title}</p>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </details>
      )}

      {items.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-sm">No items yet. Add one above!</p>
        </div>
      )}

      {/* Modals */}
      {showShare && (
        <ShareModal
          projectId={project.id}
          shares={shares}
          onClose={() => setShowShare(false)}
        />
      )}
      {editingItem && (
        <ItemDetailModal
          item={editingItem}
          onClose={() => { setEditingItem(null); router.refresh() }}
        />
      )}
    </div>
  )
}
