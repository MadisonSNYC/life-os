'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, MoreHorizontal, Share2, Trash2, MessageSquare, ListTodo, FileText, Check } from 'lucide-react'
import { createItem, deleteProject } from '@/lib/actions'
import { ShareModal } from './share-modal'
import { TaskCard } from './task-card'
import { PlanningPagesTab } from './planning-pages-tab'
import { ChatInterface } from './chat-interface'
import type { Project, Item, ProjectShare } from '@/lib/types'

type Tab = 'tasks' | 'pages' | 'chat'

export function ProjectView({ project, items, shares, isOwner, planningPages, chatMessages }: {
  project: Project
  items: Item[]
  shares: ProjectShare[]
  isOwner: boolean
  planningPages?: any[]
  chatMessages?: any[]
}) {
  const router = useRouter()
  const [newTitle, setNewTitle] = useState('')
  const [showMenu, setShowMenu] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('tasks')

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

  async function handleDeleteProject() {
    if (!confirm('Delete this project and all its items?')) return
    await deleteProject(project.id)
    router.push('/spaces')
  }

  const tabs: { key: Tab; label: string; icon: any; count?: number }[] = [
    { key: 'tasks', label: 'Tasks', icon: ListTodo, count: todoItems.length },
    { key: 'pages', label: 'Pages', icon: FileText, count: planningPages?.length || 0 },
    { key: 'chat', label: 'Chat', icon: MessageSquare },
  ]

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)]">
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="text-gray-400 hover:text-white p-1">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-white flex items-center gap-2">
                <span>{project.emoji}</span>
                <span className="truncate max-w-[200px]">{project.name}</span>
              </h1>
              {project.space && (
                <p className="text-[11px] text-gray-500">{(project.space as any).name}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            {isOwner && (
              <button onClick={() => setShowShare(true)} className="text-gray-400 hover:text-white p-2">
                <Share2 className="w-4 h-4" />
              </button>
            )}
            <div className="relative">
              <button onClick={() => setShowMenu(!showMenu)} className="text-gray-400 hover:text-white p-2">
                <MoreHorizontal className="w-4 h-4" />
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

        {/* Progress bar */}
        {items.length > 0 && (
          <div className="mb-3">
            <div className="flex justify-between text-[10px] text-gray-500 mb-1">
              <span>{doneItems.length} of {items.length} done</span>
              <span>{Math.round((doneItems.length / items.length) * 100)}%</span>
            </div>
            <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${(doneItems.length / items.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-900/50 rounded-xl p-1">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-gray-800 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.key ? 'bg-indigo-500/20 text-indigo-300' : 'bg-gray-800 text-gray-500'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {/* Tasks tab */}
        {activeTab === 'tasks' && (
          <div className="h-full overflow-y-auto px-4 pb-4 scrollbar-hide">
            {/* Add Item */}
            <form onSubmit={handleAdd} className="my-3">
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
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </form>

            {/* Task cards */}
            <div className="space-y-2">
              {todoItems.map((item) => (
                <TaskCard key={item.id} item={item} isGrocery={isGrocery} />
              ))}
            </div>

            {/* Done items */}
            {doneItems.length > 0 && (
              <details className="mt-4">
                <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400 mb-2 flex items-center gap-1.5">
                  <Check className="w-3 h-3" />
                  Completed ({doneItems.length})
                </summary>
                <div className="space-y-2">
                  {doneItems.map((item) => (
                    <TaskCard key={item.id} item={item} isGrocery={isGrocery} />
                  ))}
                </div>
              </details>
            )}

            {items.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500 text-sm">No items yet. Add one above!</p>
              </div>
            )}
          </div>
        )}

        {/* Pages tab */}
        {activeTab === 'pages' && (
          <div className="h-full overflow-y-auto px-4 pb-4 scrollbar-hide">
            <PlanningPagesTab pages={planningPages || []} projectId={project.id} />
          </div>
        )}

        {/* Chat tab */}
        {activeTab === 'chat' && (
          <ChatInterface projectId={project.id} initialMessages={chatMessages || []} threadId={null} />
        )}
      </div>

      {/* Modals */}
      {showShare && (
        <ShareModal
          projectId={project.id}
          shares={shares}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  )
}
