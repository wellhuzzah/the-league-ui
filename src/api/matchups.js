import client from './client'

export const getH2H = (teamIdA, teamIdB) =>
    client.get(`/matchups/h2h/${teamIdA}/${teamIdB}`).then(r => r.data)

export const getSeasonMatchups = (year) =>
    client.get(`/matchups/season/${year}`).then(r => r.data)

export const getWeekMatchups = (year, week) =>
    client.get(`/matchups/season/${year}/week/${week}`).then(r => r.data)
