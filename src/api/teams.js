import client, { toArray } from './client'

export const fetchAllTeams = () =>
    client.get('/teams/').then(toArray)

export const fetchTeam = (teamId) =>
    client.get(`/teams/${teamId}`).then(r => r.data)
