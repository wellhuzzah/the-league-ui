import client from './client'

// Up to 20 players whose name contains q: { players: [{ espn_player_id, player_name, position,
// appearances, drafted }] }, best career game first
export const searchPlayers = (q) =>
    client.get('/players/search', { params: { q } }).then(r => r.data)

// One player's card: { box, draft, transactions } by ESPN player id
export const getPlayer = (espnPlayerId) =>
    client.get(`/players/${espnPlayerId}`).then(r => r.data)
