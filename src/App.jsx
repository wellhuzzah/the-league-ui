import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import Home from './pages/Home'
import SeasonPage from './pages/SeasonPage'
import Records from './pages/Records'
import Draft from './pages/Draft'
import TeamPage from './pages/TeamPage'
import HeadToHead from './pages/HeadToHead'
import PlayerPage from './pages/PlayerPage'

// Pages with Scene (full-screen pixel layout) own their layout outside WithNav.
function Layout() {
    return (
        <div className="app">
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
                <Route path="*" element={<WithNav />} />
            </Routes>
        </div>
    )
}

function WithNav() {
    return (
        <>
            <nav className="nav">
                <span className="nav-brand">ROCKWOOD</span>
                <NavLink to="/" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
                    Home
                </NavLink>
                <NavLink to="/records" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
                    All Time
                </NavLink>
                <NavLink to="/seasons/2025" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
                    Seasons
                </NavLink>
                <NavLink to="/draft/2025" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
                    Draft
                </NavLink>
                <NavLink to="/teams" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
                    Teams
                </NavLink>
                <NavLink to="/h2h" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
                    H2H
                </NavLink>
                <NavLink to="/players" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
                    Players
                </NavLink>
            </nav>
        </>
    )
}

export default function App() {
    return (
        <BrowserRouter>
            <Layout />
        </BrowserRouter>
    )
}
