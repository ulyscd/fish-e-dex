import { useEffect } from 'react'
import './Popup.css'

/* --------------- Popup --------------- */
function Popup({ children, onClose }) {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onClose])

  // Overlay click closes; content stopPropagation keeps inner clicks from closing. Escape key also closes.
  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-content" onClick={(e) => e.stopPropagation()}>
        <button className="popup-close" onClick={onClose}>×</button>
        {children}
      </div>
    </div>
  )
}

/* --------------- Export --------------- */
export default Popup
