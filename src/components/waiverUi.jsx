// Shared UI pieces for the waiver views (Records Waivers, Seasons Waiver Wire, Teams Waivers)
import { LOST_COLOR } from './waiverFormat'

export const ControlLabel = ({ children }) => (
    <span style={{
        fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 600,
        letterSpacing: '0.1em', textTransform: 'uppercase', color: LOST_COLOR,
    }}>
        {children}
    </span>
)

export const Note = ({ children, style }) => (
    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: LOST_COLOR, lineHeight: 1.6, ...style }}>
        {children}
    </p>
)

// Header cell that is a label only, not a sort control
export const H = ({ children, align = 'left', style }) => (
    <th style={{ textAlign: align, cursor: 'default', ...style }}>{children}</th>
)

// "Darren Waller TE"
export const PlayerName = ({ name, position }) => (
    <>
        {name}
        {position && <span style={{ color: LOST_COLOR, fontSize: 11, marginLeft: 6 }}>{position}</span>}
    </>
)
