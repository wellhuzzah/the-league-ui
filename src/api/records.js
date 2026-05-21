import client, { toArray } from './client'

export const getAlltimeStandings = () =>
    client.get('/records/alltime').then(toArray)

export const getHighestSeasonScores = () =>
    client.get('/records/scoring/highest-season').then(toArray)

export const getLowestSeasonScores = () =>
    client.get('/records/scoring/lowest-season').then(toArray)

export const getBestSingleWeek = () =>
    client.get('/records/scoring/best-single-week').then(toArray)

export const getWorstSingleWeek = () =>
    client.get('/records/scoring/worst-single-week').then(toArray)

export const getWinStreaks = () =>
    client.get('/records/streaks/wins').then(toArray)

export const getLossStreaks = () =>
    client.get('/records/streaks/losses').then(toArray)

export const getBiggestBlowouts = () =>
    client.get('/matchups/records/biggest-blowouts').then(toArray)

export const getClosestGames = () =>
    client.get('/matchups/records/closest-games').then(toArray)

export const getDraftByOwner = () =>
    client.get('/records/draft/by-owner').then(toArray)

export const getHighestLosingScores = () =>
    client.get('/records/scoring/highest-losing-scores').then(toArray)

export const getLowestWinningScores = () =>
    client.get('/records/scoring/lowest-winning-scores').then(toArray)
