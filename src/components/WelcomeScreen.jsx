import { useEffect, useState } from 'react'
import './WelcomeScreen.css'

/* --------------- WelcomeScreen --------------- */
function WelcomeScreen({ onStart }) {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
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
        <div className="welcome-title">
          <pre className="ascii-title">
{`███████╗██╗░██████╗██╗░░██╗░░░░░░███████╗░░░░░░██████╗░███████╗██╗░░██╗
██╔════╝██║██╔════╝██║░░██║░░░░░░██╔════╝░░░░░░██╔══██╗██╔════╝╚██╗██╔╝
█████╗░░██║╚█████╗░███████║█████╗█████╗░░█████╗██║░░██║█████╗░░░╚███╔╝░
██╔══╝░░██║░╚═══██╗██╔══██║╚════╝██╔══╝░░╚════╝██║░░██║██╔══╝░░░██╔██╗░
██║░░░░░██║██████╔╝██║░░██║░░░░░░███████╗░░░░░░██████╔╝███████╗██╔╝╚██╗
╚═╝░░░░░╚═╝╚═════╝░╚═╝░░╚═╝░░░░░░╚══════╝░░░░░░╚═════╝░╚══════╝╚═╝░░╚═╝`}
          </pre>
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

/* --------------- Export --------------- */
export default WelcomeScreen
