import { useState, useEffect } from 'react'
import HandheldFrame from './components/HandheldFrame'
import WelcomeScreen from './components/WelcomeScreen'
import MainInterface from './components/MainInterface'
import LocationView from './components/LocationView'
import OutingView from './components/OutingView'
import InsightsView from './components/InsightsView'
import './App.css'

function App() {
  const [currentView, setCurrentView] = useState('welcome') // 'welcome', 'main', 'location', 'outing', 'insights'
  const [selectedGif, setSelectedGif] = useState(0) // 0: spiral, 1: notes, 2: code

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (currentView === 'welcome') {
        if (e.key === 'Enter' || e.key === ' ') {
          setCurrentView('main')
        }
      } else if (currentView === 'main') {
        if (e.key === 'ArrowLeft') {
          setSelectedGif((prev) => (prev > 0 ? prev - 1 : 2))
        } else if (e.key === 'ArrowRight') {
          setSelectedGif((prev) => (prev < 2 ? prev + 1 : 2))
        } else if (e.key === 'Enter' || e.key === ' ') {
          if (selectedGif === 0) setCurrentView('location')
          else if (selectedGif === 1) setCurrentView('outing')
          else if (selectedGif === 2) setCurrentView('insights')
        } else if (e.key === 'Escape') {
          setCurrentView('welcome')
        }
      } else {
        if (e.key === 'Escape') {
          setCurrentView('main')
        }
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [currentView, selectedGif])

  return (
    <div className="app">
      <HandheldFrame>
        {currentView === 'welcome' && (
          <WelcomeScreen onStart={() => setCurrentView('main')} />
        )}
        {currentView === 'main' && (
          <MainInterface
            selectedGif={selectedGif}
            onGifSelect={setSelectedGif}
            onNavigate={setCurrentView}
          />
        )}
        {currentView === 'location' && (
          <LocationView onBack={() => setCurrentView('main')} />
        )}
        {currentView === 'outing' && (
          <OutingView onBack={() => setCurrentView('main')} />
        )}
        {currentView === 'insights' && (
          <InsightsView onBack={() => setCurrentView('main')} />
        )}
      </HandheldFrame>
    </div>
  )
}

export default App
