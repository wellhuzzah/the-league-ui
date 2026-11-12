export default function StatStamp({ label, value, caption, style }) {
  return (
    <div className="stat-stamp" style={style}>
      <div className="lbl">{label}</div>
      <div className="val">{value}</div>
      {caption && <div className="cap">{caption}</div>}
    </div>
  )
}
