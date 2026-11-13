import { lazy } from 'react'

// A lazily loaded chunk (each page, the player card). After a deploy, a tab opened on the previous
// build can ask for a chunk whose hashed file is gone: reload once to pick up the new build instead
// of failing. The session flag stops a reload loop if the chunk is missing for another reason; it is
// cleared as soon as a chunk loads.
const RELOADED = 'chunk-reload'

function session(fn) {
    try { return fn(window.sessionStorage) } catch { return null }    // storage can be blocked
}

export function lazyPage(load) {
    return lazy(() => load().then(
        module => { session(s => s.removeItem(RELOADED)); return module },
        err => {
            if (!session(s => s.getItem(RELOADED)) && session(s => (s.setItem(RELOADED, '1'), true))) {
                window.location.reload()
                return new Promise(() => {})    // never settles: the page is reloading
            }
            throw err
        }))
}
