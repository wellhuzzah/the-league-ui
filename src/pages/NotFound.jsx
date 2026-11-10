import { Link } from 'react-router-dom'
import Scene from '../components/Scene'
import PixelPhoto from '../components/PixelPhoto'
import TopNav from '../components/TopNav'
import Placard from '../components/Placard'

// Any URL no route matches (including the retired /waivers): the same backdrop as the content pages.
export default function NotFound() {
    return (
        <Scene>
            <PixelPhoto
                src="/tower_320x180.png"
                style={{ opacity: 0.9 }}
            />

            <div style={{
                position: 'absolute', inset: 0,
                background: 'radial-gradient(ellipse at 50% 38%, rgba(255,200,140,0.08), transparent 50%)',
                zIndex: 21
            }} />

            <div className="stencil-paint" style={{
                position: 'absolute', top: 24, left: 32,
                fontSize: 96, opacity: 0.06, color: '#0a0820', zIndex: 23, letterSpacing: '12px'
            }}>
                ROCKWOOD
            </div>

            <TopNav />

            <Placard variant="detached" title="404: FUMBLE" subtitle="THAT PLAY ISN'T IN THE BOOK">
                <p style={{ marginBottom: 18, color: '#e8e4d4' }}>
                    Nothing lives at this address. Check the link, or pick a page from the menu.
                </p>
                <Link
                    to="/"
                    style={{
                        display: 'inline-block',
                        fontFamily: 'var(--f-pixel)', fontSize: 12, letterSpacing: 2,
                        padding: '8px 14px',
                        background: 'var(--amber)', color: 'var(--rivet)',
                        border: '1px solid var(--amber)',
                    }}
                >
                    ◀ BACK TO HOME
                </Link>
            </Placard>
        </Scene>
    )
}
