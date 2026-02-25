'use client'

import { useState, useRef } from 'react'
import { Check, Trash2, ChevronDown, ChevronUp, Calendar, Flag, Tag, FileText, Clock } from 'lucide-react'
import { toggleItem, updateItem, deleteItem } from '@/lib/actions'
import { useRouter } from 'next/navigation'
import type { Item } from '@/lib/types'

const priorityConfig: Record<string, { color: string; bg: string; label: string }> = {
  urgent: { color: 'text-red-400', bg: 'bg-red-400', label: 'Urgent' },
  high: { color: 'text-orange-400', bg: 'bg-orange-400', label: 'High' },
  medium: { color: 'text-yellow-400', bg: 'bg-yellow-400', label: 'Medium' },
  low: { color: 'text-blue-400', bg: 'bg-blue-400', label: 'Low' },
  none: { color: 'text-gray-600', bg: 'bg-gray-600', label: '' },
}

const statusOptions = [
  { value: 'todo', label: 'To Do', color: 'bg-gray-500' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-indigo-500' },
  { value: 'done', label: 'Done', color: 'bg-green-500' },
]

export function TaskCard({ item, isGrocery }: { item: Item; isGrocery?: boolean }) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const [swiping, setSwiping] = useState(false)
  const [swipeX, setSwipeX] = useState(0)
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(item.title)
  const [notes, setNotes] = useState(item.notes || '')
  const [priority, setPriority] = useState(item.priority)
  const [dueDate, setDueDate] = useState(item.due_date || '')
  const [tags, setTags] = useState(item.tags.join(', '))
  const [status, setStatus] = useState(item.status)
  const [saving, setSaving] = useState(false)
  const [optimisticDone, setOptimisticDone] = useState(false)
  const startX = useRef(0)
  const startY = useRef(0)
  const isDragging = useRef(false)

  const isDone = item.status === 'done' || optimisticDone
  const p = priorityConfig[item.priority] || priorityConfig.none

  // Swipe handlers
  function handleTouchStart(e: React.TouchEvent) {
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
    isDragging.current = false
  }

  function handleTouchMove(e: React.TouchEvent) {
    const dx = e.touches[0].clientX - startX.current
    const dy = e.touches[0].clientY - startY.current

    // Determine if horizontal swipe
    if (!isDragging.current && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
      isDragging.current = true
      setSwiping(true)
    }

    if (isDragging.current) {
      // Clamp swipe distance
      const clamped = Math.max(-100, Math.min(100, dx))
      setSwipeX(clamped)
    }
  }

  async function handleTouchEnd() {
    if (swipeX > 60) {
      // Swipe right → toggle complete
      setOptimisticDone(!isDone)
      await toggleItem(item.id)
      router.refresh()
    } else if (swipeX < -60) {
      // Swipe left → delete
      await deleteItem(item.id)
      router.refresh()
    }
    setSwipeX(0)
    setSwiping(false)
    isDragging.current = false
  }

  async function handleToggle(e: React.MouseEvent) {
    e.stopPropagation()
    setOptimisticDone(!isDone)
    await toggleItem(item.id)
    router.refresh()
  }

  async function handleSave() {
    setSaving(true)
    await updateItem(item.id, {
      title: title.trim(),
      notes: notes.trim() || null,
      priority,
      due_date: dueDate || null,
      status,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
    })
    setSaving(false)
    setEditing(false)
    router.refresh()
  }

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    await deleteItem(item.id)
    router.refresh()
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr + 'T00:00:00')
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date.getTime() === today.getTime()) return 'Today'
    if (date.getTime() === tomorrow.getTime()) return 'Tomorrow'
    if (date < today) return 'Overdue'
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  function isOverdue() {
    if (!item.due_date || isDone) return false
    const today = new Date().toISOString().split('T')[0]
    return item.due_date < today
  }

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Swipe background indicators */}
      {swiping && (
        <>
          {/* Right swipe = complete */}
          <div className={`absolute inset-y-0 left-0 flex items-center px-4 transition-opacity ${
            swipeX > 30 ? 'opacity-100' : 'opacity-0'
          }`}>
            <div className="flex items-center gap-2 text-green-400">
              <Check className="w-5 h-5" />
              <span className="text-sm font-medium">Done</span>
            </div>
          </div>
          {/* Left swipe = delete */}
          <div className={`absolute inset-y-0 right-0 flex items-center px-4 transition-opacity ${
            swipeX < -30 ? 'opacity-100' : 'opacity-0'
          }`}>
            <div className="flex items-center gap-2 text-red-400">
              <span className="text-sm font-medium">Delete</span>
              <Trash2 className="w-5 h-5" />
            </div>
          </div>
        </>
      )}

      {/* Card content */}
      <div
        className={`relative bg-gray-900/80 border border-gray-800/50 rounded-xl transition-all ${
          expanded ? 'ring-1 ring-indigo-500/30' : ''
        } ${isDone ? 'opacity-60' : ''}`}
        style={{ transform: `translateX(${swipeX}px)`, transition: swiping ? 'none' : 'transform 0.3s ease' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Main row */}
        <div
          className="flex items-start gap-3 px-3.5 py-3 cursor-pointer"
          onClick={() => !isDragging.current && setExpanded(!expanded)}
        >
          {/* Check circle */}
          <button
            onClick={handleToggle}
            className={`mt-0.5 w-5 h-5 rounded-${isGrocery ? 'md' : 'full'} border-2 flex items-center justify-center flex-shrink-0 transition-all ${
              isDone
                ? 'bg-green-500 border-green-500'
                : `border-current ${p.color}`
            }`}
          >
            {isDone && <Check className="w-3 h-3 text-white" />}
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${isDone ? 'text-gray-500 line-through' : 'text-white'}`}>
              {item.title}
            </p>

            {/* Metadata row */}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {/* Priority pill */}
              {item.priority !== 'none' && (
                <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${p.color} bg-current/10`}
                  style={{ backgroundColor: `${p.bg.replace('bg-', '')}15` }}
                >
                  <Flag className="w-2.5 h-2.5" />
                  {p.label}
                </span>
              )}

              {/* Due date */}
              {item.due_date && (
                <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${
                  isOverdue()
                    ? 'text-red-400 bg-red-400/10'
                    : 'text-gray-400 bg-gray-800'
                }`}>
                  <Calendar className="w-2.5 h-2.5" />
                  {formatDate(item.due_date)}
                </span>
              )}

              {/* Status pill (if in progress) */}
              {item.status === 'in_progress' && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full text-indigo-400 bg-indigo-400/10">
                  <Clock className="w-2.5 h-2.5" />
                  In Progress
                </span>
              )}

              {/* Tags */}
              {item.tags.map((tag) => (
                <span key={tag} className="text-[10px] font-medium px-2 py-0.5 rounded-full text-purple-400 bg-purple-400/10">
                  {tag}
                </span>
              ))}

              {/* Notes indicator */}
              {item.notes && !expanded && (
                <span className="text-gray-600">
                  <FileText className="w-3 h-3" />
                </span>
              )}
            </div>

            {/* Notes preview (collapsed) */}
            {item.notes && !expanded && (
              <p className="text-xs text-gray-500 mt-1 line-clamp-1">{item.notes}</p>
            )}
          </div>

          {/* Expand indicator */}
          <button className="text-gray-600 mt-1 flex-shrink-0">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Expanded edit area */}
        {expanded && (
          <div className="px-3.5 pb-3.5 pt-1 border-t border-gray-800/50 space-y-3">
            {/* Title */}
            <input
              type="text"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setEditing(true) }}
              className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />

            {/* Notes */}
            <textarea
              value={notes}
              onChange={(e) => { setNotes(e.target.value); setEditing(true) }}
              rows={2}
              placeholder="Add notes..."
              className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
            />

            {/* Status + Priority row */}
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-[10px] text-gray-500 mb-1 uppercase tracking-wider">Status</label>
                <div className="flex gap-1">
                  {statusOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => { setStatus(opt.value as any); setEditing(true) }}
                      className={`flex-1 text-[10px] font-medium py-1.5 rounded-lg border transition-all ${
                        status === opt.value
                          ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
                          : 'border-gray-700/50 text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Priority selector */}
            <div>
              <label className="block text-[10px] text-gray-500 mb-1 uppercase tracking-wider">Priority</label>
              <div className="flex gap-1">
                {(['none', 'low', 'medium', 'high', 'urgent'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => { setPriority(p); setEditing(true) }}
                    className={`flex-1 text-[10px] font-medium py-1.5 rounded-lg border transition-all capitalize ${
                      priority === p
                        ? `border-current ${priorityConfig[p].color} bg-current/5`
                        : 'border-gray-700/50 text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {p === 'none' ? 'None' : p}
                  </button>
                ))}
              </div>
            </div>

            {/* Due date + Tags */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-gray-500 mb-1 uppercase tracking-wider">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => { setDueDate(e.target.value); setEditing(true) }}
                  className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 mb-1 uppercase tracking-wider">Tags</label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => { setTags(e.target.value); setEditing(true) }}
                  placeholder="tag1, tag2"
                  className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-1">
              {editing && (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium py-2 rounded-lg transition-colors"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              )}
              <button
                onClick={handleDelete}
                className="px-3 py-2 text-xs text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
