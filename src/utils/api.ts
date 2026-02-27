const BASE_URL = 'https://disrep.jedecosystem.com/api'

type FetchOptions = RequestInit & {
  skipAuth?: boolean
  // Add optional timeout
  timeout?: number
}

export const apiRequest = async <T = any>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> => {
  const token = localStorage.getItem('authToken')
  
  // Add timeout support
  const controller = new AbortController()
  const timeout = options.timeout || 30000 // 30 second default
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  // Ensure endpoint starts with slash
  const url = endpoint.startsWith('/') 
    ? `${BASE_URL}${endpoint}`
    : `${BASE_URL}/${endpoint}`

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token && { Authorization: `API KEY ${token}` }),
        ...(options.headers || {}),
      },
    })

    clearTimeout(timeoutId)

    // Handle 401 globally
    if (response.status === 401) {
      // Store current path to redirect back after login
      const currentPath = window.location.pathname
      if (currentPath !== '/login') {
        sessionStorage.setItem('redirectAfterLogin', currentPath)
      }
      
      localStorage.removeItem('authToken')
      localStorage.removeItem('user')
      sessionStorage.clear()
      
      // Only redirect if not already on login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
      
      throw new Error('Your session has expired. Please login again.')
    }

    // Handle empty responses (204 No Content)
    if (response.status === 204) {
      return {} as T
    }

    if (!response.ok) {
      // Try to parse error as JSON first, fallback to text
      let errorMessage = 'Request failed'
      let errorDetails = {}
      
      try {
        const errorData = await response.json()
        errorMessage = errorData.message || errorData.error || JSON.stringify(errorData)
        errorDetails = errorData
      } catch {
        errorMessage = await response.text() || `HTTP error ${response.status}`
      }
      
      // Log errors in development only
      if (import.meta.env.MODE === 'development') {
        console.error('API Error:', {
          status: response.status,
          statusText: response.statusText,
          url,
          error: errorDetails
        })
      }
      
      throw new Error(errorMessage)
    }

    // Handle case where response might be empty
    const text = await response.text()
    return text ? JSON.parse(text) : ({} as T)
    
  } catch (error) {
    clearTimeout(timeoutId)
    
    // Handle abort/timeout errors
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout. Please try again.')
    }
    
    // Handle network errors
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error('Network error. Please check your connection.')
    }
    
    throw error
  }
}

// Optional: Add convenience methods
export const api = {
  get: <T>(endpoint: string, options?: FetchOptions) => 
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),
    
  post: <T>(endpoint: string, data?: any, options?: FetchOptions) => 
    apiRequest<T>(endpoint, { 
      ...options, 
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined 
    }),
    
  put: <T>(endpoint: string, data?: any, options?: FetchOptions) => 
    apiRequest<T>(endpoint, { 
      ...options, 
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined 
    }),
    
  patch: <T>(endpoint: string, data?: any, options?: FetchOptions) => 
    apiRequest<T>(endpoint, { 
      ...options, 
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined 
    }),
    
  delete: <T>(endpoint: string, options?: FetchOptions) => 
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),
}