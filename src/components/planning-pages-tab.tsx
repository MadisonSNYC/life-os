'use client'

import { useState } from 'react'
import { FileText, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'

type PlanningPage = {
  id: string
  title: string
  content: string
  content_type: string
  created_at: string
}

function renderMarkdown(text: string) {
  let html = text
    // Tables
    .replace(/^\|(.+)\|$/gm, (match) => {
      return match
    })
    // Code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-gray-800/80 rounded-lg p-3 my-2 text-xs overflow-x-auto border border-gray-700/50"><code>$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-gray-800 px-1.5 py-0.5 rounded text-xs">$1</code>')
    // Headers
    .replace(/^#### (.+)$/gm, '<h4 class="text-xs font-semibold text-gray-300 mt-3 mb-1">$1</h4>')
    .replace(/^### (.+)$/gm, '<h3 class="text-sm font-semibold text-white mt-4 mb-1.5">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-base font-semibold text-white mt-5 mb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-lg font-bold text-white mt-5 mb-2">$1</h1>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Bullet lists
    .replace(/^[*-] (.+)$/gm, '<li class="ml-4 list-disc text-sm leading-relaxed">$1</li>')
    // Numbered lists
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal text-sm leading-relaxed">$1</li>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-indigo-400 hover:underline">$1</a>')
    // Horizontal rules
    .replace(/^---$/gm, '<hr class="border-gray-800 my-4" />')
    // Line breaks
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>')

  // Simple table rendering
  const tableRegex = /(\|.+\|(\r?\n)?)+/g
  html = html.replace(tableRegex, (match) => {
    const rows = match.trim().split('<br/>').filter(r => r.trim().startsWith('|'))
    if (rows.length < 2) return match

    let tableHtml = '<div class="overflow-x-auto my-3"><table class="w-full text-xs border-collapse">'

    rows.forEach((row, i) => {
      const cells = row.split('|').filter(c => c.trim())
      // Skip separator row
      if (cells.every(c => c.trim().match(/^[-:]+$/))) return

      const tag = i === 0 ? 'th' : 'td'
      const cellClass = i === 0
        ? 'px-3 py-2 text-left text-gray-400 font-medium border-b border-gray-700 bg-gray-800/50'
        : 'px-3 py-2 text-left text-gray-300 border-b border-gray-800/50'

      tableHtml += '<tr>'
      cells.forEach(cell => {
        tableHtml += `<${tag} class="${cellClass}">${cell.trim()}</${tag}>`
      })
      tableHtml += '</tr>'
    })

    tableHtml += '</table></div>'
    return tableHtml
  })

  return html
}

export function PlanningPagesTab({ pages, projectId }: { pages: PlanningPage[]; projectId: string }) {
  const [expandedPage, setExpandedPage] = useState<string | null>(pages.length === 1 ? pages[0]?.id : null)

  if (pages.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-8 h-8 text-gray-700 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">No planning pages yet</p>
        <p className="text-gray-600 text-xs mt-1">Use the Chat tab to create research and planning docs</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 py-3">
      {pages.map((page) => {
        const isExpanded = expandedPage === page.id
        return (
          <div key={page.id} className="bg-gray-900/80 border border-gray-800/50 rounded-xl overflow-hidden">
            <button
              onClick={() => setExpandedPage(isExpanded ? null : page.id)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800/30 transition-colors"
            >
              <FileText className="w-4 h-4 text-purple-400 flex-shrink-0" />
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium text-white truncate">{page.title}</p>
                <p className="text-[10px] text-gray-500">
                  {new Date(page.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </p>
              </div>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-gray-500 flex-shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
              )}
            </button>

            {isExpanded && (
              <div className="px-4 pb-4 border-t border-gray-800/50">
                <div
                  className="prose-invert text-sm text-gray-300 leading-relaxed pt-3"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(page.content) }}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
