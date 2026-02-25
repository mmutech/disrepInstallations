import { useState } from 'react'
import '../styles/LoginPage.css'

interface LoginPageProps {
  onLoginSuccess: () => void
}

function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    // Basic validation
    if (!username || !password) {
      setError('Please fill in all fields')
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('https://disrep.jedecosystem.com/api/auth/login', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password })
      })
      
      const data = await response.json()
      console.log('Login Response:', data) // Log full response
      
      if (!response.ok) throw new Error(data.message || 'Login failed')
      
      // Check for token in response (might be under different field name)
      const token = data.token || data.access_token || data.accessToken || data.data?.token
      if (!token) {
        throw new Error('No token in response. Response: ' + JSON.stringify(data))
      }
      
      // Store token and user
      localStorage.setItem('authToken', token)
      localStorage.setItem('user', JSON.stringify(data.user || data.data?.user || {}))
      
      // Log token for verification
      console.log('Login successful!')
      console.log('Token stored:', token.substring(0, 20) + '...')
      console.log('User:', data.user || data.data?.user)
      
      setUsername('')
      setPassword('')
      setIsLoading(false)
      onLoginSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
      setIsLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Login</h1>
        <form onSubmit={handleSubmit}>
          {/* <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              disabled={isLoading}
            />
          </div> */}

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              disabled={isLoading}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button
            type="submit"
            disabled={isLoading}
            className={isLoading ? 'loading' : ''}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default LoginPage
