// League time: the Waiver Wire's day headers and row times are Eastern (America/New_York), the
// zone the league's schedule runs on. ESPN's waiver run lands just after 3am Eastern, so a Tuesday
// night run heads as Wednesday.
const TZ = 'America/New_York'

const dayParts = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short', month: 'numeric', day: 'numeric' })
const timeFmt  = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit' })
const isoDay   = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })

// "2025-10-29": groups rows by Eastern date
export const leagueDayKey = (iso) => isoDay.format(new Date(iso))

// "WED 10/29"
export function leagueDayLabel(iso) {
    const p = Object.fromEntries(dayParts.formatToParts(new Date(iso)).map(x => [x.type, x.value]))
    return `${p.weekday.toUpperCase()} ${p.month}/${p.day}`
}

// "3:08a", "12:51p"
export const leagueTime = (iso) =>
    timeFmt.format(new Date(iso)).replace(/\s?([AP])M$/i, (_, m) => m.toLowerCase())

// The minute a row happened in: rows of one waiver run share it
export const leagueMinute = (iso) => Math.floor(new Date(iso).getTime() / 60000)
