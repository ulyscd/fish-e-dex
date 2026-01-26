import './HandheldFrame.css'

function HandheldFrame({ children, onTitleClick }) {
  return (
    <div className="handheld-frame">
      <div className="tube-border"></div>
      <div className="frame-embossed" onClick={onTitleClick}>fish-e-dex</div>
      <div className="screen-container">
        <div className="screen">
          {children}
        </div>
      </div>
    </div>
  )
}

export default HandheldFrame
