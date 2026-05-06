import { useEffect, useState } from 'react'
import { getAlltimeStandings } from '../api/records'

function Records() {
    const [standings, setStandings] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        getAlltimeStandings()
            .then(data => {
                setStandings(data)
                setLoading(false)
            })
            .catch(err => {
                console.error(err)
                setLoading(false)
            })
    }, [])

    if (loading) return <div className="loading">Loading...</div>

    return (
        <main className="page">
            <div className="page-header">
                <h1 className="page-title">All-Time Records</h1>
                <p className="page-subtitle">15 seasons • 2009–2023</p>
            </div>
            <div className="card">
                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Owner</th>
                                <th>Seasons</th>
                                <th>W</th>
                                <th>L</th>
                                <th>Win %</th>
                                <th>PF</th>
                                <th>PA</th>
                                <th>🏆</th>
                                <th>💀</th>
                            </tr>
                        </thead>
                        <tbody>
                            {standings.map((row, i) => (
                                <tr key={row.owner}>
                                    <td style={{ color: 'var(--color-text-muted)' }}>{i + 1}</td>
                                    <td style={{ fontWeight: 600 }}>{row.owner}</td>
                                    <td>{row.seasons_played}</td>
                                    <td style={{ color: 'var(--color-win)' }}>{row.total_wins}</td>
                                    <td style={{ color: 'var(--color-loss)' }}>{row.total_losses}</td>
                                    <td>{(row.win_pct * 100).toFixed(1)}%</td>
                                    <td>{row.total_points_for.toLocaleString()}</td>
                                    <td>{row.total_points_against.toLocaleString()}</td>
                                    <td>
                                        {row.championships > 0 && (
                                            <span className="badge badge-champion">{row.championships}</span>
                                        )}
                                    </td>
                                    <td>
                                        {row.sackos > 0 && (
                                            <span className="badge badge-sacko">{row.sackos}</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </main>
    )
}

export default Records
