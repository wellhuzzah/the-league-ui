import client, { toArray } from './client'

export const getSeasons = () =>
    client.get('/seasons/').then(toArray)

// { standings, weekly_scores, luck, top_scorer } for one season
export const getSeason = (year) =>
    client.get(`/seasons/${year}`).then(r => r.data)

// The winners bracket: { mode: 'none' | 'too_soon' | 'projected' | 'playoffs', through_week,
// from_week, playoff_teams, first_week, rounds: [{ week, name, games: [{ slots }] }] }
export const getBracket = (year) =>
    client.get(`/seasons/${year}/bracket`).then(r => r.data)
