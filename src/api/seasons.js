import client, { toArray } from './client'

export const getSeasons = () =>
    client.get('/seasons/').then(toArray)

// { standings, weekly_scores, luck, top_scorer } for one season
export const getSeason = (year) =>
    client.get(`/seasons/${year}`).then(r => r.data)
