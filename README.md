# Quran Shorts – Editor

I started this project after noticing how many channels were beautifully sharing short clips of Qur’ān āyāt to spread dīn worldwide. It inspired me to think: _what if I could build an editor to make it easier for anyone to create these?_ Software development is simply the skill Allah blessed me with, and this is my small, humble effort to use it for His sake — to help others share His words with clarity and care.

---

## Demo Video

[![Watch the video](https://img.youtube.com/vi/-nJW5pxpJnE/0.jpg)](https://www.youtube.com/watch?v=-nJW5pxpJnE)

---

## Table of Contents

- [Quick Start](#quick-start)
- [Using the Editor](#using-the-editor)
- [Managing Background Media](#managing-background-media)
- [Exported Files](#exported-files)
- [Highlights](#highlights)
- [Tech & External Services](#tech--external-services)
- [Repository Layout](#repository-layout)
- [Requirements](#requirements)
- [Customization & Development Notes](#customization--development-notes)
- [Troubleshooting](#troubleshooting)
- [Respectful Usage & Credits](#respectful-usage--credits)

---

## Quick Start

### 1) Clone & serve

```bash
# Clone
git clone https://github.com/<your-org>/quran-shorts-editor.git
cd quran-shorts-editor

# Serve the folder over HTTP
# Python 3 (Windows PowerShell)
py -m http.server 4173

# Python 3 (macOS/Linux)
python3 -m http.server 4173

# Node.js
npx serve -l 4173
```

Open [**http://localhost:4173**](http://localhost:4173) and wait for the `htmlPartialsLoaded` event to populate the sidebar (check DevTools console if anything stays blank).

Grant autoplay/media permissions if prompted. The first click on **Play & Export** or **Load & Play** provides the user gesture Web Audio needs (`assets/js/audio.js:13`).

> **Tip:** Want custom backgrounds? Edit `assets/background/background.json`, then drop files into `assets/background/` before serving.

---

## Using the Editor

### 1) Choose verses & translations

- Pick a Surah, start Ayah, end Ayah (`assets/html/input-panel.html:3`). The Ayah dropdown constrains to the Surah’s length (`assets/js/metadata.js:39`).
- Choose a reciter; the list is pre‑filtered to the highest bitrate per style (`assets/js/reciters.js:135`).
- Select a translation edition (`assets/js/translations.js:1`). If the chosen API edition fails, it falls back to `en.asad`.

### 2) Design the visual layer

- Switch between **Color** and **Media** backgrounds (`assets/html/background-panel.html:1`). Color updates the canvas fill; Media reads `assets/background/background.json`.
- Use **Choose files** to add temporary images/videos (in‑memory until reload) (`assets/js/app.js:358`).
- Adjust fonts, size (25–160% slider), and color (`assets/html/typography-panel.html:1`). All changes redraw instantly (`assets/js/drawing.js:105`).

### 3) Credits, theme, and branding

- Toggle **Made by**, **Data Source**, **Editor Developer** badges and set your name/channel (`assets/html/credits-panel.html:1`). Badges render as semi‑transparent corner pills.
- Light/dark theme button flips `data-theme` and persists to `localStorage` (`assets/js/theme.js:2`).

### 4) Playback, recording, and export

- **Play & Export** builds the playlist and starts recording (`assets/html/playback-panel.html:1`, `assets/js/audio.js:203`). During capture, the UI locks key buttons via `setDuringRecordingUI` (`assets/js/app.js:132`).
- **Load & Play** previews without recording.
- **Stop** halts playback; **Dismiss** aborts a recording session and clears pending blobs.
- Progress shows remaining ayat (`assets/js/audio.js:292`). When `MediaRecorder` fires `onstop`, **Download** becomes available (`assets/js/app.js:307`).

---

## Managing Background Media

**Curated list** — Add entries to `assets/background/background.json`:

```json
{ "src": "./assets/background/<file>", "type": "image|video", "name": "Label" }
```

Only extensions in `ALLOWED_EXT` are accepted (`assets/js/background.js:5`).

**Bundled files** — Place `.jpg` / `.mp4` in `assets/background/` to keep relative paths valid.

**Per‑session uploads** — Use the picker in the Background panel. Blobs get object URLs, tracked in `window.backgroundModule.userUploads`, and cleaned up on refresh (`assets/js/background.js:26`, `assets/js/app.js:358`).

**Autoplay tips** — Videos are muted + looped. If autoplay is blocked, interact once; playback retries in `bgVideo.play().catch(...)` (`assets/js/background.js:133`).

---

## Exported Files

- **Format:** `video/webm` (VP9/Opus by default; falls back per `MediaRecorder.isTypeSupported`).
- **Filename:** `Surah-<number>-<name>_Ayah-<from>-<to>_<reciter>_<timestamp>.webm` (`assets/js/app.js:307`).
- **Convert to MP4 (optional):**

```bash
ffmpeg -i input.webm -c:v libx264 -c:a aac output.mp4
```

- **Volume:** Slider affects playback **and** the recorded mix (drives `<audio>` + Web Audio gain) (`assets/html/preview.html:15`, `assets/js/audio.js:2`).

---

## Highlights

- 🎚️ **Dynamic verse & translation data** — Surah metadata (English/Arabic names, ayah counts) is fetched at load from AlQuran Cloud and Quran.com to keep the Surah/Ayah selectors in sync (`assets/js/metadata.js:4`, `:39`). All available text editions populate the translation menu with graceful fallbacks (`assets/js/translations.js:1`).

- 🎙️ **Audio curated for quality** — Hundreds of EveryAyah reciter folders are deduped/de‑hosted; the UI lists only the highest‑bitrate rendition per style (`assets/js/reciters.js:135`).

- 🎨 **Backgrounds, typography, credits** — Sidebar panels control color/media backgrounds, font choices, and attribution badges (`assets/html/background-panel.html:1`, `assets/html/typography-panel.html:1`, `assets/html/credits-panel.html:1`). Modules merge these settings into the canvas (`assets/js/background.js:52`, `assets/js/drawing.js:105`).

- 🖼️ **Canvas‑first, live redraw** — A **1080×1920** canvas re‑renders every animation frame with current text, fonts, badges, and color/media fill. Curated media + in‑session uploads are supported (`assets/js/app.js:358`).

- ⏺️ **One‑click recording & export** — Web Audio + `captureStream` feeds **MediaRecorder** to mix recitation and frames in sync (`assets/js/audio.js:2`, `:53`, `:98`, `:203`). Exports get descriptive filenames (surah, ayah range, reciter, timestamp) (`assets/js/app.js:307`).

- 🧩 **Modular HTML & theming** — UI panels are HTML partials loaded at runtime (`assets/js/html-loader.js:3`, `:17`). Light/dark toggle is a simple CSS‑variables switch with persistence (`assets/js/theme.js:2`, `assets/css/theme.css:1`).

> The root page (`index.html:1`) wires Google Fonts, CSS, and all scripts. Panels are injected dynamically to keep markup lean.

---

## Tech & External Services

- Vanilla HTML + modular CSS (`assets/css/styles.css:1` imports the rest) + plain JavaScript — **no bundlers or package managers**.
- Live data from:

  - `https://api.alquran.cloud` — metadata & translations
  - `https://api.quran.com/api/v4/chapters` — English chapter names
  - `https://everyayah.com` — reciter MP3 files

- Google Fonts via `<link>` in `index.html:9` (Latin + Arabic‑friendly families).
- Browser APIs: `fetch`, `CanvasRenderingContext2D`, `MediaRecorder`, `HTMLCanvasElement.captureStream`, Web Audio (`AudioContext`, `MediaStreamDestination`).

---

## Repository Layout

| Path                                                                                    | Purpose                                                                                                            |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `index.html:1`                                                                          | Entry point; loads fonts, CSS bundles, partial loader, and all app scripts.                                        |
| `assets/css/`                                                                           | Layered styles (variables, layout, panels, preview, responsive). `assets/css/styles.css:1` stitches them together. |
| `assets/html/*.html`                                                                    | Sidebar + preview fragments loaded at runtime to keep markup modular.                                              |
| `assets/js/app.js:25`                                                                   | DOM wiring, state management, event listeners for controls.                                                        |
| `assets/js/audio.js:203`                                                                | Playback engine, Web Audio routing, MediaRecorder handling, playlist progression.                                  |
| `assets/js/background.js:52`                                                            | Background mode, asset loading from JSON, user‑upload handling.                                                    |
| `assets/js/drawing.js:105`                                                              | Canvas renderer for subtitles, labels, credits, drop shadows.                                                      |
| `assets/js/metadata.js:4` / `assets/js/translations.js:1` / `assets/js/reciters.js:135` | Data ingestion for surahs, translations, reciters.                                                                 |
| `assets/background/background.json:1`                                                   | Curated background images/videos list.                                                                             |
| `assets/background/*`                                                                   | Media files referenced by the JSON list (images + mp4 loops).                                                      |
| `assets/js/utils.js:1`                                                                  | Helpers (`$`, `fetchRetry`, padding, timestamps).                                                                  |

---

## Requirements

1. A modern Chromium‑based browser (Chrome/Edge 118+, Brave, Arc, etc.). _Safari’s MediaRecorder is limited and may not export reliably._
2. Serve locally over **HTTP** (Python/Node/any static server). Fetching partials/JSON fails on `file://` due to browser security (`assets/js/html-loader.js:3`).
3. Stable network for API calls and reciter audio.
4. Optional: **FFmpeg** to convert WebM → MP4 for platforms that prefer it.

---

## Customization & Development Notes

- **Add fonts** — Extend `<link>` tags in `index.html:9`; add more `<option>`s in `assets/html/typography-panel.html:5`.
- **Add reciters** — Append identifiers to `RECITERS` in `assets/js/reciters.js:6`; the deduper keeps the highest bitrate.
- **Change defaults** — Tweak global defaults (`assets/js/app.js:86`) and initial background mode (`assets/js/background.js:40`).
- **Extend styling** — Each concern has its own CSS file; ensure imports flow through `assets/css/styles.css:1`.
- **Add panels** — Create an HTML fragment in `assets/html/`, include via `loadHTMLPartial` (`assets/js/html-loader.js:13`), and wire in `initializeDOM` (`assets/js/app.js:25`).

---

## Troubleshooting

- **Blank sidebar/preview** — Opened via `file://`? Serve over HTTP so `fetch` works (`assets/js/html-loader.js:3`).
- **Audio stalled/muted** — Provide a user gesture (click the canvas) before **Play & Export**. Confirm the EveryAyah MP3 URL resolves (check for 403/404) (`assets/js/audio.js:303`).
- **Download never enables** — `MediaRecorder` fires `onstop` only after all ayat finish. Shorten the range or use **Dismiss** to abort (`assets/js/app.js:342`).
- **“Translation unavailable”** — Edition returned a non‑200. The app tries `en.asad`; if that fails, ensure `api.alquran.cloud` isn’t blocked (`assets/js/audio.js:303`).
- **Browser not supported** — If `MediaRecorder`/`captureStream` is missing, try latest Chrome/Edge or desktop. Safari 16 captures canvas but audio mixing is unreliable (`assets/js/audio.js:98`).
- **Background uploads disappear** — In‑memory by design; reload purges blobs (`assets/js/background.js:26`).

---

## Respectful Usage & Credits

- Recitations stream from **EveryAyah** — follow their terms. Please vet background media for respectful presentation (see upload tooltip `assets/html/background-panel.html:36`).
- Translation/metadata providers (**Quran.com**, **AlQuran Cloud**) are credited automatically when the **Data Source** toggle is on (`assets/html/credits-panel.html:11`).

---
