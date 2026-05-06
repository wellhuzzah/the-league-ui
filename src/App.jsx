import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import SeasonPage from './pages/SeasonPage'
import Records from './pages/Records'
import Draft from './pages/Draft'

function Layout() {
    const location = useLocation()
    const isHome = location.pathname === '/'

    return (
        <>
            {!isHome && (
                <nav className="site-nav">
                    <span className="nav-brand">ROCKWOOD</span>
                    <div className="nav-links">
                        <a href="/">Home</a>
                        <a href="/records">All Time</a>
                        <a href="/seasons/2023">Seasons</a>
                        <a href="/draft/2023">Draft</a>
                    </div>
                </nav>
            )}
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/seasons" element={<SeasonPage />} />
                <Route path="/seasons/:year" element={<SeasonPage />} />
                <Route path="/records" element={<Records />} />
                <Route path="/draft" element={<Draft />} />
                <Route path="/draft/:year" element={<Draft />} />
            </Routes>
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
