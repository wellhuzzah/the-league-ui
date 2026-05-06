import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getSeasons, getStandings } from '../api/seasons'

function SeasonPage() {
    const { year } = useParams()
    const navigate = useNavigate()
    const [seasons, setSeasons] = useState([])
    const [standings, setStandings] = useState([])
    const [selectedYear, setSelectedYear] = useState(year || null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        getSeasons().then(data => {
            setSeasons(data)
            if (!selectedYear && data.length > 0) {
                const latest = String(data[0].season)
                setSelectedYear(latest)
                navigate(`/seasons/${latest}`, { replace: true })
            }
        })
    }, [])

    useEffect(() => {
        if (!selectedYear) return
        setLoading(true)
        getStandings(selectedYear).then(data => {
            setStandings(data)
            setLoading(false)
        })
    }, [selectedYear])

    const handleYearChange = (e) => {
        const y = e.target.value
        setSelectedYear(y)
        navigate(`/seasons/${y}`)
    }

    return (
        <main className="page">
            <div className="page-header" style={{ display: 'flex', alignItems: 'flex-end', gap: '1.5rem', flexWrap: 'wrap' }}>
                <div>
                    <h1 className="page-title">Season Standings</h1>
                    <p className="page-subtitle">Final standings by season</p>
                </div>
                <select
                    value={selectedYear || ''}
                    onChange={handleYearChange}
                    style={{
                        background: 'var(--color-surface-2)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text)',
                        padding: '0.4rem 0.75rem',
                        borderRadius: 'var(--radius)',
                        fontFamily: 'var(--font-condensed)',
                        fontSize: '1rem',
                        marginBottom: '0.25rem'
                    }}
                >
                    {seasons.map(s => (
                        <option key={s.season} value={String(s.season)}>{String(s.season)}</option>
                    ))}
                </select>
            </div>

            {loading ? (
                <div className="loading">Loading...</div>
            ) : (
                <div className="card">
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Place</th>
                                    <th>Owner</th>
                                    <th>W</th>
                                    <th>L</th>
                                    <th>PF</th>
                                    <th>PA</th>
                                    <th>Result</th>
                                </tr>
                            </thead>
                            <tbody>
                                {standings.map(row => (
                                    <tr key={row.owner}>
                                        <td style={{ color: 'var(--color-text-muted)' }}>{row.final_standing}</td>
                                        <td style={{ fontWeight: 600 }}>{row.owner}</td>
                                        <td style={{ color: 'var(--color-win)' }}>{row.wins}</td>
                                        <td style={{ color: 'var(--color-loss)' }}>{row.losses}</td>
                                        <td>{Number(row.points_for).toLocaleString()}</td>
                                        <td>{Number(row.points_against).toLocaleString()}</td>
                                        <td>
                                            {row.championship && <span className="badge badge-champion">Champion</span>}
                                            {row.sacko && <span className="badge badge-sacko">Sacko</span>}
                                            {row.most_points && <span className="badge badge-points">Most PF</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </main>
    )
}

export default SeasonPage
