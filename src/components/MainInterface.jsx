import { useState } from 'react'
import './styles/MainInterface.css'

/* --------------- MainInterface --------------- */
function MainInterface({ selectedGif, onGifSelect, onNavigate }) {
  const gifs = [
    { src: '/media/spiral.gif', view: 'location', label: 'Location' },
    { src: '/media/notes.gif', view: 'outing', label: 'Outing' },
    { src: '/media/code.gif', view: 'insights', label: 'Insights' }
  ]

  const handleGifClick = (index) => {
    onGifSelect(index)
    onNavigate(gifs[index].view)
  }

  return (
    <div className="main-interface">
      <div className="crt-overlay"></div>
      <div 
        className="background-image"
        style={{ backgroundImage: 'url(/media/carp.jpg)' }}
      ></div>
      <div className="main-content">
        {/* Three options: click or Enter opens Location / Outing / Insights */}
        <div className="gif-selector">
          {gifs.map((gif, index) => (
            <div
              key={index}
              className={`gif-option ${selectedGif === index ? 'selected' : ''}`}
              onClick={() => handleGifClick(index)}
              onMouseEnter={() => onGifSelect(index)}
            >
              <img 
                src={gif.src} 
                alt={gif.label}
                className="selector-gif"
              />
              <div className="gif-label">{gif.label}</div>
            </div>
          ))}
        </div>
        <div className="navigation-hint">
          Use ← → arrow keys or click to navigate • Press Enter to select
        </div>
      </div>
    </div>
  )
}

/* --------------- Export --------------- */
export default MainInterface
