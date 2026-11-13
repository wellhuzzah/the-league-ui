import { Suspense, useCallback, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { PlayerOverlayContext, loadPlayerCard } from '../utils/playerOverlay'
import { isPlayerId, playerPath } from '../utils/playerId'
import { lazyPage } from '../utils/lazyPage'
import CardSkeleton from './CardSkeleton'

// The player card over any page, driven by ?player=:id (the page's other search params are kept).
// Mounted once in App, around the routes; the dialog is portalled to <body>, out of the Scene layout.
//
// History: opening from a name pushes an entry and counts it (location.state.playerOverlayDepth), so
// Back closes the overlay and Close goes back that many entries. A visitor who arrived on a link
// (depth 0) closes by replacing the URL without ?player. Focus returns to the name that opened it.

const PlayerCard = lazyPage(loadPlayerCard)

const depthOf = (location) => location.state?.playerOverlayDepth ?? 0

export default function PlayerOverlay({ children }) {
    const location = useLocation()
    const navigate = useNavigate()
    const opener   = useRef(null)
    const current  = useRef(location)
    useEffect(() => { current.current = location })

    const id = new URLSearchParams(location.search).get('player')

    const open = useCallback((playerId, el) => {
        const loc = current.current
        const params = new URLSearchParams(loc.search)
        if (params.get('player') === String(playerId)) return
        opener.current = el ?? null
        params.set('player', playerId)
        navigate({ pathname: loc.pathname, search: `?${params}`, hash: loc.hash },
                 { state: { playerOverlayDepth: depthOf(loc) + 1 } })
    }, [navigate])

    const close = useCallback(() => {
        const loc = current.current
        const depth = depthOf(loc)
        if (depth > 0) {
            navigate(-depth)
            return
        }
        const params = new URLSearchParams(loc.search)
        params.delete('player')
        const search = params.toString()
        navigate({ pathname: loc.pathname, search: search ? `?${search}` : '', hash: loc.hash }, { replace: true })
    }, [navigate])

    // Closed: give focus back to the name that opened the card, if it is still on the page
    const wasOpen = useRef(false)
    useEffect(() => {
        if (id !== null) { wasOpen.current = true; return }
        if (!wasOpen.current) return
        wasOpen.current = false
        const el = opener.current
        opener.current = null
        if (el?.isConnected) el.focus({ preventScroll: true })
    }, [id])

    const value = useMemo(() => ({ open }), [open])

    return (
        <PlayerOverlayContext.Provider value={value}>
            {children}
            {id !== null && createPortal(<OverlayDialog id={id} navKey={location.key} onClose={close} />, document.body)}
        </PlayerOverlayContext.Provider>
    )
}

// What scrolls behind the dialog: every placard (the page never scrolls; .scene clips it) and the
// document itself. A scroller with a scrollbar keeps its gutter so the page behind doesn't reflow.
// The longhands are saved and restored one by one: Placard sets overflowY inline, and restoring the
// overflow shorthand would wipe it (and the placard's scroll position with it).
function lockScrolling() {
    const els = [...document.querySelectorAll('#root .placard'), document.documentElement, document.body]
    const saved = els.map(el => ({
        el, x: el.style.overflowX, y: el.style.overflowY, gutter: el.style.scrollbarGutter, top: el.scrollTop,
    }))
    for (const el of els) {
        if (el.scrollHeight > el.clientHeight && el.offsetWidth > el.clientWidth) el.style.scrollbarGutter = 'stable'
        el.style.overflowX = 'hidden'
        el.style.overflowY = 'hidden'
    }
    return () => saved.forEach(({ el, x, y, gutter, top }) => {
        el.style.overflowX = x
        el.style.overflowY = y
        el.style.scrollbarGutter = gutter
        el.scrollTop = top
    })
}

function OverlayDialog({ id, navKey, onClose }) {
    const ref    = useRef(null)
    const closed = useRef(false)

    // One close per history entry: Esc, the backdrop and the button can't each step back
    useEffect(() => { closed.current = false }, [navKey])
    const requestClose = () => {
        if (closed.current) return
        closed.current = true
        onClose()
    }

    useEffect(() => {
        const dialog = ref.current
        closed.current = false
        if (!dialog.open) dialog.showModal()
        const unlock = lockScrolling()
        return () => {
            closed.current = true      // closing on unmount is not a request to go back
            unlock()
            if (dialog.open) dialog.close()
        }
    }, [])

    return (
        <dialog
            ref={ref}
            className="rw-ov"
            aria-label="Player card"
            onCancel={e => { e.preventDefault(); requestClose() }}
            onClose={requestClose}
            onClick={e => { if (e.target === ref.current) requestClose() }}
        >
            <div className="rw-data rw-ov-frame">
                <div className="placard placard--data rw-ov-panel">
                    <div className="rw-ov-bar">
                        {isPlayerId(id) && <Link to={playerPath(id)} className="rw-ov-full">Open full page ↗</Link>}
                        <button type="button" className="rw-ov-x" onClick={requestClose} aria-label="Close">✕</button>
                    </div>
                    <Suspense fallback={<CardSkeleton />}>
                        <PlayerCard key={id} id={id} layout="overlay" />
                    </Suspense>
                </div>
            </div>
        </dialog>
    )
}
