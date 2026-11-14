// A player's NFL team (tables.css .rw-nfl): the abbreviation as a chip below 1024px, the full name
// ("Cincinnati Bengals") from 1024px. Abbreviations and names are as of that season (OAK in 2018,
// LV from 2020). An unknown team renders nothing: the site never guesses a team.
export default function TeamChip({ abbrev, name, title }) {
    if (!abbrev) return null
    return (
        <span className="rw-nfl" title={title ? `${title}: ${name}` : name}>
            <span className="ab">{abbrev}</span>
            <span className="full">{name}</span>
        </span>
    )
}

// The credit nflverse's licence (CC BY 4.0) asks for, under any table that shows teams
export const NflTeamCredit = () => (
    <p className="rw-note rw-nfl-credit">
        NFL teams from ESPN and <a href="https://github.com/nflverse/nflverse-data" target="_blank" rel="noreferrer">nflverse</a> (CC BY 4.0).
        A blank team means it couldn&rsquo;t be confirmed.
    </p>
)
