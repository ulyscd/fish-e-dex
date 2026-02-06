import { useState } from 'react'
import Popup from './Popup'
import { useAuth } from '../contexts/AuthContext'
import './styles/LoginPopup.css'

function LoginPopup({ onClose }) {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (mode === 'signin') {
        const { error } = await signIn(email, password)
        if (error) throw error
        onClose()
      } else {
        const { error } = await signUp(email, password, username || undefined)
        if (error) throw error
        setSuccess('Check your email to confirm your account.')
      }
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Popup onClose={onClose}>
      <div className="login-popup">
        <h3>{mode === 'signin' ? 'Log In' : 'Create Account'}</h3>
        <form onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your_username"
                autoComplete="username"
              />
            </div>
          )}
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            />
          </div>
          {error && <p className="login-error">{error}</p>}
          {success && <p className="login-success">{success}</p>}
          <button type="submit" className="login-submit" disabled={loading}>
            {loading ? '...' : mode === 'signin' ? 'Log In' : 'Sign Up'}
          </button>
        </form>
        <button
          type="button"
          className="login-toggle"
          onClick={() => {
            setMode(m => m === 'signin' ? 'signup' : 'signin')
            setError('')
            setSuccess('')
          }}
        >
          {mode === 'signin' ? 'Need an account? Sign up' : 'Already have an account? Log in'}
        </button>
      </div>
    </Popup>
  )
}

export default LoginPopup
