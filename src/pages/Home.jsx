import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import PixelPhoto from '../components/PixelPhoto'
import DriftingClouds from '../components/DriftingClouds'
import useMenuNav from '../components/useMenuNav'

const NAV_ITEMS = [
    { label: 'Season Standings', path: '/seasons/2025' },
    { label: 'All-Time Records', path: '/records' },
    { label: 'Draft History', path: '/draft/2025' },
    { label: 'Team Pages', path: '/teams' },
    { label: 'Head to Head', path: '/h2h' },
    { label: 'Player Pages', path: '/players' },
]

export default function Home() {
    const navigate = useNavigate()
    const [active, setActive] = useMenuNav(NAV_ITEMS.length)

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Enter') {
                navigate(NAV_ITEMS[active].path)
                e.preventDefault()
            }
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [active])

    return (
        <div className="scene scene-home">
            <div className="sky" />

            <PixelPhoto
                src="/tower_wide.jpg"
                lowW={400}
                lowH={225}
                dither={true}
                tint={1}
                style={{ opacity: 0.92 }}
            />

            <DriftingClouds y={30} opacity={0.5} />
            <DriftingClouds y={40} opacity={0.35} />

            {/* Left-side gradient so menu text reads cleanly over the photo */}
            <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(90deg, rgba(7,6,26,0.78) 0%, rgba(7,6,26,0.5) 30%, rgba(7,6,26,0.05) 55%, transparent 70%)',
                zIndex: 38
            }} />

            {/* Pixel window lights — 6 house clusters around the neighborhood */}
            {[
                // Cluster A — house far left
                { left: '33.2%', top: '38.4%' },
                { left: '33.8%', top: '37.9%' },
                { left: '34.5%', top: '38.6%' },

                // Cluster B — house just left of center
                { left: '36.4%', top: '36.1%' },
                { left: '37.1%', top: '35.7%' },

                // Cluster C — main center cluster
                { left: '39.2%', top: '34.2%' },
                { left: '39.9%', top: '34.8%' },
                { left: '40.6%', top: '34.1%' },
                { left: '41.3%', top: '34.6%' },

                // Cluster D — slightly lower, denser street
                { left: '42.8%', top: '37.5%' },
                { left: '43.5%', top: '37.0%' },
                { left: '44.2%', top: '37.8%' },
                { left: '44.8%', top: '37.3%' },

                // Cluster E — upper right
                { left: '46.5%', top: '30.2%' },
                { left: '47.2%', top: '29.8%' },
                { left: '47.9%', top: '30.5%' },

                // Cluster F — lower right straggler
                { left: '49.3%', top: '42.1%' },
                { left: '50.0%', top: '41.6%' },
                { left: '50.7%', top: '42.4%' },
            ].map((w, i) => (
                <div key={i} style={{
                    position: 'absolute', left: w.left, top: w.top,
                    width: 3, height: 4,
                    borderRadius: 0,
                    background: 'rgba(255,200,80,0.55)',
                    boxShadow: '0 0 3px 1px rgba(255,180,50,0.3)',
                    zIndex: 36,
                    pointerEvents: 'none',
                }} />
            ))}

            {/* Title block */}
            <div style={{ position: 'absolute', left: 64, top: 60, zIndex: 50 }}>
                <div className="title-sub" style={{ marginBottom: 12 }}>· EST. 2003 ·</div>
                <div className="title-rockwood" style={{ fontSize: 'clamp(32px, 9vw, 96px)' }}>ROCKWOOD</div>
                <div style={{
                    fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 34,
                    letterSpacing: '8px', color: '#f4eedd', marginTop: 4,
                    textShadow: '-2px 2px 0 #2a1f4a'
                }}>
                    THE LEAGUE
                </div>
            </div>

            {/* Menu list — NAV_ITEMS unchanged, keyboard + click nav */}
            <ul className="menu-list" style={{ position: 'absolute', left: 48, top: 300, zIndex: 55 }}>
                {NAV_ITEMS.map((item, i) => (
                    <li
                        key={item.path}
                        className={'menu-row' + (i === active ? ' is-active' : '')}
                        onMouseEnter={() => setActive(i)}
                        onClick={() => navigate(item.path)}
                    >
                        <span className="arrow">▸</span>
                        <span>{item.label}</span>
                    </li>
                ))}
            </ul>

            <div className="scanlines" />
            <div className="chroma" />
            <div className="crt-vignette" />
        </div>
    )
}
