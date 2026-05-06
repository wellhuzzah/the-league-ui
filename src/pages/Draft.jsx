import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getDraftSeasons, getDraftOrder } from '../api/draft'

function Draft() {
    const { year } = useParams()
    const navigate = useNavigate()
    const [seasons, setSeasons] = useState([])
    const [picks, setPicks] = useState([])
    const [selectedYear, setSelectedYear] = useState(year || null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        getDraftSeasons().then(data => {
            setSeasons(data)
            if (!selectedYear && data.length > 0) {
                const latest = String(data[0].season)
                setSelectedYear(latest)
                navigate(`/draft/${latest}`, { replace: true })
            }
        })
    }, [])

    useEffect(() => {
        if (!selectedYear) return
        setLoading(true)
        getDraftOrder(selectedYear).then(data => {
            setPicks(data)
            setLoading(false)
        })
    }, [selectedYear])

    const handleYearChange = (e) => {
        const y = e.target.value
        setSelectedYear(y)
        navigate(`/draft/${y}`)
    }

    return (
        <main className="page">
            <div className="page-header" style={{ display: 'flex', alignItems: 'flex-end', gap: '1.5rem', flexWrap: 'wrap' }}>
                <div>
                    <h1 className="page-title">Draft History</h1>
                    <p className="page-subtitle">Draft order by season</p>
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
                                    <th>Pick</th>
                                    <th>Owner</th>
                                </tr>
                            </thead>
                            <tbody>
                                {picks.map(row => (
                                    <tr key={row.pick}>
                                        <td style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-condensed)', fontSize: '1.1rem' }}>{row.pick}</td>
                                        <td style={{ fontWeight: 600 }}>{row.owner}</td>
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

export default Draft
