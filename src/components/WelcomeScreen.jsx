import { useEffect, useState } from 'react'
import './WelcomeScreen.css'

function WelcomeScreen({ onStart }) {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // Small delay for animation
    const timer = setTimeout(() => setIsReady(true), 500)
    return () => clearTimeout(timer)
  }, [])

  const handleStart = () => {
    if (isReady) {
      onStart()
    }
  }

  return (
    <div className="welcome-screen" onClick={handleStart}>
      <div className="welcome-content">
        <div className="welcome-gif-container">
          <img 
            src="/media/jinfishing.gif" 
            alt="Fishing" 
            className="welcome-gif"
          />
        </div>
        {isReady && (
          <div className="press-start">
            <span className="cursor">&gt;</span> press start
          </div>
        )}
        <div className="copyright">© 2026 u!ys</div>
      </div>
    </div>
  )
}

export default WelcomeScreen
