import client, { toArray } from './client'

export const getSeasons = () =>
    client.get('/seasons/').then(toArray)

export const getStandings = (year) =>
    client.get(`/seasons/${year}/standings`).then(toArray)

export const getWeeklyScores = (year) =>
    client.get(`/seasons/${year}/weekly-scores`).then(toArray)

export const getLuck = (year) =>
    client.get(`/seasons/${year}/luck`).then(toArray)

export const getSeasonTopScorer = (year) =>
    client.get(`/seasons/${year}/top-scorer`).then(r => r.data)
