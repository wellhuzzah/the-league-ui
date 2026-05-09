export default function DriftingClouds({ y = 30, opacity = 0.55 }) {
  return (
    <svg
      className="clouds"
      style={{ top: y + '%', opacity }}
      viewBox="0 0 320 30"
      preserveAspectRatio="none"
      shapeRendering="crispEdges"
    >
      <g fill="#5c2a4a">
        <rect x="0" y="6" width="320" height="6" />
        <rect x="0" y="12" width="320" height="4" opacity="0.5" />
      </g>
      <g fill="#6a2f4d">
        <rect x="20" y="2" width="60" height="4" />
        <rect x="120" y="4" width="80" height="3" />
        <rect x="240" y="3" width="50" height="4" />
      </g>
      <g fill="#8a3a5a">
        <rect x="40" y="0" width="30" height="2" />
        <rect x="150" y="2" width="40" height="2" />
        <rect x="260" y="1" width="20" height="2" />
      </g>
    </svg>
  )
}
