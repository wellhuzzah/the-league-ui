import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import PixelPhoto from '../components/PixelPhoto'
import Fireflies from '../components/Fireflies'
import DriftingClouds from '../components/DriftingClouds'
import useMenuNav from '../components/useMenuNav'

const NAV_ITEMS = [
    { label: 'Season Standings', path: '/seasons/2023' },
    { label: 'All-Time Records', path: '/records' },
    { label: 'Draft History', path: '/draft/2023' },
    { label: 'Team Pages', path: '/teams' },
    { label: 'Head to Head', path: '/h2h' },
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
        <div className="scene">
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

            <Fireflies count={5} area={{ left: 55, right: 90, top: 30, bottom: 60 }} />

            {/* Title block */}
            <div style={{ position: 'absolute', left: 64, top: 60, zIndex: 50 }}>
                <div className="title-sub" style={{ marginBottom: 12 }}>· EST. 2005 ·</div>
                <div className="title-rockwood" style={{ fontSize: 96 }}>ROCKWOOD</div>
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
                        <span className="num">{String(i + 1).padStart(2, '0')}</span>
                        <span className="arrow">▸</span>
                        <span>{item.label}</span>
                    </li>
                ))}
            </ul>

            {/* Footer chrome */}
            <div className="scene-footer">
                <div>
                    <span className="lbl">PROFILE:</span> el presidente
                    <span style={{ marginLeft: 24 }} className="lbl">SEASON:</span> 2025
                </div>
                <div className="hint">
                    <span className="key">↑↓</span> select
                    <span className="key" style={{ marginLeft: 8 }}>↵</span> enter
                    <span style={{ marginLeft: 24, color: '#8a8c98' }}>v.0.12</span>
                </div>
            </div>

            <div className="scanlines" />
            <div className="chroma" />
            <div className="crt-vignette" />
        </div>
    )
}
