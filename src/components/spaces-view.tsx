'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, ChevronRight, ChevronDown, Users } from 'lucide-react'
import { createSpace, createProject } from '@/lib/actions'
import { useRouter } from 'next/navigation'
import type { Space, Project } from '@/lib/types'

const PROJECT_TYPES = [
  { value: 'standard', label: 'Tasks', emoji: '📋' },
  { value: 'grocery', label: 'Grocery List', emoji: '🛒' },
  { value: 'workout', label: 'Workout', emoji: '💪' },
  { value: 'recipe', label: 'Recipes', emoji: '🍳' },
  { value: 'planning', label: 'Planning', emoji: '🎯' },
]

const DEFAULT_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f43f5e', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6']
const DEFAULT_EMOJIS = ['📁', '💼', '🏠', '💪', '🎉', '📚', '🎨', '🧹', '🎵', '✈️']

export function SpacesView({ spaces, projects, sharedProjects }: {
  spaces: Space[]
  projects: Project[]
  sharedProjects: Project[]
}) {
  const router = useRouter()
  const [showNewSpace, setShowNewSpace] = useState(false)
  const [showNewProject, setShowNewProject] = useState<string | null>(null)
  const [newSpaceName, setNewSpaceName] = useState('')
  const [newSpaceEmoji, setNewSpaceEmoji] = useState('📁')
  const [newSpaceColor, setNewSpaceColor] = useState('#6366f1')
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectType, setNewProjectType] = useState('standard')
  const [newProjectEmoji, setNewProjectEmoji] = useState('📋')
  const [expandedSpaces, setExpandedSpaces] = useState<Record<string, boolean>>({})

  async function handleCreateSpace(e: React.FormEvent) {
    e.preventDefault()
    if (!newSpaceName.trim()) return
    await createSpace({ name: newSpaceName.trim(), emoji: newSpaceEmoji, color: newSpaceColor })
    setNewSpaceName('')
    setShowNewSpace(false)
    router.refresh()
  }

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault()
    if (!newProjectName.trim() || !showNewProject) return
    await createProject({
      space_id: showNewProject,
      name: newProjectName.trim(),
      emoji: newProjectEmoji,
      type: newProjectType,
    })
    setNewProjectName('')
    setShowNewProject(null)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {spaces.map((space) => {
        const spaceProjects = projects.filter(p => p.space_id === space.id)
        const isExpanded = expandedSpaces[space.id] !== false // default expanded
        return (
          <section key={space.id}>
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => setExpandedSpaces(prev => ({ ...prev, [space.id]: !isExpanded }))}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                )}
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                  <span>{space.emoji}</span>
                  <span>{space.name}</span>
                  <span className="text-xs text-gray-500 font-normal">({spaceProjects.length})</span>
                </h2>
              </button>
              <button
                onClick={() => {
                  setShowNewProject(space.id)
                  setNewProjectEmoji('📋')
                  setNewProjectType('standard')
                  setExpandedSpaces(prev => ({ ...prev, [space.id]: true }))
                }}
                className="text-gray-400 hover:text-white p-1"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {isExpanded && (
              <>
                {showNewProject === space.id && (
                  <form onSubmit={handleCreateProject} className="bg-gray-900 rounded-xl p-4 mb-3 space-y-3">
                    <input
                      autoFocus
                      type="text"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      placeholder="Project name"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <div className="flex gap-2 flex-wrap">
                      {PROJECT_TYPES.map(t => (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => {
                            setNewProjectType(t.value)
                            setNewProjectEmoji(t.emoji)
                          }}
                          className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                            newProjectType === t.value
                              ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
                              : 'border-gray-700 text-gray-400'
                          }`}
                        >
                          {t.emoji} {t.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-500">
                        Create
                      </button>
                      <button type="button" onClick={() => setShowNewProject(null)} className="text-gray-400 text-sm px-4 py-2">
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                <div className="space-y-1">
                  {spaceProjects.map((project) => (
                    <Link
                      key={project.id}
                      href={`/project/${project.id}`}
                      className="flex items-center gap-3 bg-gray-900/50 hover:bg-gray-900 rounded-xl px-4 py-3 transition-colors group"
                    >
                      <span className="text-lg">{project.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{project.name}</p>
                        <p className="text-xs text-gray-500 capitalize">{project.type}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400" />
                    </Link>
                  ))}
                  {spaceProjects.length === 0 && !showNewProject && (
                    <button
                      onClick={() => setShowNewProject(space.id)}
                      className="w-full text-center py-4 text-sm text-gray-500 hover:text-gray-400"
                    >
                      + Add a project
                    </button>
                  )}
                </div>
              </>
            )}
          </section>
        )
      })}

      {/* Shared Projects */}
      {sharedProjects.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-gray-400" />
            <h2 className="text-base font-semibold text-white">Shared with me</h2>
          </div>
          <div className="space-y-1">
            {sharedProjects.map((project: any) => (
              <Link
                key={project.id}
                href={`/project/${project.id}`}
                className="flex items-center gap-3 bg-gray-900/50 hover:bg-gray-900 rounded-xl px-4 py-3 transition-colors"
              >
                <span className="text-lg">{project.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{project.name}</p>
                  <p className="text-xs text-gray-500">Shared</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Add Space Button */}
      {!showNewSpace ? (
        <button
          onClick={() => setShowNewSpace(true)}
          className="w-full flex items-center justify-center gap-2 py-3 text-sm text-gray-500 hover:text-gray-300 border border-dashed border-gray-800 rounded-xl hover:border-gray-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Space
        </button>
      ) : (
        <form onSubmit={handleCreateSpace} className="bg-gray-900 rounded-xl p-4 space-y-3">
          <input
            autoFocus
            type="text"
            value={newSpaceName}
            onChange={(e) => setNewSpaceName(e.target.value)}
            placeholder="Space name"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="flex gap-1.5 flex-wrap">
            {DEFAULT_EMOJIS.map(e => (
              <button
                key={e}
                type="button"
                onClick={() => setNewSpaceEmoji(e)}
                className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg ${
                  newSpaceEmoji === e ? 'bg-gray-700 ring-2 ring-indigo-500' : 'hover:bg-gray-800'
                }`}
              >
                {e}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5">
            {DEFAULT_COLORS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setNewSpaceColor(c)}
                className={`w-7 h-7 rounded-full ${newSpaceColor === c ? 'ring-2 ring-offset-2 ring-offset-gray-900 ring-indigo-500' : ''}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-500">
              Create
            </button>
            <button type="button" onClick={() => setShowNewSpace(false)} className="text-gray-400 text-sm px-4 py-2">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
