export default function Placard({
  variant = 'detached',
  tabs,
  activeTab,
  onTabChange,
  title,
  subtitle,
  season,
  onSeasonPrev,
  onSeasonNext,
  style,
  children
}) {
  const isDetached = variant === 'detached'

  const wrapStyle = isDetached
    ? { position: 'absolute', left: '50%', top: 54, transform: 'translateX(-50%)', width: 1080, zIndex: 50 }
    : { position: 'absolute', left: 56, top: 72, width: 700, zIndex: 50 }

  const padding = isDetached ? '24px 28px 28px' : '20px 22px 22px'

  return (
    <div style={{ ...wrapStyle, ...style }}>
      {tabs && tabs.length > 0 && (
        <div className="placard-tabs" style={{ marginLeft: 24 }}>
          {tabs.map((t, i) => (
            <div
              key={t}
              className={'placard-tab' + (i === activeTab ? ' is-active' : '')}
              onClick={() => onTabChange && onTabChange(i)}
            >
              {t}
            </div>
          ))}
        </div>
      )}

      <div
        className="placard"
        style={{
          padding,
          position: 'relative',
          maxHeight: isDetached ? 'calc(100vh - 110px)' : 'calc(100vh - 80px)',
          overflowY: 'auto',
        }}
      >
        {/* Corner rivets (all variants) */}
        <div className="placard-rivet" style={{ top: isDetached ? 10 : 8, left: isDetached ? 10 : 8 }} />
        <div className="placard-rivet" style={{ top: isDetached ? 10 : 8, right: isDetached ? 10 : 8 }} />
        <div className="placard-rivet" style={{ bottom: isDetached ? 10 : 8, left: isDetached ? 10 : 8 }} />
        <div className="placard-rivet" style={{ bottom: isDetached ? 10 : 8, right: isDetached ? 10 : 8 }} />

        {/* Extra mid-edge rivets for detached (8 total) */}
        {isDetached && (
          <>
            <div className="placard-rivet" style={{ top: 10, left: '50%', transform: 'translateX(-50%)' }} />
            <div className="placard-rivet" style={{ bottom: 10, left: '50%', transform: 'translateX(-50%)' }} />
            <div className="placard-rivet" style={{ top: '50%', left: 10, transform: 'translateY(-50%)' }} />
            <div className="placard-rivet" style={{ top: '50%', right: 10, transform: 'translateY(-50%)' }} />
          </>
        )}

        {/* Header row: title/subtitle left, season picker right */}
        <div style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          marginBottom: isDetached ? 14 : 12
        }}>
          <div>
            {title && (
              <div className="stencil" style={{ fontSize: isDetached ? 36 : 28 }}>{title}</div>
            )}
            {subtitle && (
              <div style={{
                fontFamily: 'var(--f-pixel)', fontSize: isDetached ? 11 : 10,
                letterSpacing: 2, color: '#8a9ab0', marginTop: 4
              }}>
                {subtitle}
              </div>
            )}
          </div>
          {season && (
            <div style={{
              display: 'flex', gap: isDetached ? 6 : 4,
              fontFamily: 'Inter, sans-serif', fontSize: 12, letterSpacing: 1
            }}>
              <div
                onClick={onSeasonPrev}
                style={{
                  padding: isDetached ? '6px 10px' : '4px 8px',
                  background: '#1a1c26', color: '#f4eedd',
                  border: '2px solid #1a1c26', cursor: 'pointer',
                  userSelect: 'none'
                }}
              >◀</div>
              <div style={{
                padding: isDetached ? '6px 10px' : '4px 8px',
                background: 'var(--amber)', color: '#1a1c26',
                border: '2px solid var(--amber)', minWidth: 52, textAlign: 'center'
              }}>
                {season}
              </div>
              <div
                onClick={onSeasonNext}
                style={{
                  padding: isDetached ? '6px 10px' : '4px 8px',
                  background: '#1a1c26', color: '#f4eedd',
                  border: '2px solid #1a1c26', cursor: 'pointer',
                  userSelect: 'none'
                }}
              >▶</div>
            </div>
          )}
        </div>

        {children}
      </div>

      {/* Curve shadow overlay — sits on top of entire placard incl. tabs */}
      <div className="placard-curve" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
    </div>
  )
}
