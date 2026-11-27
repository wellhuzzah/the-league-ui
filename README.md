# Rockwood UI

The front end for The League: Rockwood fantasy football history since 2009. React + Vite, served
as a static build.

## Running and deploying

```
npm run dev      # Vite dev server on :5174; proxies /api to the API on 127.0.0.1:8001
npm run lint
npm run build    # writes dist/
```

**`npm run build` changes the live site.** Caddy serves `dist/` directly, so a build is a deploy.

All data comes from the API in the backend repo (`C:\projects\rockwood`, FastAPI, `app/routers/`),
called as same-origin `/api/...` (`src/api/`). Caddy proxies that in production, and the Vite dev
server does it in development. The client caches GET responses for the session, since league data
changes once a week (the backend's Thursday import).

## Pages

| Route | Page |
|---|---|
| `/` | Home menu |
| `/seasons/:year` | Season: standings, weekly scores, Bullshit Index, waiver wire, and (current season) playoffs |
| `/records` | All-time records |
| `/teams/:teamId` | One owner's career |
| `/h2h/:a/:b` | Head to head |
| `/draft/:year` | Draft board, by team, player draft history |
| `/players/:id` | Player search and card, Position Explorer |
| `/tower` | Hidden trivia game (not in the nav) |

Any player name opens that player's card over the current page (`?player=:id`).

## Season page: the playoff picture

For the season in progress only:

- **Standings tags.** IN (clinched a playoff spot), PLAY-IN (holding the #8 or #9 seed right now)
  and OUT (eliminated), with a key under the table. They come from each standings row's `playoff`
  field in `/seasons/:year`.
- **Playoffs tab.** The winners bracket from `/seasons/:year/bracket`
  (`src/components/PlayoffBracket.jsx`). Before week 8 is final it says it's too soon. Through
  week 13 it's projected from ESPN's current seeds. After that it's the real bracket, filling in
  each week's results. Every round is reseeded (best seed left plays the worst), so the
  quarterfinals are known before the play-in is played. Under 720px the rounds stack and byes are
  hidden.

Seeds, clinches and ESPN's playoff odds are imported weekly by the backend's
`playoff_status_import.py` (the Thursday job's `standings` step); the bracket rules live in its
`app/playoffs.py`. Playoff odds are stored week by week but not shown anywhere yet.
