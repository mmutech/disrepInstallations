import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import LoginPage from './pages/LoginPage'

function AppRouter() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem('authToken'))

  const handleLogout = () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('user')
    setIsLoggedIn(false)
  }

  const LoginWrapper = () => {
    const navigate = useNavigate()
    const onLoginSuccess = () => {
      setIsLoggedIn(true)
      let redirect = sessionStorage.getItem('redirectAfterLogin') || '/dashboard'
      sessionStorage.removeItem('redirectAfterLogin')

      // If redirect points to login (or root), go to dashboard instead
      if (!redirect || redirect.includes('/login') || redirect === '/') {
        redirect = '/dashboard'
      }

      navigate(redirect, { replace: true })
    }
    return <LoginPage onLoginSuccess={onLoginSuccess} />
  }

  const RequireAuth = ({ children }: { children: JSX.Element }) => {
    if (!isLoggedIn) return <Navigate to="/login" replace />
    return children
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginWrapper />} />
        <Route path="/dashboard" element={<RequireAuth><Dashboard onLogout={handleLogout} /></RequireAuth>} />
        <Route path="/" element={<Navigate to={isLoggedIn ? '/dashboard' : '/login'} replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRouter
