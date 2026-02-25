import axios from 'axios'

// Create axios instance with base URL
export const apiClient = axios.create({
  baseURL: 'https://disrep.jedecosystem.com/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json', // Add accept header
    'AuthToken': localStorage.getItem('authToken') || '', // Include token in header
  },
})

// Add request interceptor to include token
apiClient.interceptors.request.use(
  (config) => {
    try {
      const token = localStorage.getItem('authToken')
      
      // Optional: Check token expiry if you store it
      const tokenExpiry = localStorage.getItem('tokenExpiry')
      if (tokenExpiry && Date.now() > parseInt(tokenExpiry)) {
        console.warn('⚠️ Token expired, removing...')
        localStorage.removeItem('authToken')
        localStorage.removeItem('tokenExpiry')
        // Redirect to login
        window.location.href = '/login'
        return Promise.reject(new Error('Token expired'))
      }
      
      console.log('🔄 Request Interceptor Running', {
        url: config.url,
        method: config.method,
        hasToken: !!token,
        tokenPreview: token ? `${token.substring(0, 10)}...` : 'none'
      })
      
      // Ensure headers object exists
      if (!config.headers) {
        config.headers = {}
      }
      
      if (token) {
        // Try different Authorization header formats
        const authHeader = `Bearer ${token}`
        config.headers['Authorization'] = authHeader
        // Also include the legacy/custom header some APIs expect
        config.headers['AuthToken'] = token
        
        // For debugging: log first 20 chars of header
        console.log('✅ Authorization header SET:', {
          preview: authHeader.substring(0, 25) + '...',
          url: config.url,
          method: config.method,
        })
      } else {
        console.warn('❌ No token found in localStorage')
        // Optionally redirect if endpoint requires auth
        if (!config.url?.includes('/auth/')) {
          console.log('🔒 Protected endpoint called without token')
        }
      }
      
      return config
    } catch (err) {
      console.error('🔴 Request Interceptor Error:', err)
      return Promise.reject(err)
    }
  },
  (error) => {
    console.error('Request interceptor error:', error)
    return Promise.reject(error)
  }
)

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    console.log('✅ API Success:', {
      url: response.config.url,
      status: response.status,
      statusText: response.statusText,
      dataSize: Array.isArray(response.data) ? response.data.length : 'object',
    })
    return response
  },
  async (error) => {
    // Log detailed error information
    console.error('❌ API Error Details:')
    console.error('  Status:', error.response?.status)
    console.error('  Status Text:', error.response?.statusText)
    console.error('  URL:', error.config?.url)
    console.error('  Method:', error.config?.method?.toUpperCase())
    console.error('  Message:', error.message)
    console.error('  Response Data:', error.response?.data)
    console.error('  Auth Header:', error.config?.headers?.Authorization ? 'Present' : 'Missing')
    
    // Handle 401 Unauthorized globally
    if (error.response?.status === 401) {
      console.log('🔐 Session expired or invalid token')
      
      // Clear auth data
      localStorage.removeItem('authToken')
      localStorage.removeItem('user')
      localStorage.removeItem('tokenExpiry')
      
      // Store current path to redirect back after login
      const currentPath = window.location.pathname
      if (currentPath !== '/login') {
        sessionStorage.setItem('redirectAfterLogin', currentPath)
      }
      
      // Redirect to login if not already there
      if (!window.location.pathname.includes('/login')) {
        console.log('↪️ Redirecting to login...')
        window.location.href = '/login'
      }
    }
    
    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      console.error('🚫 Access forbidden - insufficient permissions')
      // Show user-friendly message
    }
    
    // Handle network errors
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      console.error('⏱️ Request timeout')
    }
    
    if (!error.response) {
      console.error('📡 Network error - no response received')
    }
    
    return Promise.reject(error)
  }
)

// Test endpoint connectivity on module load
console.log('📡 Axios Client Configuration:')
console.log('  Base URL:', apiClient.defaults.baseURL)
console.log('  Timeout:', apiClient.defaults.timeout)
console.log('  Default Headers:', apiClient.defaults.headers)
console.log('  Interceptors: Both request and response configured')

// Helper methods for common operations
export const api = {
  get: <T>(url: string, config = {}) => 
    apiClient.get<T>(url, config).then(res => res.data),
    
  post: <T>(url: string, data?: any, config = {}) => 
    apiClient.post<T>(url, data, config).then(res => res.data),
    
  put: <T>(url: string, data?: any, config = {}) => 
    apiClient.put<T>(url, data, config).then(res => res.data),
    
  patch: <T>(url: string, data?: any, config = {}) => 
    apiClient.patch<T>(url, data, config).then(res => res.data),
    
  delete: <T>(url: string, config = {}) => 
    apiClient.delete<T>(url, config).then(res => res.data),
}

export default apiClient