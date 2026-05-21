import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'

const LINKS = [
	{ label: 'HOME',    to: '/',             exact: true },
	{ label: 'SEASONS', to: '/seasons/2025',  match: '/seasons' },
	{ label: 'RECORDS', to: '/records',       match: '/records' },
	{ label: 'DRAFT',   to: '/draft/2025',    match: '/draft' },
	{ label: 'TEAMS',   to: '/teams',         match: '/teams' },
	{ label: 'H2H',     to: '/h2h',           match: '/h2h' },
	{ label: 'PLAYERS', to: '/players',       match: '/players' },
]

export default function TopNav() {
	const { pathname } = useLocation()
	const [isOpen,    setIsOpen]    = useState(false)
	const [isMobile,  setIsMobile]  = useState(() => window.innerWidth <= 600)

	useEffect(() => {
		const check = () => setIsMobile(window.innerWidth <= 600)
		window.addEventListener('resize', check)
		return () => window.removeEventListener('resize', check)
	}, [])

	const isActive = (link) =>
		link.exact ? pathname === link.to : pathname.startsWith(link.match || link.to)

	const handleLinkClick = () => setIsOpen(false)

	return (
		<>
			<div style={{
				position: 'fixed', top: 0, left: 0, right: 0, zIndex: 60,
				display: 'flex', alignItems: 'center', gap: isMobile ? 0 : 28,
				padding: '0 28px',
				height: 44,
				background: '#0d0f18',
				borderBottom: '1px solid var(--amber)',
			}}>
				<Link to="/" onClick={handleLinkClick} style={{
					fontFamily: 'var(--f-pixel)',
					fontSize: 13,
					color: 'var(--amber)',
					textDecoration: 'none',
					letterSpacing: '0.08em',
					marginRight: isMobile ? 'auto' : 8,
					flexShrink: 0,
				}}>
					The League
				</Link>

				{!isMobile && (
					<>
						<div style={{ width: 1, height: 20, background: 'var(--steel-3)', flexShrink: 0 }} />
						{LINKS.map(link => (
							<Link
								key={link.label}
								to={link.to}
								style={{
									fontFamily: 'var(--f-pixel)',
									fontSize: 10,
									letterSpacing: '0.06em',
									color: isActive(link) ? 'var(--amber-glow)' : 'var(--steel-1)',
									borderBottom: isActive(link) ? '2px solid var(--amber)' : '2px solid transparent',
									paddingBottom: 2,
									textDecoration: 'none',
									transition: 'color .12s',
									whiteSpace: 'nowrap',
								}}
							>
								{link.label}
							</Link>
						))}
					</>
				)}

				{isMobile && (
					<button
						onClick={() => setIsOpen(o => !o)}
						style={{
							background: 'none',
							border: 'none',
							color: 'var(--amber)',
							fontFamily: 'var(--f-pixel)',
							fontSize: 20,
							cursor: 'pointer',
							padding: '0 4px',
							lineHeight: 1,
						}}
					>
						{isOpen ? '✕' : '≡'}
					</button>
				)}
			</div>

			{isMobile && isOpen && (
				<div style={{
					position: 'fixed',
					top: 44,
					left: 0,
					right: 0,
					bottom: 0,
					zIndex: 59,
					background: 'rgba(13, 15, 24, 0.97)',
					overflowY: 'auto',
				}}>
					{LINKS.map(link => (
						<Link
							key={link.label}
							to={link.to}
							onClick={handleLinkClick}
							style={{
								display: 'block',
								fontFamily: 'var(--f-pixel)',
								fontSize: 13,
								color: isActive(link) ? 'var(--amber)' : 'var(--steel-hi)',
								padding: '14px 24px',
								borderBottom: '1px solid var(--steel-3)',
								textDecoration: 'none',
								letterSpacing: '0.08em',
							}}
						>
							{link.label}
						</Link>
					))}
				</div>
			)}
		</>
	)
}
