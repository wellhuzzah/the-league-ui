import { useState, useEffect } from 'react'

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
  onSeasonAll,
  seasonAllActive,
  headerRight,
  style,
  children
}) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 600)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 600)
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const isDetached = variant === 'detached'

  const wrapStyle = isMobile
    ? { position: 'absolute', top: 164, left: 12, right: 12, zIndex: 50 }
    : isDetached
      ? { position: 'absolute', left: '50%', top: 54, transform: 'translateX(-50%)', width: 'min(1320px, calc(100vw - 80px))', zIndex: 50 }
      : { position: 'absolute', left: 56, top: 72, width: 'min(860px, calc(100vw - 420px))', zIndex: 50 }

  // style prop is only applied on desktop — prevents left:376 from TeamPage overriding mobile layout
  const mergedStyle = { ...wrapStyle, ...(isMobile ? {} : style) }

  const padding    = isMobile ? '12px' : (isDetached ? '24px 28px 28px' : '20px 22px 22px')
  const maxHeight  = isMobile ? 'calc(100vh - 200px)' : (isDetached ? 'calc(100vh - 110px)' : 'calc(100vh - 80px)')

  return (
    <div style={mergedStyle}>
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
          maxHeight,
          overflowY: 'auto',
        }}
      >
        {/* Corner rivets (all variants) */}
        {!isMobile && (
          <>
            <div className="placard-rivet" style={{ top: isDetached ? 10 : 8, left: isDetached ? 10 : 8 }} />
            <div className="placard-rivet" style={{ top: isDetached ? 10 : 8, right: isDetached ? 10 : 8 }} />
            <div className="placard-rivet" style={{ bottom: isDetached ? 10 : 8, left: isDetached ? 10 : 8 }} />
            <div className="placard-rivet" style={{ bottom: isDetached ? 10 : 8, right: isDetached ? 10 : 8 }} />
          </>
        )}


        {/* Header row: title/subtitle left, season picker right */}
        <div style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          marginBottom: isDetached ? 14 : 12
        }}>
          <div>
            {title && (
              <div className="stencil" style={{ fontSize: isMobile ? 24 : (isDetached ? 36 : 28), color: '#ffffff', textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000' }}>{title}</div>
            )}
            {subtitle && (
              <div style={{
                fontFamily: 'var(--f-pixel)', fontSize: isMobile ? 12 : (isDetached ? 17 : 15),
                letterSpacing: 2, color: '#ffffff', marginTop: 4,
                textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
              }}>
                {subtitle}
              </div>
            )}
          </div>
          {!season && headerRight && headerRight}
          {season && (
            <div style={{
              display: 'flex', gap: 4,
              fontFamily: 'var(--f-pixel)', fontSize: 12, letterSpacing: 1
            }}>
              <div
                onClick={onSeasonPrev}
                style={{
                  padding: isMobile ? '10px 16px' : (isDetached ? '6px 10px' : '4px 8px'),
                  background: 'var(--steel-4)',
                  color: onSeasonPrev ? 'var(--steel-hi)' : 'var(--steel-2)',
                  border: '1px solid var(--steel-2)',
                  cursor: onSeasonPrev ? 'pointer' : 'default',
                  userSelect: 'none', touchAction: 'manipulation',
                }}
              >◀</div>
              <div
                onClick={seasonAllActive ? onSeasonAll : undefined}
                style={{
                  padding: isMobile ? '10px 14px' : (isDetached ? '6px 10px' : '4px 8px'),
                  background: seasonAllActive ? 'var(--steel-4)' : 'var(--amber)',
                  color: seasonAllActive ? 'var(--steel-hi)' : 'var(--rivet)',
                  border: `1px solid ${seasonAllActive ? 'var(--steel-2)' : 'var(--amber)'}`,
                  minWidth: 52, textAlign: 'center',
                  cursor: seasonAllActive ? 'pointer' : 'default',
                  userSelect: 'none',
                }}
              >
                {season}
              </div>
              <div
                onClick={onSeasonNext}
                style={{
                  padding: isMobile ? '10px 16px' : (isDetached ? '6px 10px' : '4px 8px'),
                  background: 'var(--steel-4)',
                  color: onSeasonNext ? 'var(--steel-hi)' : 'var(--steel-2)',
                  border: '1px solid var(--steel-2)',
                  cursor: onSeasonNext ? 'pointer' : 'default',
                  userSelect: 'none', touchAction: 'manipulation',
                }}
              >▶</div>
              {onSeasonAll && (
                <div
                  onClick={onSeasonAll}
                  style={{
                    marginLeft: 4,
                    padding: isMobile ? '10px 12px' : (isDetached ? '6px 10px' : '4px 8px'),
                    background: seasonAllActive ? 'var(--amber)' : 'var(--steel-4)',
                    color: seasonAllActive ? 'var(--rivet)' : 'var(--steel-hi)',
                    border: `1px solid ${seasonAllActive ? 'var(--amber)' : 'var(--steel-2)'}`,
                    cursor: 'pointer',
                    userSelect: 'none', touchAction: 'manipulation',
                  }}
                >ALL</div>
              )}
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
