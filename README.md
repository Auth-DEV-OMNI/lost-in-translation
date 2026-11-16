# Lost in Translation

> Play telephone with Google Translate, with configurable source and target languages.

Lost in Translation takes your text, runs it through a configurable number of
random languages via Google Translate, then translates to your selected target language. The
compounding translation errors produce hilariously broken output — the more hops,
the worse the result.

This local fork adds independent source and target language selectors to
[cjstahoviak/lost-in-translation](https://github.com/cjstahoviak/lost-in-translation).
The upstream demo does **not** include these changes.

## Language selection / 语言选择

- **Source language / 源语言**: choose a language or Auto-detect / 自动检测.
- **Target language / 目标语言**: choose the final output language independently.
- Defaults: automatic source detection and Simplified Chinese output.
- Language choices are remembered locally when browser storage is available.
- Random intermediate hops avoid the current language and the final target.
- Rounds means random intermediate translations; the final target adds one request.
- Loading a random classic sets the source to English and keeps your target.
- Language and round controls are disabled while translating; repeated keyboard
  shortcuts cannot start overlapping runs.

Examples: Chinese → random languages → Chinese, or Japanese → random languages → English.

Open `index.html` to use the local version, or serve the folder as described below.

---

## How It Works

1. The text is translated through **N** randomly selected languages (default: 10).
2. The result is translated to the selected target language.

Each hop compounds the errors of the last, producing increasingly nonsensical
output. A relay between the two text boxes shows the journey live: the language
just left behind slides off to the left, shrinking and fading as it goes, while
the one being translated into pops in on the right.

**Example:**
```
English → Japanese → Swahili → Arabic → Finnish → Dutch → Korean → Welsh → Turkish → Hungarian → English

Input:  "To be or not to be, that is the question."
Output: "Being or not existing, this is the problem."
```

Everything runs in your browser. Translation uses Google's free public translate
endpoint directly via `fetch` — there is no backend and no API key.

Also in the box:

- **Light and dark themes** — light by default, with a toggle in the top-right
  corner that remembers your choice.
- **🎲 random classic** — loads a short public-domain passage (Frost, Poe,
  Dickens, Carroll…) so you can start mangling immediately.
- **Copy** the result in one click, and watch a hop-by-hop progress bar while
  the chain runs.

---

## Run Locally

It's a static site — just serve the folder with any web server:

```bash
# In this modified folder:
python3 -m http.server 8000
# then open http://localhost:8000/
```

---

## Tests

With Node.js 22.12+ (or 24+):

```bash
npm ci
npm test
```

Ten checks cover language choices, request chaining, saved settings, examples,
loading locks, error recovery, and round validation using simulated Google responses.
These tests do not verify Google endpoint availability. A live smoke test from the
authoring environment failed to connect to Google; actual translation still requires
network access to `translate.googleapis.com`.

## Project Structure

```
lost-in-translation/
├── .github/workflows/
│   └── pages.yml     # Builds & deploys the site to GitHub Pages on push to main
├── index.html        # The single page
├── styles.css        # Styling (light/dark themes, responsive)
├── app.js            # Translation engine + UI logic
└── Examples/         # Sample text files
```

---

## Deployment

The included workflow can serve your fork via **GitHub Pages**. In your repository's
Settings → Pages, select GitHub Actions as the source. Your URL will normally be
`https://YOUR-USERNAME.github.io/lost-in-translation/`.

Pushing to `main` triggers `.github/workflows/pages.yml`, which uploads the repo
root and deploys it. (One-time setup: in **Settings → Pages**, set the source to
**GitHub Actions**.)

---

## Notes

- The translation endpoint (`translate.googleapis.com/translate_a/single`) is
  unofficial — it needs no key and is CORS-friendly, but Google could rate-limit
  or change it. Fine for a hobby gag; if it ever breaks, the fix would be a small
  serverless proxy to a translation API.
- Type is Fredoka + Nunito from Google Fonts. It's the only other external
  request the page makes; if it fails, the page falls back to system fonts and
  everything still works.
