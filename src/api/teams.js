import client from './client'

export const fetchAllTeams = () =>
    client.get('/teams/').then(r => r.data)

export const fetchTeam = (teamId) =>
    client.get(`/teams/${teamId}`).then(r => r.data)
