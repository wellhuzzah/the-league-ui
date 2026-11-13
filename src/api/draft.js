import client, { toArray } from './client'

export const getDraftSeasons = () =>
    client.get('/draft/').then(toArray)

// The board by round, plus `value` (picks with season points, steal, bust)
export const getDraft = (year) =>
    client.get(`/draft/${year}`).then(r => r.data)

// The By Team tab: the board's picks grouped by owner (owners A–Z, picks in draft order)
export const draftByTeam = (draft) => {
    const picks = draft.rounds
        .flatMap(r => r.picks.map(p => ({ ...p, round_num: r.round })))
        .sort((a, b) => (a.owner < b.owner ? -1 : a.owner > b.owner ? 1 : a.overall_pick - b.overall_pick))
    const teams = new Map()
    for (const p of picks) {
        if (!teams.has(p.owner)) teams.set(p.owner, { owner: p.owner, team_id: p.team_id, picks: [] })
        teams.get(p.owner).picks.push({
            overall_pick:  p.overall_pick,
            round_num:     p.round_num,
            pick_in_round: p.pick_in_round,
            espn_player_id: p.espn_player_id,
            player_name:   p.player_name,
            position:      p.position,
            is_keeper:     p.is_keeper,
        })
    }
    return { season: draft.season, teams: [...teams.values()] }
}

export const getDraftValueHistory = () =>
    client.get('/draft/value/history').then(r => r.data)
