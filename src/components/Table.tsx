import '../styles/Table.css'

export interface Column {
  key: string
  label: string
  width?: string
  sortable?: boolean
}

export interface TableData {
  id: string | number
  [key: string]: string | number | boolean
}

interface TableProps {
  columns: Column[]
  data: TableData[]
  onSort?: (key: string) => void
  sortBy?: string
  sortDirection?: 'asc' | 'desc'
  onRowClick?: (row: TableData) => void
  loading?: boolean
  emptyMessage?: string
}

function Table({
  columns,
  data,
  onSort,
  sortBy: _sortBy,
  sortDirection: _sortDirection,
  onRowClick,
  loading = false,
  emptyMessage = 'No data available'
}: TableProps) {
  return (
    <div className="table-container">
      {loading ? (
        <div className="table-loading">Loading...</div>
      ) : data.length === 0 ? (
        <div className="table-empty">{emptyMessage}</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={column.sortable ? 'sortable' : ''}
                  onClick={() => column.sortable && onSort?.(column.key)}
                  style={{ width: column.width }}
                >
                  {column.label}
                  {column.sortable && <span className="sort-icon">↕</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr
                key={row.id}
                className="table-row"
                onClick={() => onRowClick?.(row)}
                style={{ cursor: onRowClick ? 'pointer' : 'default' }}
              >
                {columns.map((column) => (
                  <td key={`${row.id}-${column.key}`}>
                    {String(row[column.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default Table
