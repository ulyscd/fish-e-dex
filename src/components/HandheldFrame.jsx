import './styles/HandheldFrame.css'

/* --------------- HandheldFrame --------------- */
function HandheldFrame({ children, onTitleClick }) {
  // Tube border: decorative frame; frame-embossed: title at bottom, click returns to welcome; screen: main content area
  return (
    <div className="handheld-frame">
      <div className="tube-border"></div>
      <div className="frame-embossed" onClick={onTitleClick}>
{`███████╗██╗░██████╗██╗░░██╗░░░░░░███████╗░░░░░░██████╗░███████╗██╗░░██╗
██╔════╝██║██╔════╝██║░░██║░░░░░░██╔════╝░░░░░░██╔══██╗██╔════╝╚██╗██╔╝
█████╗░░██║╚█████╗░███████║█████╗█████╗░░█████╗██║░░██║█████╗░░░╚███╔╝░
██╔══╝░░██║░╚═══██╗██╔══██║╚════╝██╔══╝░░╚════╝██║░░██║██╔══╝░░░██╔██╗░
██║░░░░░██║██████╔╝██║░░██║░░░░░░███████╗░░░░░░██████╔╝███████╗██╔╝╚██╗
╚═╝░░░░░╚═╝╚═════╝░╚═╝░░╚═╝░░░░░░╚══════╝░░░░░░╚═════╝░╚══════╝╚═╝░░╚═╝`}
      </div>
      <div className="screen-container">
        <div className="screen">
          {children}
        </div>
      </div>
    </div>
  )
}

/* --------------- Export --------------- */
export default HandheldFrame
