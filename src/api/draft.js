import client, { toArray } from './client'

export const getDraftSeasons = () =>
    client.get('/draft/').then(toArray)

export const getDraft = (year) =>
    client.get(`/draft/${year}`).then(r => r.data)

export const getDraftByTeam = (year) =>
    client.get(`/draft/${year}/by-team`).then(r => r.data)

export const getKeepers = (year) =>
    client.get(`/draft/${year}/keepers`).then(r => r.data)

export const searchPlayer = (name) =>
    client.get(`/draft/player/${encodeURIComponent(name)}`).then(r => r.data)

export const getDraftTendencies = () =>
    client.get('/draft/tendencies').then(r => r.data)

export const getDraftValue = (year) =>
    client.get(`/draft/${year}/value`).then(r => r.data)

export const getDraftValueHistory = () =>
    client.get('/draft/value/history').then(r => r.data)
