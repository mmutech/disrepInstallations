import { useState, useMemo, useEffect, useCallback } from 'react'
import Stats from '../components/Stats'
import Filter from '../components/Filter'
import Table from '../components/Table'
import { exportToCSV, exportToExcel } from '../utils/export'
import apiClient from '../config/axios'
import type { Column, TableData } from '../components/Table'
import '../styles/Dashboard.css'

// API Constants
const ENDPOINTS = {
  INSTALLATIONS: '/installations',
  STATS: '/installations/stats',
}

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 10
const EXPORT_LIMIT = 1000

interface DashboardProps {
  onLogout: () => void
}

const columns: Column[] = [
  { key: 'MeterNumber', label: 'Meter Number', width: '20%', sortable: true },
  { key: 'AccountNo', label: 'Account No', width: '20%', sortable: false },
  { key: 'Installer', label: 'Installer', width: '20%', sortable: true },
  { key: 'status', label: 'Status', width: '15%', sortable: true },
  { key: 'Date', label: 'Timestamp', width: '25%', sortable: true },
]

// API Utility Functions
const fetchMeters = async (limit: number = DEFAULT_LIMIT) => {
  let page = 1
  let allInstallations: any[] = []
  let hasMore = true
  const pageSize = 10000 // Fetch 10000 at a time
  
  console.log('📡 Starting to fetch all records...')
  
  while (hasMore) {
    try {
      const { data } = await apiClient.get(ENDPOINTS.INSTALLATIONS, {
        params: {
          page,
          limit: pageSize,
        },
      })
      
      if (data?.installations?.length) {
        allInstallations = [...allInstallations, ...data.installations]
        console.log(`📦 Page ${page}: Fetched ${data.installations.length} records (Total: ${allInstallations.length})`)
        
        // Check if we've reached the last page
        hasMore = data.installations.length === pageSize
        page++
      } else {
        hasMore = false
      }
      
      // Optional: Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
      
    } catch (error) {
      console.error(`❌ Failed to fetch page ${page}:`, error)
      hasMore = false
    }
  }
  
  console.log(`✅ Finished fetching all ${allInstallations.length} records`)
  return { installations: allInstallations }
}

const fetchMeterNumber = async (meterNumber: string) => {
  const { data } = await apiClient.get(ENDPOINTS.INSTALLATIONS, {
    params: {
      page: DEFAULT_PAGE,
      limit: 1,
      ...(meterNumber && { search: meterNumber }),
    },
  })
  return data
}

const fetchStats = async () => {
  const { data } = await apiClient.get(ENDPOINTS.STATS)
  return data
}

const transformMeterData = (installations: any[]): TableData[] => {
  return installations.map((item) => ({
    id: item.id,
    MeterNumber: item.meter_no,
    AccountNo: item.customer_account_no,
    Installer: item.installer_name || 'N/A',
    status: item.data_status,
    Date: item.timestamp ? new Date(item.timestamp).toISOString().split('T')[0] : 'N/A',
  }))
}

function Dashboard({ onLogout }: DashboardProps) {
  const [meterData, setMeterData] = useState<TableData[]>([])
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<string>('')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [hasSearched, setHasSearched] = useState(false)
  const [summary, setSummary] = useState<any>(null)
  const [statsLoading, setStatsLoading] = useState(false)

  // Fetch stats on component load
  useEffect(() => {
    const loadStats = async () => {
      try {
        setStatsLoading(true)
        const data = await fetchStats()
        if (data?.Summary) {
          setSummary(data.Summary)
        }
      } catch (err) {
        // Don't show error for 401 as it will redirect
        if (err?.response?.status !== 401) {
          console.error('Failed to fetch stats:', err)
        }
      } finally {
        setStatsLoading(false)
      }
    }

    loadStats()
  }, [])

  // Log summary whenever it updates
  useEffect(() => {
    if (summary) {
      console.log('Summary Updated:', summary)
    }
  }, [summary])

  // Apply sorting to the fetched data
  const filteredData = useMemo(() => {
    if (!hasSearched) return []
    
    let result = [...meterData]

    // Sort
    if (sortBy) {
      result.sort((a, b) => {
        const aVal = a[sortBy as keyof TableData]
        const bVal = b[sortBy as keyof TableData]
        
        // Handle different data types
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortDirection === 'asc' 
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal)
        }
        
        // Default comparison for numbers/dates
        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
        return 0
      })
    }

    return result
  }, [sortBy, sortDirection, hasSearched, meterData])

  // Handle sort change from Table component
  const handleSort = useCallback((key: string) => {
    if (sortBy === key) {
      // Toggle direction if same column
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      // New column, default to ascending
      setSortBy(key)
      setSortDirection('asc')
    }
  }, [sortBy])

  // Calculate stats from summary data
  const stats = useMemo(() => {
    if (!summary) {
      return [
        { label: 'Total', value: 0, icon: '📊', change: 'Installations' },
        { label: 'Pending', value: 0, icon: '⏳', change: 'Waiting' },
        { label: 'Captured', value: 0, icon: '✅', change: 'Completed' },
        { label: 'Escalated', value: 0, icon: '⚠️', change: 'Issues' },
      ]
    }

    return [
      { label: 'Total', value: Number(summary.total) || 0, icon: '📊', change: 'Installations' },
      { label: 'Pending', value: Number(summary.Pending) || 0, icon: '⏳', change: 'Waiting' },
      { label: 'Captured', value: Number(summary.Captured) || 0, icon: '✅', change: 'Completed' },
      { label: 'Escalated', value: Number(summary.Escalated) || 0, icon: '⚠️', change: 'Issues' },
    ]
  }, [summary])

  const filterConfigs = [
    { id: 'meterNumber', label: 'Meter Number', type: 'number' as const, placeholder: 'Enter meter number...' },
  ]

  const handleExportCSV = useCallback(async () => {
    try {
        // Show loading state if needed
        setExporting(true)
        
        // Fetch ALL data for export (increase limit)
        const data = await fetchMeters()
        
        if (data?.installations?.length === 0) {
            alert('No data to export')
            return
        }
        
        const exportData = data.installations
        
        // Export
        exportToCSV(exportData, { 
        filename: `all_meters_${new Date().toISOString().split('T')[0]}.csv` 
        })
    } catch (error) {
        console.error('Export failed:', error)
        alert('Failed to export data')
    } finally {
        setExporting(false)
    }
  }, [])

  const handleExportExcel = useCallback(async () => {
    try {
        // Show loading state if needed
        setExporting(true)
        
        // Fetch ALL data for export (increase limit)
        const data = await fetchMeters() // Fetch up to 1000 records
        
        if (data?.installations?.length === 0) {
            alert('No data to export')
            return
        }
        
        // Transform the data
        const exportData = data.installations
        
        // Export
        exportToExcel(exportData, { 
        filename: `all_meters_${new Date().toISOString().split('T')[0]}.xlsx` 
        })
    } catch (error) {
        console.error('Export failed:', error)
        alert('Failed to export data')
    } finally {
        setExporting(false)
    }
  }, [])

  const handleSearch = useCallback(async (searchFilters: Record<string, string | boolean>) => {
    try {
      setLoading(true)
      setError(null)
      setHasSearched(true)
      setSortBy('') // Reset sorting on new search
      setSortDirection('asc')

      const meterNumber = searchFilters.meterNumber as string

      // Fetch both installations and stats in parallel
      const [metersData, statsData] = await Promise.allSettled([
        fetchMeterNumber(meterNumber),
        fetchStats(),
      ])

      // Handle meters data
      if (metersData.status === 'fulfilled' && metersData.value?.installations) {
        setMeterData(transformMeterData(metersData.value.installations))
      } else if (metersData.status === 'rejected') {
        console.error('Failed to fetch meters:', metersData.reason)
        setError('Failed to load meter data')
      }

      // Handle stats data
      if (statsData.status === 'fulfilled' && statsData.value?.Summary) {
        setSummary(statsData.value.Summary)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data'
      setError(errorMessage)
      setMeterData([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleResetSearch = useCallback(() => {
    setHasSearched(false)
    setMeterData([])
    setError(null)
    setSortBy('')
    setSortDirection('asc')
  }, [])

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p className="dashboard-subtitle">Disrep Meters Installation Overview</p>
        </div>
        <button onClick={onLogout} className="logout-btn">
          Logout
        </button>
      </div>

      {statsLoading && !summary && (
        <div style={{ padding: '20px', textAlign: 'center' }}>Loading statistics...</div>
      )}
      
      <Stats stats={stats} />

      <div className="dashboard-content">
        <div className="section-header">
          <h2 className="section-title">Meter Data</h2>
          <div className="export-buttons">
            <button 
              onClick={handleExportCSV} 
              className="export-btn csv-btn" 
              disabled={loading || exporting}
            >
              {exporting ? 'Exporting...' : '📥 Export CSV'}
            </button>
            <button 
              onClick={handleExportExcel} 
              className="export-btn excel-btn" 
              disabled={loading || exporting}
            >
              {exporting ? 'Exporting...' : '📥 Export Excel'}
            </button>
          </div>
        </div>

        <Filter 
          filters={filterConfigs} 
          onFilterChange={() => {}}
          onSearch={handleSearch}
          showSearchButton={true}
          onReset={handleResetSearch}
        />

        {error && (
          <div style={{ 
            padding: '20px', 
            backgroundColor: '#fee', 
            border: '1px solid #fcc', 
            borderRadius: '4px',
            marginBottom: '20px',
            color: '#c33'
          }}>
            <strong>Error:</strong> {error}
            <button 
              onClick={handleResetSearch}
              style={{
                marginLeft: '20px',
                padding: '5px 10px',
                backgroundColor: '#c33',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Clear
            </button>
          </div>
        )}

        {loading && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
            <div className="spinner" style={{
              border: '4px solid #f3f3f3',
              borderTop: '4px solid #3498db',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 20px'
            }} />
            <p>Loading meter data...</p>
          </div>
        )}

        {!loading && (
          <Table
            columns={columns}
            data={filteredData}
            onSort={handleSort}
            sortBy={sortBy}
            sortDirection={sortDirection}
            onRowClick={(row) => console.log('Row clicked:', row)}
            emptyMessage={hasSearched ? "No meters found matching your search" : "Enter a meter number and click Search to view results"}
          />
        )}
      </div>
    </div>
  )
}

export default Dashboard