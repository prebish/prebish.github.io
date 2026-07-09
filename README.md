# prebish.github.io

Personal portfolio site for Joel Prebish, hosted on GitHub Pages at [prebish.github.io](https://prebish.github.io).

## Structure

- `index.html` — main portfolio page (Featured, Projects, Timeline, CV tabs)
- `static/style.css` / `static/style.js` — styles and page logic
- `static/*.json` — content data (business card, featured cards, career timeline)
- `consulting/` — standalone Prebish Consulting landing page
- `Joel_Prebish_Resume_public.pdf` — resume shown in the CV tab

The Projects tab is populated live from the GitHub API (`/users/prebish/repos`), cached in `sessionStorage` for an hour.

## Editing content

- Business card: `static/business-card.json`
- Featured cards: `static/featured.json`
- Career timeline: `static/career.json`

## Run locally

Any static file server works, e.g.:

```sh
python -m http.server 8000
# then open http://localhost:8000
```
