import PixelPhoto from './PixelPhoto'

// The scenery behind a data page's placard: the dithered tower, muted so it reads as atmosphere
// around the panel, a warm glow, and the faint ROCKWOOD paint.
export default function DataBackdrop({ src = '/tower_320x180.png' }) {
    return (
        <>
            <PixelPhoto src={src} style={{ opacity: 0.55 }} />
            <div style={{
                position: 'absolute', inset: 0,
                background: 'radial-gradient(ellipse at 50% 38%, rgba(255,200,140,0.06), transparent 50%), rgba(10,8,32,0.35)',
                zIndex: 21,
            }} />
            <div className="stencil-paint" style={{
                position: 'absolute', top: 24, left: 32,
                fontSize: 96, opacity: 0.06, color: '#0a0820', zIndex: 23, letterSpacing: '12px',
            }}>
                ROCKWOOD
            </div>
        </>
    )
}
