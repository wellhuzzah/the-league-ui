import { useNavigate } from 'react-router-dom'

const NAV_ITEMS = [
    { label: 'Season Standings', path: '/seasons/2023' },
    { label: 'All-Time Records', path: '/records' },
    { label: 'Draft History', path: '/draft/2023' },
    { label: 'Team Pages', path: '/teams' },
    { label: 'Head to Head', path: '/h2h' },
]

export default function Home() {
    const navigate = useNavigate()

    return (
        <div className="home-hero">
            <div className="home-bg">
                <div className="home-fade" />
            </div>

            <div className="home-corner tl" />
            <div className="home-corner tr" />
            <div className="home-corner bl" />
            <div className="home-corner br" />

            <div className="home-content">
                <h1 className="home-title">THE<br />LEAGUE</h1>

                <ul className="home-menu">
                    {NAV_ITEMS.map((item) => (
                        <li
                            key={item.path}
                            className="home-menu-item"
                            onClick={() => navigate(item.path)}
                        >
                            {item.label}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    )
}
