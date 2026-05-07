import client from './client'

export const getSeasons = () =>
    client.get('/seasons').then(r => r.data)

export const getStandings = (year) =>
    client.get(`/seasons/${year}/standings`).then(r => r.data)

export const getWeeklyScores = (year) =>
    client.get(`/seasons/${year}/weekly-scores`).then(r => r.data)

export const getLuck = (year) =>
    client.get(`/seasons/${year}/luck`).then(r => r.data)
