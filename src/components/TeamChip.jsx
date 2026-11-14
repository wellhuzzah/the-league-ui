// A player's NFL team (tables.css .rw-nfl). Abbreviations and names are as of that season (OAK in
// 2018, LV from 2020); a season summary reads "OAK→DAL". An unknown team renders nothing: the site
// never guesses a team. Variants:
//   auto  the abbreviation as a chip below 1024px, the full name ("Cincinnati Bengals") from 1024px
//   chip  always the chip (dense spots: H2H box scores, by-team draft cards, the player chooser)
//   text  plain abbreviation after a " · " (where the position is plain text: board stickers, waivers)
export default function TeamChip({ abbrev, name, title, variant = 'auto' }) {
    if (!abbrev) return null
    const label = title ? `${title}: ${name}` : name
    if (variant === 'text') return <span className="rw-nfl-t" title={label}>{abbrev}</span>
    return (
        <span className={variant === 'chip' ? 'rw-nfl chip' : 'rw-nfl'} title={label}>
            <span className="ab">{abbrev}</span>
            {variant !== 'chip' && <span className="full">{name}</span>}
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
