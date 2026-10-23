import client from './client'

export const getH2H = (teamIdA, teamIdB) =>
    client.get(`/matchups/h2h/${teamIdA}/${teamIdB}`).then(r => r.data)

export const getRandomH2H = () =>
    client.get('/matchups/random-h2h').then(r => r.data)
