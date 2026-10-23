import client from './client'

// Box scores for a week; teamIds limits it to those teams (both sides of a head-to-head game)
export const getWeekBoxscores = (season, week, teamIds = null) =>
    client.get(`/boxscores/week/${season}/${week}`, { params: { team_id: teamIds } }).then(r => r.data)

export const getPositionSummary = (position) =>
    client.get(`/boxscores/position/${encodeURIComponent(position)}/summary`).then(r => r.data)

export const getRandomPlayer = () =>
    client.get('/boxscores/random-player').then(r => r.data)
