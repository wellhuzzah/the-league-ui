export default function Scene({ children, style }) {
  return (
    <div className="scene" style={style}>
      <div className="sky" />
      {children}
      <div className="crt" />
    </div>
  )
}
