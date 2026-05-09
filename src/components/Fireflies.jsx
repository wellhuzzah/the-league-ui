import { useMemo } from 'react'

export default function Fireflies({ count = 7, area = { left: 0, right: 100, top: 50, bottom: 90 } }) {
  const flies = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: area.left + Math.random() * (area.right - area.left),
      y: area.top + Math.random() * (area.bottom - area.top),
      d: 6 + Math.random() * 8,
      delay: -Math.random() * 6,
      anim: i % 2 ? 'ff1' : 'ff2'
    })),
    [count, area.left, area.right, area.top, area.bottom]
  )
  return flies.map(f => (
    <span
      key={f.id}
      className="firefly"
      style={{
        left: f.x + '%',
        top: f.y + '%',
        animation: `${f.anim} ${f.d}s ease-in-out ${f.delay}s infinite`
      }}
    />
  ))
}
