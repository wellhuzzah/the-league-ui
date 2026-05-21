import axios from 'axios'

// Single Axios instance for all API calls
// Change this one URL to point anywhere — dev, prod, doesn't matter
const client = axios.create({
    baseURL: 'https://theleague.letsfriggen.party/api',
    headers: {
        'Content-Type': 'application/json'
    }
})

// Unwraps bare arrays and single-key wrapper objects ({ teams: [...] }, etc.)
export const toArray = (r) => {
    if (Array.isArray(r.data)) return r.data
    if (r.data && typeof r.data === 'object') {
        const found = Object.values(r.data).find(Array.isArray)
        if (found) return found
    }
    return []
}

export default client
