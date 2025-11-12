# Quran Shorts – Editor

Quran Shorts – Editor is a single-page, browser-only production assistant for crafting 9:16 Qur'an shorts that pair EveryAyah recitations with on-canvas translations. The app renders everything client-side (no build step), captures the canvas + audio via MediaRecorder, and exports a ready-to-upload WebM clip. The root document wires Google Fonts, CSS, and scripts in `index.html:1`, while UI panels are injected dynamically so the page stays lean.

## Highlights

- **Dynamic verse & translation data** – Surah metadata (English + Arabic names and ayah counts) is fetched from AlQuran Cloud and Quran.com as soon as the app loads, keeping the Surah/Ayah selectors in sync (`assets/js/metadata.js:4`, `assets/js/metadata.js:39`). The translation dropdown is populated with every available text edition with graceful fallbacks, so creators can target any supported language (`assets/js/translations.js:1`).

- **Audio curated for quality** – Hundreds of EveryAyah reciter folders are deduped and de-hosted so that only the highest bitrate rendition per style shows up in the UI, giving users a clean list without confusing duplicates (`assets/js/reciters.js:135`).

- **Backgrounds, typography, and credits in one place** – Sidebar panels define controls for color/media backgrounds, typography, and attribution badges (`assets/html/background-panel.html:1`, `assets/html/typography-panel.html:1`, `assets/html/credits-panel.html:1`). The corresponding modules merge those settings into the live canvas (`assets/js/background.js:52`, `assets/js/drawing.js:105`).

- **Canvas-first preview with live redraw** – A 1080×1920 canvas is redrawn every animation frame, applying the current translation text, selected font, badges, and either a color fill or media texture (`assets/js/drawing.js:105`). Background images/videos default to the curated JSON list but can also include in-session uploads handled in `assets/js/app.js:358`.

- **One-click recording and export** – The MediaRecorder pipeline, built on top of the Web Audio graph and canvas capture stream, mixes the remote recitation with the rendered video frame-by-frame (`assets/js/audio.js:2`, `assets/js/audio.js:53`, `assets/js/audio.js:98`, `assets/js/audio.js:203`). Exports receive descriptive filenames that combine surah, ayah range, reciter, and timestamp (`assets/js/app.js:307`).

- **Modular HTML and theming** – Panels are plain HTML fragments stored under `assets/html/` and inserted with a lightweight partial loader (`assets/js/html-loader.js:3`, `assets/js/html-loader.js:17`). A simple dark/light toggle hooks into CSS variables so the editor works comfortably in bright and dim environments (`assets/js/theme.js:2`, `assets/css/theme.css:1`).

## Tech & External Services

- Vanilla HTML + modular CSS (`assets/css/styles.css:1` imports the rest) and plain JavaScript—no bundler, transpiler, or package manager required.
- Live data from:
  - `https://api.alquran.cloud` (metadata + translations)
  - `https://api.quran.com/api/v4/chapters` (English chapter names)
  - `https://everyayah.com` (reciter MP3 files)
- Google Fonts are included via `<link>` tags in `index.html:9`, covering both Latin and Arabic-friendly families.
- Browser APIs used: `fetch`, `CanvasRenderingContext2D`, `MediaRecorder`, `captureStream`, and Web Audio (`AudioContext` + `MediaStreamDestination`).

## Repository Layout

| Path                                                                                    | Purpose                                                                                                                   |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `index.html:1`                                                                          | Entry point; loads fonts, CSS bundles, HTML partial loader, and all app scripts.                                          |
| `assets/css/`                                                                           | Layered styles (variables, layout, panels, preview, responsive tweaks). `assets/css/styles.css:1` stitches them together. |
| `assets/html/*.html`                                                                    | Sidebar + preview fragments loaded at runtime so the markup stays modular.                                                |
| `assets/js/app.js:25`                                                                   | DOM wiring, state management, and event listeners for every control.                                                      |
| `assets/js/audio.js:203`                                                                | Playback engine, Web Audio routing, MediaRecorder handling, and playlist progression.                                     |
| `assets/js/background.js:52`                                                            | Background mode, asset loading from JSON, and user-upload handling.                                                       |
| `assets/js/drawing.js:105`                                                              | Canvas renderer for subtitles, labels, credits, and drop shadows.                                                         |
| `assets/js/metadata.js:4` / `assets/js/translations.js:1` / `assets/js/reciters.js:135` | Data ingestion modules for surahs, translations, and reciters.                                                            |
| `assets/background/background.json:1`                                                   | Source of curated background images/videos; edit to ship new media with the project.                                      |
| `assets/background/*`                                                                   | Actual media files referenced by the JSON list (images + mp4 loops).                                                      |
| `assets/js/utils.js:1`                                                                  | Helpers (`$`, `fetchRetry`, padding, timestamps) used across modules.                                                     |

## Requirements

1. A modern Chromium-based browser (Chrome/Edge 118+, Brave, Arc, etc.). Safari’s MediaRecorder is limited and may not export correctly.
2. A local HTTP server (Python, Node, or any static server). Fetching HTML partials and JSON files will fail over `file://` URLs because of browser security (`assets/js/html-loader.js:3`).
3. Stable network connection for API calls and reciter audio.
4. Optional: FFmpeg or another transcoder if you plan to convert the exported WebM into MP4 for social platforms.

## Quick Start

1. **Clone or download** the project.
   ```bash
   git clone https://github.com/<your-org>/quran-shorts-editor.git
   cd quran-shorts-editor
   Serve the folder over HTTP. Choose one of the examples below:
   ```

# Python 3 (Windows PowerShell)

py -m http.server 4173

# Python 3 (macOS/Linux)

python3 -m http.server 4173

# Node.js

npx serve -l 4173
Open the app at http://localhost:4173 and wait for the “htmlPartialsLoaded” event to populate the sidebar (watch the devtools console if something stays blank).

Grant autoplay/media permissions if prompted. The first click on “Play & Export” or “Load & Play” is the required user gesture so Web Audio can start (assets/js/audio.js (line 13)).

Optional: Replace or add background assets before serving by editing assets/background/background.json (line 1) and dropping new files under assets/background/.

Using the Editor

1. Choose verses & translations
   Select a Surah, start Ayah, and end Ayah from the first panel (assets/html/input-panel.html (line 3)). The Ayah dropdown limits itself to the chosen Surah’s length (assets/js/metadata.js (line 39)).
   Pick a reciter; the list already filters by highest bitrate (assets/js/reciters.js (line 135)).
   Pick a translation edition from the auto-generated list (assets/js/translations.js (line 1)). If an API edition fails, the app falls back to en.asad.
2. Design the visual layer
   Background panel lets you switch between a solid color or curated media (assets/html/background-panel.html (line 1)). Color mode simply changes a fill value; media mode reads assets/background/background.json (line 1).
   Use “Choose files” to add temporary images/videos; the files stay in-memory until you reload (assets/js/app.js (line 358)).
   Typography panel exposes font, size (25–160% slider), and font color controls (assets/html/typography-panel.html (line 1)). Every change redraws the canvas in real time (assets/js/drawing.js (line 105)).
3. Credits, theme, and branding
   Toggle “Made by”, “Data Source”, and “Editor Developer” badges, and supply your name/channel (assets/html/credits-panel.html (line 1)). Badges render as semi-transparent pills in the corners of the canvas.
   Switch between light/dark themes with the button in the brand header; it updates the data-theme attribute and persists to localStorage (assets/js/theme.js (line 2)).
4. Playback, recording, and export
   Play & Export builds the playlist and starts recording (assets/html/playback-panel.html (line 1), assets/js/audio.js (line 203)). The UI locks certain buttons via setDuringRecordingUI (assets/js/app.js (line 132)) so you don’t interrupt the capture.
   Load & Play streams audio and draws frames without recording (useful for rehearsals).
   Stop halts playback and resets the ayah index; Dismiss terminates a recording session and clears any pending blobs.
   The progress meter reflects how many ayat are left (assets/js/audio.js (line 292)), and the status banner guides you through each phase.
   Once the playlist finishes and MediaRecorder delivers a blob, the Download button activates, letting you save the WebM file (assets/js/app.js (line 307)).
   Managing background media
   Curated list: Update assets/background/background.json (line 1) with new { "src": "./assets/background/<file>", "type": "image|video", "name": "Label" } entries. Only the extensions listed in ALLOWED*EXT are accepted (assets/js/background.js (line 5)).
   Bundled files: Place the actual .jpg / .mp4 files in assets/background/ so the relative paths stay valid.
   Per-session uploads: Use the file picker in the Background panel. Uploaded blobs get object URLs tracked in window.backgroundModule.userUploads and cleaned up on refresh (assets/js/background.js (line 26), assets/js/app.js (line 358)).
   Autoplay tips: Videos are muted and looped automatically. If autoplay is blocked, interact with the page once; the code retries playback in bgVideo.play().catch(...) (assets/js/background.js (line 133)).
   Exported files
   Format: video/webm (VP9/Opus by default; falls back to whatever MediaRecorder.isTypeSupported allows).
   Naming pattern: Surah-<number>-<name>\_Ayah-<from>-<to>*<reciter>\_<timestamp>.webm (assets/js/app.js (line 307)).
   To publish on platforms that prefer MP4, re-encode with FFmpeg: ffmpeg -i input.webm -c:v libx264 -c:a aac output.mp4.
   Volume slider affects both playback and the recorded mix because it drives the <audio> element and the Web Audio gain node (assets/html/preview.html (line 15), assets/js/audio.js (line 2)).
   Customization & development notes
   Add fonts: Extend the <link> blocks in index.html (line 9) and populate more <option> tags in assets/html/typography-panel.html (line 5).
   Add reciters: Append new identifiers to RECITERS in assets/js/reciters.js (line 6). The deduper will keep the highest bitrate variant automatically.
   Change default credits/backgrounds: Update the default state around the global window assignments (assets/js/app.js (line 86)) and the initial background mode (assets/js/background.js (line 40)).
   Extend styling: Each CSS concern has its own file (panels, forms, preview, layout). Add new rules in the relevant file and ensure it’s imported by assets/css/styles.css (line 1).
   Add panels: Create a new fragment inside assets/html/, include it via loadHTMLPartial in assets/js/html-loader.js (line 13), and wire up the DOM node in initializeDOM (assets/js/app.js (line 25)).
   Troubleshooting
   Blank sidebar/preview: The partials likely failed to load because the page was opened via file://. Serve the directory over HTTP so fetch succeeds (assets/js/html-loader.js (line 3)).
   Audio stalled or muted: Autoplay policies require a user gesture. Click anywhere (e.g., the preview canvas) before pressing Play & Export. Verify that the EveryAyah MP3 URL resolves (check devtools network tab for 403/404) (assets/js/audio.js (line 303)).
   Download button never enables: MediaRecorder only fires onstop when every ayah in the playlist finishes. Shorten the ayah range or press Dismiss to abort and reset (assets/js/app.js (line 342)).
   Translation text reads “Translation unavailable”: The selected edition returned a non-200 response. The code automatically tries en.asad; if that also fails, ensure api.alquran.cloud isn’t blocked (assets/js/audio.js (line 303)).
   Browser not supported: If MediaRecorder or captureStream is undefined, switch to the latest Chrome/Edge or use a desktop instead of mobile. Safari 16 handles canvas capture but still lacks reliable audio mixing (assets/js/audio.js (line 98)).
   Background uploads disappear: User uploads are stored in-memory only; reloads purge them intentionally to avoid retaining large blobs (assets/js/background.js (line 26)).
   Respectful usage & credits
   Audio recitations are streamed from EveryAyah and should be used in line with their terms. Always vet new background media so it remains respectful, as reminded in the upload tooltip (assets/html/background-panel.html (line 36)).
   Translation and metadata providers (Quran.com, AlQuran Cloud) are credited automatically if you keep the “Data Source” toggle on (assets/html/credits-panel.html (line 11)).
   Please add an explicit LICENSE file if you plan to open-source or distribute the project; none is present yet.
