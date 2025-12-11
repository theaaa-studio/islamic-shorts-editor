# Islamic Shorts Editor

A free, browser-based editor for creating beautiful Islamic content — Qur'ān verses and Hadith — in short video and image formats optimized for social media platforms like TikTok, Instagram Reels, and YouTube Shorts.

I started this project after noticing how many channels were beautifully sharing short clips of Qur'ān āyāt to spread dīn worldwide. It inspired me to think: _what if I could build an editor to make it easier for anyone to create these?_ Software development is simply the skill Allah blessed me with, and this is my small, humble effort to use it for His sake — to help others share His words with clarity and care.

---

## 🎬 Demo Video

[![Watch the video](https://img.youtube.com/vi/-nJW5pxpJnE/0.jpg)](https://www.youtube.com/watch?v=ZcmFbd3Dn4k)

---

## 📋 Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Using the Quran Editor](#using-the-quran-editor)
- [Using the Hadith Editor](#using-the-hadith-editor)
- [Managing Background Media](#managing-background-media)
- [Exported Files](#exported-files)
- [Tech & External Services](#tech--external-services)
- [Repository Layout](#repository-layout)
- [Requirements](#requirements)
- [Customization & Development](#customization--development)
- [Troubleshooting](#troubleshooting)
- [Respectful Usage & Credits](#respectful-usage--credits)

---

## ✨ Features

### Dual Editors
- **Quran Shorts Editor** — Create videos with Qur'ān verses, recitation audio, translations, and custom backgrounds
- **Hadith Shorts Editor** — Create images with individual Hadith from various authentic collections

### Quran Editor Features
- 🎚️ **Verse Selection** — Choose any Surah and Ayah range
- 🎙️ **Reciter Audio** — Select from renowned reciters (Abdul Rahman Al-Sudais, Mishary Al-Afasy, Saad Al-Ghamdi, and more)
- 🌍 **Multi-language Translations** — English, Arabic, Urdu, French, Indonesian, and many more
- 🎨 **Custom Backgrounds** — Solid colors, curated images/videos, or upload your own
- 🖋️ **Typography Control** — Choose from Latin and Arabic-optimized fonts, adjust size (25-160%), colors
- 📱 **Aspect Ratios** — Export in 9:16 (vertical) or 1:1 (square) formats
- ⏺️ **One-Click Recording** — Automatic video recording with synchronized audio and text
- 🎬 **Batch Export** — Export multiple verses at once (auto-zips if >5 images)

### Hadith Editor Features
- 📚 **Multiple Books** — Access Sahih Bukhari, Sahih Muslim, and other authentic Hadith collections
- 🔢 **Single Hadith Selection** — Focus on one Hadith at a time
- 🌍 **Multi-language Editions** — English, Arabic, and other languages
- 🎨 **Same Design Tools** — Backgrounds, typography, and styling options as Quran editor
- 📸 **Image Export** — Save individual Hadith as high-quality images

### Universal Features
- 🌓 **Light/Dark Theme** — Toggle between themes with persistent preference
- 📱 **Fully Responsive** — Works on desktop, tablet, and mobile devices
- 🎯 **No Installation** — 100% browser-based, no downloads or accounts required
- 🆓 **Completely Free** — No subscriptions, no watermarks, no limitations
- ✅ **Credits & Attribution** — Optional toggles for data sources and creator credits

---

## 🚀 Quick Start

### 1) Clone & Serve

```bash
# Clone the repository
git clone https://github.com/theaaa-studio/Islamic-Shorts-Editor.git
cd Islamic-Shorts-Editor

# Serve the folder over HTTP
# Python 3 (Windows PowerShell)
py -m http.server 8000

# Python 3 (macOS/Linux)
python3 -m http.server 8000

# Node.js
npx serve -l 8000
```

### 2) Open in Browser

Navigate to [**http://localhost:8000**](http://localhost:8000)

You'll see the landing page with two options:
- **Quran Shorts** — For creating video/image content with Qur'ān verses
- **Hadith Shorts** — For creating image content with Hadith

---

## 📖 Using the Quran Editor

### 1) Choose Verses & Recitation

**Input Panel:**
- Select a **Surah** from the dropdown
- Choose **Start Ayah** and **End Ayah** (range validated automatically)
- Pick a **Reciter** (filtered to highest quality bitrates)
- Select a **Translation Edition** (auto-updates font recommendations)

### 2) Design Your Video

**Background Panel:**
- **Color Mode** — Choose a solid background color
- **Media Mode** — Select from curated backgrounds or upload your own images/videos
- Adjust **Text Box Color** and **Opacity** for better readability

**Typography Panel:**
- Choose **Translation Font** (auto-suggested based on language)
- Choose **Arabic Font** (Amiri, Cairo, Scheherazade New, etc.)
- Adjust **Text Size** (25-160% slider)
- Set **Font Colors** for translation and Arabic text
- Toggle **Show Arabic Text** on/off
- Select **Translation Style** (Minimal or Detailed)

**Credits Panel:**
- Toggle **Data Source Credit** (Quran.com & AlQuran Cloud)
- Toggle **Developer Credit** (TheAAA)
- Add your own **"Made by"** credit with custom name

### 3) Preview & Export

**Preview Section:**
- Choose **Aspect Ratio** (9:16 vertical or 1:1 square)
- Adjust **Volume** slider
- Click **Load & Play** to preview without recording
- Click **Play & Export** to record video with audio

**Export Options:**
- **Download** button appears when recording completes
- **Save Picture** exports current frame as image
  - Shows count of images to be saved
  - Auto-zips if exporting >5 images
- Files named: `Surah-{number}-{name}_Ayah-{from}-{to}_{reciter}_{timestamp}.webm`

---

## 📜 Using the Hadith Editor

### 1) Choose Hadith

**Input Panel:**
- Select a **Book** (Sahih Bukhari, Sahih Muslim, etc.)
- Enter **Hadith Number**
- Choose **Edition (Language)** for translation

### 2) Design Your Image

**Background, Typography, and Credits** panels work the same as Quran editor

### 3) Preview & Export

**Preview Section:**
- Choose **Aspect Ratio** (9:16 or 1:1)
- Click **Load & Preview** to see the Hadith
- Click **Save Picture (1)** to export as PNG image
- Files named: `{BookName}_Hadith-{number}_{aspectRatio}_{edition}_{timestamp}.png`

---

## 🎨 Managing Background Media

### Curated Backgrounds

Edit `assets/background/background.json`:

```json
{
  "backgrounds": [
    {
      "src": "./assets/background/your-image.jpg",
      "type": "image",
      "name": "Your Image Name"
    },
    {
      "src": "./assets/background/your-video.mp4",
      "type": "video",
      "name": "Your Video Name"
    }
  ]
}
```

Supported formats:
- **Images:** `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`
- **Videos:** `.mp4`, `.webm`, `.mov`

### Per-Session Uploads

Use the **"Choose files"** button in the Background panel:
- Upload images or videos temporarily (cleared on page reload)
- Automatically switches to Media mode
- Files appear at the top of the background list

---

## 📦 Exported Files

### Quran Videos
- **Format:** `video/webm` (VP9/Opus codec)
- **Resolution:** 1080×1920 (9:16) or 1080×1080 (1:1)
- **Filename Pattern:** `Surah-{num}-{name}_Ayah-{from}-{to}_{reciter}_{timestamp}.webm`

### Hadith Images
- **Format:** `image/png`
- **Resolution:** 1080×1920 (9:16) or 1080×1080 (1:1)
- **Filename Pattern:** `{BookName}_Hadith-{num}_{aspectRatio}_{edition}_{timestamp}.png`

### Convert WebM to MP4 (Optional)

```bash
ffmpeg -i input.webm -c:v libx264 -c:a aac output.mp4
```

---

## 🛠️ Tech & External Services

### Technology Stack
- **Frontend:** Vanilla HTML5, CSS3, JavaScript (ES6+)
- **No Build Tools:** No bundlers, no package managers — pure web standards
- **Modular Architecture:** HTML partials, CSS modules, JavaScript modules

### External APIs & Services

**Quran Data:**
- [AlQuran Cloud API](https://api.alquran.cloud) — Metadata & translations
- [Quran.com API](https://api.quran.com/api/v4/chapters) — English chapter names
- [EveryAyah.com](https://everyayah.com) — Reciter MP3 files

**Hadith Data:**
- [Hadith API by fawazahmed0](https://github.com/fawazahmed0/hadith-api) — Hadith collections in multiple languages

**Fonts:**
- Google Fonts (Latin & Arabic families)

### Browser APIs Used
- `fetch` — Data fetching
- `Canvas API` — Rendering text and backgrounds
- `MediaRecorder` — Video recording
- `Web Audio API` — Audio mixing and playback
- `HTMLCanvasElement.captureStream` — Canvas to video stream

---

## 📂 Repository Layout

```
Islamic-Shorts-Editor/
├── index.html              # Landing page
├── quran.html              # Quran editor entry point
├── hadith.html             # Hadith editor entry point
├── README.md               # This file
│
├── assets/
│   ├── css/
│   │   ├── styles.css      # Main CSS import file
│   │   ├── variables.css   # CSS custom properties
│   │   ├── base.css        # Base styles
│   │   ├── layout.css      # Layout structure
│   │   ├── landing.css     # Landing page styles
│   │   ├── panels.css      # Sidebar panel styles
│   │   ├── forms.css       # Form controls
│   │   ├── preview.css     # Preview section
│   │   ├── theme.css       # Light/dark theme
│   │   └── responsive.css  # Mobile responsive
│   │
│   ├── html/               # HTML partials
│   │   ├── brand.html
│   │   ├── input-panel.html
│   │   ├── background-panel.html
│   │   ├── typography-panel.html
│   │   ├── credits-panel.html
│   │   ├── playback-panel.html
│   │   ├── preview.html
│   │   ├── hadith-brand.html
│   │   ├── hadith-input-panel.html
│   │   ├── hadith-playback-panel.html
│   │   └── hadith-preview.html
│   │
│   ├── js/
│   │   ├── app.js          # Quran editor main app
│   │   ├── hadith-app.js   # Hadith editor main app
│   │   ├── audio.js        # Audio playback & recording
│   │   ├── background.js   # Background management
│   │   ├── drawing.js      # Canvas rendering
│   │   ├── metadata.js     # Quran metadata
│   │   ├── hadith-metadata.js  # Hadith metadata
│   │   ├── translations.js # Translation editions
│   │   ├── reciters.js     # Reciter list
│   │   ├── html-loader.js  # Quran HTML partial loader
│   │   ├── hadith-html-loader.js  # Hadith HTML partial loader
│   │   ├── theme.js        # Theme switcher
│   │   └── utils.js        # Utility functions
│   │
│   ├── background/
│   │   ├── background.json # Background media list
│   │   └── *.jpg, *.mp4    # Background media files
│   │
│   └── quran.ico           # Favicon
```

---

## 💻 Requirements

### Browser Compatibility
- **Recommended:** Chrome 118+, Edge 118+, Brave, Arc
- **Limited Support:** Firefox (MediaRecorder may have issues)
- **Not Recommended:** Safari (unreliable MediaRecorder support)

### Server Requirements
- Must serve over **HTTP** (not `file://`)
- Any static file server works (Python, Node.js, Apache, Nginx)

### Network
- Stable internet connection for API calls and audio streaming

### Optional
- **FFmpeg** for WebM to MP4 conversion

---

## 🔧 Customization & Development

### Adding Fonts

1. Add Google Fonts link in `index.html` or `quran.html`:
```html
<link href="https://fonts.googleapis.com/css2?family=YourFont&display=swap" rel="stylesheet">
```

2. Add options in `assets/html/typography-panel.html`:
```html
<option value="YourFont, sans-serif">Your Font Name</option>
```

### Adding Reciters

Edit `assets/js/reciters.js` and add to the `RECITERS` array:
```javascript
"reciter_folder_name",
```

The system automatically deduplicates and selects highest bitrate versions.

### Adding Background Media

1. Place media files in `assets/background/`
2. Add entries to `assets/background/background.json`
3. Reload the editor

### Changing Defaults

Edit `assets/js/app.js` or `assets/js/hadith-app.js`:
- Default colors
- Default fonts
- Default background mode
- Initial text size

### Creating New Panels

1. Create HTML file in `assets/html/`
2. Add loader call in `assets/js/html-loader.js` or `assets/js/hadith-html-loader.js`
3. Wire up DOM elements in `initializeDOM()` function
4. Add event listeners in `setupEventListeners()` function

---

## 🐛 Troubleshooting

### Blank Sidebar/Preview
- **Cause:** Opened via `file://` protocol
- **Fix:** Serve over HTTP using Python, Node.js, or any web server

### Audio Not Playing
- **Cause:** Missing user gesture for Web Audio API
- **Fix:** Click anywhere on the page before clicking Play & Export

### Download Button Not Appearing
- **Cause:** Recording still in progress or failed
- **Fix:** Wait for all verses to finish, or click Dismiss to abort

### Translation Unavailable
- **Cause:** API returned non-200 response
- **Fix:** Try different translation edition or check internet connection

### Background Uploads Disappear
- **Cause:** In-memory storage by design
- **Fix:** Use curated backgrounds in `background.json` for persistence

### Video Export Not Working
- **Cause:** Browser doesn't support MediaRecorder
- **Fix:** Use latest Chrome or Edge browser

### Hadith Not Loading
- **Cause:** Invalid hadith number or API issue
- **Fix:** Verify hadith number exists in selected book

---

## 🙏 Respectful Usage & Credits

### Data Sources

This project relies on the following services:
- **EveryAyah.com** — Qur'ān recitations
- **Quran.com** — Qur'ān metadata
- **AlQuran Cloud** — Qur'ān translations
- **Hadith API** — Hadith collections

Please respect their terms of service and give proper attribution.

### Content Guidelines

- Use respectful, high-quality background media
- Verify translation accuracy for your audience
- Give credit to data sources (toggle on in Credits panel)
- Use content to spread authentic Islamic knowledge

### Attribution

When the **Data Source** toggle is enabled, the following credits appear:
- **Quran:** "Data: Quran.com & AlQuran Cloud • Audio: EveryAyah.com"
- **Hadith:** "Data: Hadith API by fawazahmed0"

When **Developer** toggle is enabled:
- "Developed by TheAAA"

---

## 📄 License

This project is open source. Please use it to spread beneficial Islamic knowledge.

---

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## 📧 Contact

- **Developer:** TheAAA
- **Portfolio:** [https://theaaa-studio.github.io/AAA_Personal_Portfolio/](https://theaaa-studio.github.io/AAA_Personal_Portfolio/)
- **Project:** [https://theaaa-studio.github.io/islamic-shorts-editor/](https://theaaa-studio.github.io/islamic-shorts-editor/)

---

**May Allah accept this humble effort and make it a means of spreading His word. Ameen.**
