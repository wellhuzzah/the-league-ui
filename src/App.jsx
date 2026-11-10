import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Scene from './components/Scene'

// Each page is its own chunk. After a deploy, a tab opened on the previous build can ask for a
// chunk whose hashed file is gone: reload once to pick up the new build instead of failing. The
// session flag stops a reload loop if the chunk is missing for another reason; it is cleared as
// soon as a chunk loads.
const RELOADED = 'chunk-reload'

function session(fn) {
    try { return fn(window.sessionStorage) } catch { return null }    // storage can be blocked
}

function page(load) {
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

const Home       = page(() => import('./pages/Home'))
const SeasonPage = page(() => import('./pages/SeasonPage'))
const Records    = page(() => import('./pages/Records'))
const Draft      = page(() => import('./pages/Draft'))
const TeamPage   = page(() => import('./pages/TeamPage'))
const HeadToHead = page(() => import('./pages/HeadToHead'))
const PlayerPage = page(() => import('./pages/PlayerPage'))
const Tower      = page(() => import('./pages/Tower'))
const NotFound   = page(() => import('./pages/NotFound'))

function Layout() {
    return (
        <div className="app">
            {/* While a page's chunk loads: the empty scene it will draw into */}
            <Suspense fallback={<Scene />}>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/seasons" element={<SeasonPage />} />
                    <Route path="/seasons/:year" element={<SeasonPage />} />
                    <Route path="/records" element={<Records />} />
                    <Route path="/teams" element={<TeamPage />} />
                    <Route path="/teams/:teamId" element={<TeamPage />} />
                    <Route path="/h2h" element={<HeadToHead />} />
                    <Route path="/h2h/:teamIdA/:teamIdB" element={<HeadToHead />} />
                    <Route path="/draft" element={<Draft />} />
                    <Route path="/draft/:year" element={<Draft />} />
                    <Route path="/players" element={<PlayerPage />} />
                    <Route path="/tower" element={<Tower />} />
                    <Route path="*" element={<NotFound />} />
                </Routes>
            </Suspense>
        </div>
    )
}

export default function App() {
    return (
        <BrowserRouter>
            <Layout />
        </BrowserRouter>
    )
}
