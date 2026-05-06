import client from './client'

export const getSeasons = () =>
    client.get('/seasons').then(r => r.data)

export const getStandings = (year) =>
    client.get(`/seasons/${year}/standings`).then(r => r.data)
