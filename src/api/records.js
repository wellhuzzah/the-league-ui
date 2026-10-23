import client from './client'

// Every list on the Records page: standings, scoring, streaks, game records, draft tendencies
export const getRecordsSummary = () =>
    client.get('/records/summary').then(r => r.data)

// Career luck per owner over finished seasons (the Bullshit Index tab)
export const getCareerLuck = () =>
    client.get('/records/luck').then(r => r.data)
