/**
 * Export utilities for CSV and Excel formats
 */

export interface ExportOptions {
  filename?: string
  sheetName?: string
}

/**
 * Convert array of objects to CSV string
 */
function convertToCSV(data: Record<string, unknown>[]): string {
  if (data.length === 0) return ''

  // Get headers
  const headers = Object.keys(data[0])
  const csvHeaders = headers.map(escapeCSV).join(',')

  // Get rows
  const csvRows = data.map((row) =>
    headers.map((header) => escapeCSV(row[header])).join(',')
  )

  return [csvHeaders, ...csvRows].join('\n')
}

/**
 * Escape CSV values that contain commas or quotes
 */
function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }

  const stringValue = String(value)
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"` 
  }
  return stringValue
}

/**
 * Export data to CSV file
 */
export function exportToCSV(data: Record<string, unknown>[], options: ExportOptions = {}): void {
  const csv = convertToCSV(data)
  const filename = options.filename || `export_${new Date().getTime()}.csv`

  downloadFile(csv, filename, 'text/csv;charset=utf-8;')
}

/**
 * Export data to Excel (using CSV format which Excel can read)
 */
export function exportToExcel(data: Record<string, unknown>[], options: ExportOptions = {}): void {
  const csv = convertToCSV(data)
  const filename = options.filename || `export_${new Date().getTime()}.xlsx`

  // Excel can read CSV files
  downloadFile(csv, filename, 'application/vnd.ms-excel;charset=utf-8;')
}

/**
 * Download file helper
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + content], { type: mimeType })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.href = url
  link.download = filename
  link.style.display = 'none'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}
