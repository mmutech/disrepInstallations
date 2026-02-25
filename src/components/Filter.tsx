import { useState } from 'react'
import '../styles/Filter.css'

export interface FilterOption {
  id: string
  label: string
  value?: string
}

interface FilterConfig {
  id: string
  label: string
  type: 'text' | 'number'
  placeholder?: string
  options?: FilterOption[]
}

interface FilterProps {
  filters: FilterConfig[]
  onFilterChange: (filters: Record<string, string | boolean>) => void
  onSearch?: (filters: Record<string, string | boolean>) => void
  showSearchButton?: boolean
}

function Filter({ filters, onFilterChange, onSearch, showSearchButton = false }: FilterProps) {
  const [filterValues, setFilterValues] = useState<Record<string, string | boolean>>({})

  const handleChange = (filterId: string, value: string | boolean) => {
    const newFilters = { ...filterValues, [filterId]: value }
    setFilterValues(newFilters)
    // Only call onFilterChange if not using search button
    if (!showSearchButton) {
      onFilterChange(newFilters)
    }
  }

  const handleReset = () => {
    setFilterValues({})
    if (!showSearchButton) {
      onFilterChange({})
    } else if (onSearch) {
      // When using search button, reset via onSearch with empty filters
      onSearch({})
    }
  }

  const handleSearch = () => {
    if (onSearch) {
      onSearch(filterValues)
    }
  }

  return (
    <div className="filter-container">
      <div className="filter-inputs">
        {filters.map((filter) => (
          <div key={filter.id} className="filter-group">
            <label htmlFor={filter.id} className="filter-label">
              {filter.label}
            </label>
            {(filter.type === 'text' || filter.type === 'number') && (
              <input
                id={filter.id}
                type={filter.type}
                placeholder={filter.placeholder || `Filter by ${filter.label.toLowerCase()}`}
                value={(filterValues[filter.id] as string) || ''}
                onChange={(e) => handleChange(filter.id, e.target.value)}
                className="filter-input"
              />
            )}
          </div>
        ))}
      </div>
      <div className="filter-actions">
        {showSearchButton && (
          <button onClick={handleSearch} className="filter-search-btn">
            🔍 Search
          </button>
        )}

        {Object.keys(filterValues).length > 0 && (
          <button onClick={handleReset} className="filter-reset-btn">
            Reset Filters
          </button>
        )}
      </div>
    </div>
  )
}

export default Filter
