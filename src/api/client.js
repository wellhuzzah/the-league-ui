import axios from 'axios'

// Single Axios instance for all API calls
// Same-origin '/api': Caddy proxies it in production, the Vite dev server in dev.
// No default Content-Type, so GETs don't trigger a CORS preflight; axios sets
// application/json itself on POSTs with an object body.
const client = axios.create({
    baseURL: '/api',
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
