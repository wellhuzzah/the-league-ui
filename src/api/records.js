import client from './client'

export const getAlltimeStandings = () =>
    client.get('/records/alltime').then(r => r.data)
