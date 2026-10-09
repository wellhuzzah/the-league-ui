import client, { toArray } from './client'

// Seasons with transaction data, each with the weeks that have moves
export const getTransactionSeasons = () =>
    client.get('/transactions/seasons').then(toArray)

export const getWeekTransactions = (season, week) =>
    client.get(`/transactions/season/${season}/week/${week}`).then(r => r.data)

export const getTeamTransactions = (teamId) =>
    client.get(`/transactions/team/${teamId}`).then(r => r.data)

// Every move a team made in one season, same row shape as the week view
export const getTeamSeasonTransactions = (teamId, season) =>
    client.get(`/transactions/team/${teamId}/season/${season}`).then(r => r.data)

// Exact name match by default; the API resolves it to the ESPN player id
export const getPlayerTransactions = (playerName) =>
    client.get(`/transactions/player/${encodeURIComponent(playerName)}`).then(r => r.data)

const recordParams = (season, limit) => {
    const params = { limit }
    if (season) params.season = season
    return params
}

export const getBiggestBids = (season = null, limit = 25) =>
    client.get('/transactions/records/biggest-bids', { params: recordParams(season, limit) }).then(toArray)

export const getBiggestLosingBids = (season = null, limit = 25) =>
    client.get('/transactions/records/biggest-losing-bids', { params: recordParams(season, limit) }).then(toArray)

export const getBiggestOverpays = (season = null, limit = 25) =>
    client.get('/transactions/records/biggest-overpays', { params: recordParams(season, limit) }).then(toArray)

export const getMostContested = (season = null, limit = 25) =>
    client.get('/transactions/records/most-contested', { params: recordParams(season, limit) }).then(toArray)

// min_games is always sent explicitly; never rely on the endpoint default
export const getBargains = ({ paid, sort, minGames, season = null, limit = 25 }) =>
    client.get('/transactions/records/bargains', {
        params: { paid, sort, min_games: minGames, limit, ...(season ? { season } : {}) },
    }).then(toArray)
