'use client'

import { useState, useEffect, useRef } from 'react'
import { X, ChevronDown } from 'lucide-react'
import { createItem } from '@/lib/actions'
import { createClient } from '@/lib/supabase/client'
import type { Project } from '@/lib/types'

export function QuickAddModal({ onClose, defaultProjectId }: { onClose: () => void; defaultProjectId?: string }) {
  const [title, setTitle] = useState('')
  const [projectId, setProjectId] = useState(defaultProjectId || '')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState('none')
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [showProjects, setShowProjects] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    loadProjects()
  }, [])

  async function loadProjects() {
    const supabase = createClient()
    const { data } = await supabase
      .from('projects')
      .select('*, space:spaces(*)')
      .order('position')
    if (data) {
      setProjects(data)
      if (!defaultProjectId && data.length > 0) {
        setProjectId(data[0].id)
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !projectId) return
    setLoading(true)

    try {
      await createItem({
        project_id: projectId,
        title: title.trim(),
        priority,
        due_date: dueDate || undefined,
      })
      onClose()
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }

  const selectedProject = projects.find(p => p.id === projectId)

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-gray-900 rounded-t-2xl sm:rounded-2xl p-5 space-y-4 animate-slide-up">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Quick Add</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs to be done?"
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          <div className="flex gap-2 flex-wrap">
            {/* Project Picker */}
            <button
              type="button"
              onClick={() => setShowProjects(!showProjects)}
              className="flex items-center gap-1.5 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 hover:border-gray-600"
            >
              <span>{selectedProject ? `${selectedProject.emoji} ${selectedProject.name}` : 'Select project'}</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {/* Due Date */}
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            {/* Priority */}
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="none">No priority</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          {showProjects && (
            <div className="bg-gray-800 border border-gray-700 rounded-xl max-h-48 overflow-y-auto">
              {projects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => {
                    setProjectId(project.id)
                    setShowProjects(false)
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-700 transition-colors flex items-center gap-2 ${
                    projectId === project.id ? 'bg-gray-700 text-indigo-400' : 'text-gray-300'
                  }`}
                >
                  <span>{project.emoji}</span>
                  <span>{project.name}</span>
                  {project.space && (
                    <span className="text-gray-500 text-xs ml-auto">{(project.space as any).name}</span>
                  )}
                </button>
              ))}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !title.trim() || !projectId}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-colors"
          >
            {loading ? 'Adding...' : 'Add Item'}
          </button>
        </form>
      </div>
    </div>
  )
}
