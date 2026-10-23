// Small fetch wrapper with axios's surface (get/post resolving to { data }), so call sites read the
// same. Same-origin '/api': Caddy proxies it in production, the Vite dev server in dev.
//
// GETs are shared: a request already in flight is reused, and the answer is kept for the session
// (league data changes once a week). Random picks and the Tower are never cached. Every caller
// gets its own copy, so a page that changes a response can't change what the next page sees.

const BASE = '/api'
const NO_CACHE = [/\/random/, /^\/tower\//]
const cache = new Map()     // url -> Promise of parsed JSON

const withParams = (path, params) => {
    const qs = new URLSearchParams()
    for (const [key, value] of Object.entries(params || {})) {
        if (value === undefined || value === null) continue
        for (const v of Array.isArray(value) ? value : [value]) qs.append(key, v)
    }
    const s = qs.toString()
    return s ? `${path}?${s}` : path
}

async function request(method, url, body) {
    const res = await fetch(BASE + url, {
        method,
        headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
    })
    if (!res.ok) {
        const err = new Error(`${method} ${url} -> ${res.status}`)
        err.response = { status: res.status }
        throw err
    }
    return res.json()
}

const client = {
    get(path, { params } = {}) {
        const url = withParams(path, params)
        if (NO_CACHE.some(re => re.test(url))) {
            return request('GET', url).then(data => ({ data }))
        }
        if (!cache.has(url)) {
            const pending = request('GET', url)
            cache.set(url, pending)
            pending.catch(() => cache.delete(url))     // failures aren't kept; the next call retries
        }
        return cache.get(url).then(data => ({ data: structuredClone(data) }))
    },
    post(path, body) {
        return request('POST', path, body).then(data => ({ data }))
    },
}

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
