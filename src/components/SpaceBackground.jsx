/**
 * SpaceBackground
 * Fixed, non-interactive animated aurora and starfield background.
 * Pointer events are disabled so it never interferes with UI.
 */
export default function SpaceBackground() {
  return (
    <div className="aurora-container">
      <div className="aurora-bg"></div>
      <div id="stars-1"></div>
      <div id="stars-2"></div>
      <div id="stars-3"></div>
      <div className="shooting-star shooting-star-1"></div>
      <div className="shooting-star shooting-star-2"></div>
      <div className="shooting-star shooting-star-3"></div>
    </div>
  );
}
