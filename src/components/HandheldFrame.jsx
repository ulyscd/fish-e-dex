import './HandheldFrame.css'

function HandheldFrame({ children }) {
  return (
    <div className="handheld-frame">
      <div className="frame-embossed">fish-e-dex</div>
      <div className="screen-container">
        <div className="screen">
          {children}
        </div>
      </div>
    </div>
  )
}

export default HandheldFrame
