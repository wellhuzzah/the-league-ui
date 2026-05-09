import { Link, useLocation } from 'react-router-dom'

const LINKS = [
  { label: 'HOME',    to: '/',            exact: true },
  { label: 'SEASONS', to: '/seasons/2025', match: '/seasons' },
  { label: 'RECORDS', to: '/records',      match: '/records' },
  { label: 'DRAFT',   to: '/draft/2025',   match: '/draft' },
  { label: 'TEAMS',   to: '/teams',        match: '/teams' },
  { label: 'H2H',     to: '/h2h',          match: '/h2h' },
]

export default function TopNav({ season }) {
  const { pathname } = useLocation()

  const isActive = (link) =>
    link.exact ? pathname === link.to : pathname.startsWith(link.match || link.to)

  return (
    <div style={{
      position: 'absolute', top: 18, left: 32, right: 32, zIndex: 60,
      display: 'flex', alignItems: 'center', gap: 24,
      fontFamily: 'Inter, sans-serif', fontSize: 12, letterSpacing: 2,
      background: 'linear-gradient(180deg, rgba(7,6,26,0.9) 0%, transparent 100%)'
    }}>
      <Link to="/" style={{ color: 'var(--amber)', textDecoration: 'none' }}>◀ ROCKWOOD</Link>
      {LINKS.map(link => (
        <Link
          key={link.label}
          to={link.to}
          style={{
            color: isActive(link) ? '#f4eedd' : '#d4d8e8',
            textShadow: isActive(link) ? 'none' : '0 1px 3px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.9)',
            borderBottom: isActive(link) ? '2px solid var(--amber)' : '2px solid transparent',
            paddingBottom: 2,
            textDecoration: 'none',
            transition: 'color .12s',
          }}
        >
          {link.label}
        </Link>
      ))}
      {season && (
        <span style={{ marginLeft: 'auto', color: 'var(--amber)' }}>{season} ▾</span>
      )}
    </div>
  )
}
