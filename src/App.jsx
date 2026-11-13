import { Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Scene from './components/Scene'
import PlayerOverlay from './components/PlayerOverlay'
import { lazyPage as page } from './utils/lazyPage'

// Each page is its own chunk (lazyPage reloads once if a deploy removed it)
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
                    {/* Any id string: the card shows "no such player" for one that isn't /^-?\d+$/ */}
                    <Route path="/players/:playerId" element={<PlayerPage />} />
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
            {/* ?player=:id on any page opens that player's card over it */}
            <PlayerOverlay>
                <Layout />
            </PlayerOverlay>
        </BrowserRouter>
    )
}
