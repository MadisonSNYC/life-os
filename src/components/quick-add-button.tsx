'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { QuickAddModal } from './quick-add-modal'

export function QuickAddButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-50 w-14 h-14 bg-indigo-600 hover:bg-indigo-500 rounded-full shadow-lg shadow-indigo-500/25 flex items-center justify-center transition-all active:scale-95"
      >
        <Plus className="w-6 h-6 text-white" />
      </button>
      {open && <QuickAddModal onClose={() => setOpen(false)} />}
    </>
  )
}
