'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { getItemsByDate, toggleItem } from '@/lib/actions'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from 'date-fns'
import type { Item } from '@/lib/types'

const priorityColors: Record<string, string> = {
  urgent: 'bg-red-400',
  high: 'bg-orange-400',
  medium: 'bg-yellow-400',
  low: 'bg-blue-400',
  none: 'bg-indigo-400',
}

export function CalendarView() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadItems()
  }, [currentMonth])

  async function loadItems() {
    setLoading(true)
    const start = format(startOfWeek(startOfMonth(currentMonth)), 'yyyy-MM-dd')
    const end = format(endOfWeek(endOfMonth(currentMonth)), 'yyyy-MM-dd')
    try {
      const data = await getItemsByDate(start, end)
      setItems(data || [])
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart)
  const calendarEnd = endOfWeek(monthEnd)
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd')
  const selectedItems = items.filter(i => i.due_date === selectedDateStr)

  function getItemsForDay(date: Date) {
    const dateStr = format(date, 'yyyy-MM-dd')
    return items.filter(i => i.due_date === dateStr)
  }

  async function handleToggle(id: string) {
    await toggleItem(id)
    loadItems()
  }

  return (
    <div>
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="text-gray-400 hover:text-white p-2">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-base font-semibold text-white">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="text-gray-400 hover:text-white p-2">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 mb-1">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
          <div key={day} className="text-center text-xs text-gray-500 py-2 font-medium">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-px">
        {days.map((day) => {
          const dayItems = getItemsForDay(day)
          const isToday = isSameDay(day, new Date())
          const isSelected = isSameDay(day, selectedDate)
          const isCurrentMonth = isSameMonth(day, currentMonth)

          return (
            <button
              key={day.toISOString()}
              onClick={() => setSelectedDate(day)}
              className={`relative p-2 min-h-[44px] flex flex-col items-center rounded-lg transition-colors ${
                isSelected
                  ? 'bg-indigo-600/20 ring-1 ring-indigo-500'
                  : isToday
                  ? 'bg-gray-800'
                  : 'hover:bg-gray-900'
              }`}
            >
              <span className={`text-sm ${
                !isCurrentMonth
                  ? 'text-gray-700'
                  : isToday
                  ? 'text-indigo-400 font-bold'
                  : 'text-gray-300'
              }`}>
                {format(day, 'd')}
              </span>
              {dayItems.length > 0 && (
                <div className="flex gap-0.5 mt-1">
                  {dayItems.slice(0, 3).map((item, i) => (
                    <div
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full ${
                        item.status === 'done' ? 'bg-gray-600' : priorityColors[item.priority] || priorityColors.none
                      }`}
                    />
                  ))}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Selected Date Items */}
      <div className="mt-6">
        <h3 className="text-sm font-medium text-gray-400 mb-3">
          {format(selectedDate, 'EEEE, MMM d')}
          {selectedItems.length > 0 && ` (${selectedItems.length})`}
        </h3>

        {selectedItems.length === 0 ? (
          <p className="text-sm text-gray-600 py-4 text-center">Nothing scheduled</p>
        ) : (
          <div className="space-y-1">
            {selectedItems.map((item: any) => (
              <div key={item.id} className="flex items-center gap-3 bg-gray-900/50 rounded-xl px-3 py-2.5">
                <button
                  onClick={() => handleToggle(item.id)}
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    item.status === 'done'
                      ? 'bg-indigo-600 border-indigo-600'
                      : 'border-gray-600'
                  }`}
                >
                  {item.status === 'done' && <Check className="w-3 h-3 text-white" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${item.status === 'done' ? 'text-gray-500 line-through' : 'text-white'}`}>
                    {item.title}
                  </p>
                  {item.project && (
                    <p className="text-xs text-gray-500">
                      {item.project.emoji} {item.project.name}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
