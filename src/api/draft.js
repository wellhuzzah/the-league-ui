import client from './client'

export const getDraftSeasons = () =>
    client.get('/draft').then(r => r.data)

export const getDraftOrder = (year) =>
    client.get(`/draft/${year}`).then(r => r.data)
