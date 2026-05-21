const EMOJI = {
  championship: '🏆',
  topscore:     '⭐',
  sacko:        '💩',
}

export function DataWell({ children, style }) {
  return (
    <div style={{
      background: 'rgba(10, 10, 20, 0.85)',
      borderRadius: 4,
      border: '1px solid rgba(255,255,255,0.06)',
      padding: '4px 0',
      marginTop: 8,
      ...style,
    }}>
      {children}
    </div>
  )
}

export default function Badge({ type, count = 1 }) {
  if (type === 'goat') return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 2,
      fontFamily: 'var(--f-pixel)', fontSize: 14, letterSpacing: 1,
      padding: '2px 8px', background: '#1a1200', color: 'var(--amber)',
      border: '1px solid rgba(240,160,75,0.35)',
    }}>
      🐐 GOAT 🐐
    </span>
  )

  const emoji = EMOJI[type]
  if (!emoji) return null

  return (
    <span style={{
      display: 'inline-grid',
      gridTemplateColumns: 'repeat(3, auto)',
      gap: 1,
      fontSize: 14,
      lineHeight: 1.2,
      verticalAlign: 'middle',
    }}>
      {Array.from({ length: count }, (_, i) => (
        <span key={i}>{emoji}</span>
      ))}
    </span>
  )
}
