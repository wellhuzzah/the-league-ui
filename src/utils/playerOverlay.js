import { createContext, useContext } from 'react'
import { getPlayer } from '../api/players'

// The player overlay: any player name (PlayerName) opens that player's card over the current page by
// pushing ?player=:id. PlayerOverlay (mounted once in App) provides open(id, openerElement) and draws
// the card. Without a provider, open is null and a name is a plain link to /players/:id.
export const PlayerOverlayContext = createContext(null)

export const usePlayerOverlay = () => useContext(PlayerOverlayContext)

// The card's chunk, loaded when an overlay first opens (or on a name's hover/focus prefetch)
export const loadPlayerCard = () => import('../components/PlayerCard')

// Warm the chunk and the card's data; the API client keeps the response for the session
export function prefetchPlayer(id) {
    loadPlayerCard().catch(() => {})
    getPlayer(id).catch(() => {})
}
