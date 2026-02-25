import * as XLSX from 'xlsx'

/**
 * Parses file content from a URL into text that Claude can understand.
 * Supports: xlsx, csv, tsv, txt, json, pdf
 */
export async function parseFileToText(url: string, mimeType: string, fileName: string): Promise<string> {
  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Failed to fetch file: ${response.status}`)

    // Excel / CSV / TSV files
    if (
      mimeType.includes('spreadsheet') ||
      mimeType.includes('excel') ||
      mimeType === 'text/csv' ||
      mimeType === 'text/tab-separated-values' ||
      fileName.endsWith('.xlsx') ||
      fileName.endsWith('.xls') ||
      fileName.endsWith('.csv') ||
      fileName.endsWith('.tsv')
    ) {
      return await parseSpreadsheet(response)
    }

    // PDF files
    if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
      return await parsePDF(response)
    }

    // Plain text, JSON, markdown, code files
    if (
      mimeType.startsWith('text/') ||
      mimeType === 'application/json' ||
      fileName.endsWith('.json') ||
      fileName.endsWith('.md') ||
      fileName.endsWith('.txt')
    ) {
      const text = await response.text()
      return `[File: ${fileName}]\n\n${text}`
    }

    // Word docs — extract what we can
    if (
      mimeType.includes('wordprocessingml') ||
      fileName.endsWith('.docx')
    ) {
      // docx is a zip of XML — basic extraction
      return `[File: ${fileName}]\n\n(Word document uploaded — content extraction limited. Please describe what's in it or paste key sections.)`
    }

    return `[File: ${fileName}]\n\n(File type "${mimeType}" — unable to extract text content automatically.)`
  } catch (error: any) {
    console.error('File parse error:', error)
    return `[File: ${fileName}]\n\n(Error reading file: ${error.message})`
  }
}

async function parseSpreadsheet(response: Response): Promise<string> {
  const buffer = await response.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })

  const sheets: string[] = []

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    if (!sheet) continue

    // Convert to JSON for structured output
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][]

    if (jsonData.length === 0) continue

    sheets.push(`## Sheet: ${sheetName}`)

    // Build a markdown table
    const headers = jsonData[0]
    if (!headers || headers.length === 0) continue

    // Header row
    const headerRow = '| ' + headers.map((h: any) => String(h || '').trim()).join(' | ') + ' |'
    const separator = '| ' + headers.map(() => '---').join(' | ') + ' |'

    const rows = [headerRow, separator]

    // Data rows (limit to 100 rows to avoid token overflow)
    const maxRows = Math.min(jsonData.length, 101)
    for (let i = 1; i < maxRows; i++) {
      const row = jsonData[i]
      if (!row) continue
      const cells = headers.map((_: any, idx: number) => {
        const val = row[idx]
        if (val === null || val === undefined || val === '') return ''
        return String(val).trim().replace(/\|/g, '\\|')
      })
      rows.push('| ' + cells.join(' | ') + ' |')
    }

    if (jsonData.length > 101) {
      rows.push(`\n... (${jsonData.length - 101} more rows truncated)`)
    }

    sheets.push(rows.join('\n'))
  }

  return sheets.join('\n\n') || '(Empty spreadsheet)'
}

async function parsePDF(response: Response): Promise<string> {
  try {
    const buffer = await response.arrayBuffer()
    // Dynamic import to avoid issues in edge runtime
    const pdfModule = await import('pdf-parse')
    const pdfParse = (pdfModule as any).default || pdfModule
    const data = await pdfParse(Buffer.from(buffer))

    const text = data.text?.trim()
    if (!text) return '(PDF contained no extractable text — may be a scanned document)'

    // Truncate very long PDFs
    const maxChars = 15000
    if (text.length > maxChars) {
      return text.substring(0, maxChars) + `\n\n... (truncated — ${text.length} total characters)`
    }

    return text
  } catch (error: any) {
    console.error('PDF parse error:', error)
    return `(Unable to parse PDF: ${error.message})`
  }
}
