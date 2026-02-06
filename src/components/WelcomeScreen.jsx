import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import LoginPopup from './LoginPopup'
import './styles/WelcomeScreen.css'

/* --------------- WelcomeScreen --------------- */
function WelcomeScreen({ onStart }) {
  const { user } = useAuth()
  const [isReady, setIsReady] = useState(false)
  const [showLogin, setShowLogin] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 500)
    return () => clearTimeout(timer)
  }, [])

  const handleStart = () => {
    if (!isReady) return
    if (!user) {
      setShowLogin(true)
    } else {
      onStart()
    }
  }

  return (
    <div className="welcome-screen" onClick={handleStart}>
      <button
        className="welcome-login-button"
        onClick={(e) => {
          e.stopPropagation()
          setShowLogin(true)
        }}
        aria-label="Log in"
      >
        {user ? user.email : 'Log In'}
      </button>
      <div className="welcome-content">
        <div className="welcome-gif-container">
          <img 
            src="/media/jinfishing.gif" 
            alt="Fishing" 
            className="welcome-gif"
          />
        </div>
        <div className="welcome-title">
          <pre className="ascii-title">
{`███████╗██╗░██████╗██╗░░██╗░░░░░░███████╗░░░░░░██████╗░███████╗██╗░░██╗
██╔════╝██║██╔════╝██║░░██║░░░░░░██╔════╝░░░░░░██╔══██╗██╔════╝╚██╗██╔╝
█████╗░░██║╚█████╗░███████║█████╗█████╗░░█████╗██║░░██║█████╗░░░╚███╔╝░
██╔══╝░░██║░╚═══██╗██╔══██║╚════╝██╔══╝░░╚════╝██║░░██║██╔══╝░░░██╔██╗░
██║░░░░░██║██████╔╝██║░░██║░░░░░░███████╗░░░░░░██████╔╝███████╗██╔╝╚██╗
╚═╝░░░░░╚═╝╚═════╝░╚═╝░░╚═╝░░░░░░╚══════╝░░░░░░╚═════╝░╚══════╝╚═╝░░╚═╝`}
          </pre>
          <div className="copyright">© 2026 u!ys</div>
        </div>
        {isReady && (
          <div className="press-start">
            <span className="cursor">&gt;</span> press start
          </div>
        )}
      </div>
      {showLogin && (
        <LoginPopup onClose={() => setShowLogin(false)} />
      )}
    </div>
  )
}

/* --------------- Export --------------- */
export default WelcomeScreen
