export default function StatStamp({ label, value, caption, style }) {
  return (
    <div className="stat-stamp" style={style}>
      <div className="lbl">{label}</div>
      <div className="val">{value}</div>
      {caption && (
        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#8a8c98', marginTop: 4 }}>
          {caption}
        </div>
      )}
    </div>
  )
}
