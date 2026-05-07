import client from './client'

export const getDraftSeasons = () =>
    client.get('/draft/').then(r => r.data)

export const getDraft = (year) =>
    client.get(`/draft/${year}`).then(r => r.data)

export const getDraftByTeam = (year) =>
    client.get(`/draft/${year}/by-team`).then(r => r.data)

export const getKeepers = (year) =>
    client.get(`/draft/${year}/keepers`).then(r => r.data)

export const searchPlayer = (name) =>
    client.get(`/draft/player/${encodeURIComponent(name)}`).then(r => r.data)
