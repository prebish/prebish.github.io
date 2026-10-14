# prebish.github.io

Personal portfolio site for Joel Prebish, hosted on GitHub Pages at [prebish.github.io](https://prebish.github.io).

## Structure

- `index.html` — the one portfolio page (Home, Projects, Timeline, CV tabs; the floating dock is the only navigation)
- `static/style.css` / `static/style.js` — base styles and page logic (card, tabs, projects, timeline)
- `static/effects.js` — the extras: style cycle (default → terminal → Wall Street, each with its own wipe), custom cursor + magnetic dock, word-split and scroll reveals, the ticker header, intro, email-copy toast
- `static/crt.css` — the "terminal" skin (`html[data-theme="crt"]`); `static/wallst.css` — the "Wall Street" skin (`html[data-theme="wallst"]`), where the ticker header becomes an LED quote board
- `static/fridge.js` + `static/fridge.json` — fridge mode (see below)
- `static/*.json` — content data
- `scripts/fridge-sync.mjs` + `.github/workflows/fridge-sync.yml` — folds visitors' fridge moves into `fridge.json`
- `consulting/index.html` — a one-file placeholder for Prebish Consulting (marked work in progress)
- `Joel_Prebish_Resume_public.pdf` — resume shown in the CV tab

The Projects tab is curated from `static/projects.json`; the "More on GitHub" list under it is pulled live from the GitHub API and cached in `sessionStorage` for an hour.

## Editing content

- Business card: `static/business-card.json`
- Featured cards: `static/featured.json`
- Spotlight projects: `static/projects.json`
- Career timeline: `static/career.json`
- Ticker header (the ribbon across the top): `static/skills.json`

## Fridge mode

The magnet button in the dock turns the current tab into a fridge door: on Home the business card and featured cards; on Projects the title, intro, project cards and the GitHub box; on Timeline the title and each entry; on CV the toolbar and the viewer. Anyone can drag them (mouse, touch, or arrow keys on a focused magnet; the gold disc is a handle). The arrangement is **shared**: whatever the last visitor left is what the next one sees.

How it works without a backend:

1. `static/fridge.json` in this repo is the source of truth. Positions are each magnet's top-centre anchor as fractions of the door's width and height, so one layout fits every screen. A magnet nobody has moved yet simply sits where the normal layout puts it.
2. When a visitor drops a magnet, the browser publishes a tiny JSON message (`{"id":"featured-1","x":0.31,"y":0.58}`) to a public [ntfy.sh](https://ntfy.sh) topic named in `fridge.json`. No account, no key; ntfy.sh keeps the last 12 hours of a topic and allows 250 messages per day per visitor.
3. Every page load reads `fridge.json`, then the topic's messages newer than the file's `updated` timestamp, and applies them.
4. `.github/workflows/fridge-sync.yml` runs `scripts/fridge-sync.mjs` every 20 minutes. It folds new messages into `fridge.json` and commits only when something moved, so the git history is the fridge's history.

Resetting or re-keying the fridge is a plain edit to `static/fridge.json`: set the positions you want, bump `updated` to the current Unix time (older messages are then ignored), and change `topic` if you want a fresh channel. Messages that are not valid moves, or that name an unknown magnet, are ignored by both the page and the sync script.

Known limits: the topic is public, so anyone can move things (that is the point) or post junk (ignored). If ntfy.sh is unreachable, the committed layout still renders and only new moves stop. GitHub pauses scheduled workflows after 60 days without repository activity; run "Fridge sync" by hand from the Actions tab to wake it.

## Run locally

Any static file server works, e.g.:

```sh
python -m http.server 8000
# then open http://localhost:8000
```

`node scripts/fridge-sync.mjs` can be run by hand from the repo root; it only writes `static/fridge.json` when a magnet moved.
