import client from './client'

export const getAlltimeStandings = () =>
    client.get('/records/alltime').then(r => r.data)

export const getHighestSeasonScores = () =>
    client.get('/records/scoring/highest-season').then(r => r.data)

export const getLowestSeasonScores = () =>
    client.get('/records/scoring/lowest-season').then(r => r.data)

export const getBestSingleWeek = () =>
    client.get('/records/scoring/best-single-week').then(r => r.data)

export const getWorstSingleWeek = () =>
    client.get('/records/scoring/worst-single-week').then(r => r.data)

export const getWinStreaks = () =>
    client.get('/records/streaks/wins').then(r => r.data)

export const getLossStreaks = () =>
    client.get('/records/streaks/losses').then(r => r.data)

export const getBiggestBlowouts = () =>
    client.get('/matchups/records/biggest-blowouts').then(r => r.data)

export const getClosestGames = () =>
    client.get('/matchups/records/closest-games').then(r => r.data)

export const getDraftByOwner = () =>
    client.get('/records/draft/by-owner').then(r => r.data)
