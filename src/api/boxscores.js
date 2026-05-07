import client from './client'

export const getTopPerformances = (limit = 25, position = null) => {
    const params = { limit }
    if (position) params.position = position
    return client.get('/boxscores/top-performances', { params }).then(r => r.data)
}

export const getTeamBestWeeks = (teamId, limit = 20) =>
    client.get(`/boxscores/team/${teamId}/best-weeks`, { params: { limit } }).then(r => r.data)

export const getTeamPositionTotals = (teamId) =>
    client.get(`/boxscores/team/${teamId}/position-totals`).then(r => r.data)

export const getPlayerHistory = (playerName) =>
    client.get(`/boxscores/player/${encodeURIComponent(playerName)}/history`).then(r => r.data)

export const getWeekBoxscores = (season, week) =>
    client.get(`/boxscores/week/${season}/${week}`).then(r => r.data)

export const getPositionBreakdown = () =>
    client.get('/boxscores/position-breakdown').then(r => r.data)

export const getPositionSummary = (position) =>
    client.get(`/boxscores/position/${encodeURIComponent(position)}/summary`).then(r => r.data)

export const getRandomPlayer = () =>
    client.get('/boxscores/random-player').then(r => r.data)
