import { useState, useEffect, useRef } from 'react'

// `data`: the data-page look from the table overhaul (tables.css): near-black fill, amber rail,
// square rivets, Inter subtitle, a narrower placard the tables centre in. Pages opt in one at a time.
export default function Placard({
  variant = 'detached',
  data = false,
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

  // A tab strip that scrolls sideways (mobile) keeps the active tab in view
  const tabsRef = useRef(null)
  useEffect(() => {
    const strip = tabsRef.current
    const tab = strip?.children[activeTab]
    if (data && tab && strip.scrollWidth > strip.clientWidth) {
      strip.scrollLeft = tab.offsetLeft - strip.offsetLeft - 24
    }
  }, [data, activeTab, isMobile])

  const isDetached = variant === 'detached'

  const wrapStyle = isMobile
    ? { position: 'absolute', top: 164, left: 12, right: 12, zIndex: 50 }
    : isDetached
      ? { position: 'absolute', left: '50%', top: 54, transform: 'translateX(-50%)', width: data ? 'min(1180px, calc(100vw - 80px))' : 'min(1320px, calc(100vw - 80px))', zIndex: 50 }
      : { position: 'absolute', left: 56, top: 72, width: 'min(860px, calc(100vw - 420px))', zIndex: 50 }

  // style prop is only applied on desktop — prevents left:376 from TeamPage overriding mobile layout
  const mergedStyle = { ...wrapStyle, ...(isMobile ? {} : style) }

  const padding    = data
    ? (isMobile ? '18px 12px 16px' : '30px 44px 40px')
    : (isMobile ? '12px' : (isDetached ? '24px 28px 28px' : '20px 22px 22px'))
  const maxHeight  = isMobile ? 'calc(100vh - 200px)' : (isDetached ? 'calc(100vh - 110px)' : 'calc(100vh - 80px)')

  return (
    <div style={mergedStyle} className={data ? 'rw-data' : undefined}>
      {tabs && tabs.length > 0 && (
        <div className="placard-tabs" role="tablist" ref={tabsRef} style={{ marginLeft: data && isMobile ? 0 : 24 }}>
          {tabs.map((t, i) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={i === activeTab}
              className={'placard-tab' + (i === activeTab ? ' is-active' : '')}
              onClick={() => onTabChange && onTabChange(i)}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      <div
        className={data ? 'placard placard--data' : 'placard'}
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


        {/* Header row: title/subtitle left, season picker right (data placards stack it on phones) */}
        <div className={data ? 'rw-head' : undefined} style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          marginBottom: data ? 22 : (isDetached ? 14 : 12)
        }}>
          {data ? (
            <div>
              {title && <h1 className="rw-title">{title}</h1>}
              <div className="rw-title-bar" />
              {subtitle && <div className="rw-sub">{subtitle}</div>}
            </div>
          ) : <div>
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
          </div>}
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
