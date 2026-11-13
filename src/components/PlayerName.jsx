import { useRef } from 'react'
import { usePlayerOverlay, prefetchPlayer } from '../utils/playerOverlay'
import { isPlayerId, playerPath } from '../utils/playerId'

const PREFETCH_DELAY = 120    // ms of hover/focus before the card is fetched

// A player's name, linked by ESPN player id (never by name). A plain left click opens the card over
// the current page; ctrl/cmd/shift/alt and middle clicks fall through to the real href (new tab,
// new window). Clicks never reach an enclosing clickable row. Without a valid id: plain text.
export default function PlayerName({ id, name, className }) {
    const overlay = usePlayerOverlay()
    const timer = useRef(null)

    if (!isPlayerId(id)) return <>{name}</>

    const startPrefetch = () => {
        clearTimeout(timer.current)
        timer.current = setTimeout(() => prefetchPlayer(id), PREFETCH_DELAY)
    }
    const stopPrefetch = () => clearTimeout(timer.current)

    const onClick = (e) => {
        e.stopPropagation()
        if (!overlay || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
        e.preventDefault()
        overlay.open(id, e.currentTarget)
    }

    return (
        <a
            href={playerPath(id)}
            className={className ? `rw-pname ${className}` : 'rw-pname'}
            onClick={onClick}
            onAuxClick={e => e.stopPropagation()}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') e.stopPropagation() }}
            onMouseEnter={startPrefetch}
            onMouseLeave={stopPrefetch}
            onFocus={startPrefetch}
            onBlur={stopPrefetch}
        >
            {name}
        </a>
    )
}
