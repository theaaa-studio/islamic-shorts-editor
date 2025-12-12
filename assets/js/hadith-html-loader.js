// HTML Partial Loader
// Loads HTML partials from embedded strings (fixing local file fetch/CORS issues)

const TEMPLATES = {
  'assets/html/hadith-brand.html': `
        <div class="brand">
          <a href="index.html" class="logo-link"><div class="logo"></div></a>
          <div class="brand-title">
            <h1 class="title">Hadith Shorts - Editor</h1>
            <p class="subtitle">Spread the wisdom of Prophet Muhammad (SAW) in short videos and images.</p>
          </div>
          <button
            id="themeToggle"
            class="theme-toggle"
            title="Toggle light / dark theme"
            aria-pressed="false"
          >
            🌙
          </button>
        </div>
  `,
  'assets/html/hadith-input-panel.html': `
        <!-- Panel: Input -->
        <!-- Panel: Input -->
        <div class="panel">
          <h3>Choose</h3>
          <div class="input-row hadith-input-row">
            <div class="field field-book">
              <label class="small" for="hadithBook">Book</label>
              <select id="hadithBook"></select>
            </div>
            <div class="field field-hadith-number">
              <label class="small" for="hadithNumber">Hadith Number</label>
              <input type="number" id="hadithNumber" min="1" value="1">
            </div>

            <div class="field field-translation">
              <label class="small" for="hadithEdition"
                >Edition (Language)</label
              >
              <select id="hadithEdition">
                <!-- Will be populated by JS -->
                <option value="eng-sahihbukhari">English - Sahih Bukhari</option>
              </select>
            </div>
          </div>
        </div>
  `,
  'assets/html/background-panel.html': `
<!-- Panel: Background -->
<div class="panel background-panel">
  <h3>Background</h3>
  <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 4px;">
    <!-- Row 1: Mode toggles -->
    <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
      <label class="toggle" title="Use a solid background color">
        <input
          type="radio"
          name="bgMode"
          value="color"
          id="bgModeColor"
          checked
        />
        <span>Color</span>
      </label>

      <label class="toggle" title="Use image/video from assets/background">
        <input type="radio" name="bgMode" value="media" id="bgModeMedia" />
        <span>Media</span>
      </label>

      <!-- File Trigger (Compact, moved up) -->
      <label
          id="bgUploadBtn"
          for="bgUploadInput"
          class="file-trigger compact"
          title="Upload image or video"
          style="display: none; padding: 4px 12px; height: 32px; font-size: 12px; border-radius: 16px; margin-left: auto;"
        >
          <svg viewBox="0 0 24 24" fill="none" style="width: 14px; height: 14px; margin-right: 4px;">
            <path d="M12 3v12m0 0l-4-4m4 4l4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M19 15v4a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          Upload
      </label>
      <input id="bgUploadInput" class="visually-hidden" type="file" accept="image/*,video/*" multiple />
    </div>

    <!-- Row 2: Background Color (shown when 'color' is selected) -->
    <div class="field" id="bgColorField" style="display: flex; align-items: center; gap: 10px; width: 100%;">
      <input id="bgColor" type="color" value="#FBEEE8" />
      <label class="small" for="bgColor" style="margin: 0;">Background Color</label>
    </div>

    <!-- Row 2 (Alternative): Media selector (shown when 'media' is selected) -->
    <div class="field" id="bgMediaField" style="display: none; width: 100%;">
       <select id="bgMediaSelect" style="width: 100%; height: 32px; font-size: 13px;"></select>
       <div style="font-size: 10px; color: var(--muted); margin-top: 2px; text-align: right;" id="bgMediaHint">Using configured media list.</div>
    </div>

    <hr style="border: 0; border-top: 1px solid var(--line); margin: 4px 0;" />

    <!-- Row 3: Box Style -->
    <div style="display: flex; flex-direction: column; gap: 6px;">
      <div style="display: flex; gap: 12px; align-items: center; justify-content: space-between;">
        <label class="small" style="margin: 0;">Box Style</label>
        <div style="display: flex; gap: 4px;">
          <label class="toggle" style="padding: 4px 10px;">
            <input type="radio" name="boxMode" value="color" id="boxModeColor" checked />
            <span>Color</span>
          </label>
          <label class="toggle" style="padding: 4px 10px;">
            <input type="radio" name="boxMode" value="blur" id="boxModeBlur" />
            <span>Blur</span>
          </label>
        </div>
      </div>

      <!-- Blur Controls -->
      <div class="field" id="boxBlurControls" style="display: none; width: 100%;">
          <div style="display: flex; align-items: center; gap: 8px;">
              <label class="small" for="bgBlur" style="margin: 0; width: 60px;">Radius</label>
              <input id="bgBlur" type="range" min="0" max="40" value="0" step="1" style="flex: 1; height: 24px;" />
              <span id="bgBlurVal" class="small" style="min-width: 3ch; font-size: 11px;">0px</span>
          </div>
      </div>

      <!-- Color/Opacity Controls -->
      <div class="field" id="boxColorControls">
        <div style="display: flex; gap: 8px; align-items: center;">
            <input id="textBoxColor" type="color" value="#000000" />
            
            <div style="flex: 1; display: flex; align-items: center; gap: 6px;">
              <span class="small" style="font-size: 11px;">Opac.</span>
              <input id="textBoxOpacity" type="range" min="0" max="100" value="12" style="flex: 1; height: 24px;" />
              <span id="textBoxOpacityVal" class="small" style="width: 3ch; font-size: 11px;">12%</span>
            </div>
        </div>
      </div>
    </div>
  </div>
</div>
  `,
  'assets/html/typography-panel.html': `
<!-- Panel: Typography -->
<div class="panel">
  <h3>Typography</h3>
  <div
    class="typography-flex"
    style="display: flex; flex-direction: column; gap: 12px"
  >
    <!-- Row 1: Translation Controls -->
    <div
      class="typo-row"
      style="
        display: flex;
        width: 100%;
        gap: 12px;
        align-items: flex-end;
        flex-wrap: wrap;
      "
    >
      <div
        class="field field-translation-style"
        style="flex: 1; width: auto; min-width: 150px"
      >
        <label class="small" for="fontPicker">Translation Style</label>
        <select id="fontPicker">
          <!-- Latin/Western Fonts -->
          <option value="Inter, sans-serif">Inter</option>
          <option value="Poppins, sans-serif">Poppins</option>
          <option value="Lora, serif">Lora</option>
          <option value="Merriweather, serif">Merriweather</option>
          <option value="Nunito, sans-serif">Nunito</option>
          <option value="Roboto Slab, serif">Roboto Slab</option>
          <option value="Montserrat, sans-serif">Montserrat</option>
          <option value="Open Sans, sans-serif">Open Sans</option>
          <option value="Source Sans 3, sans-serif">Source Sans 3</option>
          <option value="Work Sans, sans-serif">Work Sans</option>
          <option value="Raleway, sans-serif">Raleway</option>
          <option value="Lato, sans-serif">Lato</option>
          <option value="Oswald, sans-serif">Oswald</option>
          <option value="Ubuntu, sans-serif">Ubuntu</option>
          <option value="PT Sans, sans-serif">PT Sans</option>
          <option value="Karla, sans-serif">Karla</option>
          <option value="Rubik, sans-serif">Rubik</option>
          <option value="Heebo, sans-serif">Heebo</option>
          <option value="Barlow, sans-serif">Barlow</option>
          <option value="Manrope, sans-serif">Manrope</option>
          <option value="Space Grotesk, sans-serif">Space Grotesk</option>
          <option value="Fira Sans, sans-serif">Fira Sans</option>
          <option value="Playfair Display, serif">Playfair Display</option>
          <option value="DM Serif Text, serif">DM Serif Text</option>
          <option value="Libre Baskerville, serif">Libre Baskerville</option>
          <option value="PT Serif, serif">PT Serif</option>
          <option value="Quicksand, sans-serif">Quicksand</option>
          <option value="Space Mono, monospace">Space Mono</option>
          <option value="Fira Code, monospace">Fira Code</option>
          <option value="JetBrains Mono, monospace">JetBrains Mono</option>

          <!-- Arabic Fonts -->
          <option value="Amiri, serif">Amiri (Arabic)</option>
          <option value="Scheherazade New, serif">
            Scheherazade New (Arabic)
          </option>
          <option value="Cairo, sans-serif">Cairo (Arabic)</option>
          <option value="Changa, sans-serif">Changa (Arabic)</option>
          <option value="Reem Kufi, sans-serif">Reem Kufi (Arabic)</option>
          <option value="Noto Naskh Arabic, serif">Noto Naskh Arabic</option>
          <option value="Noto Kufi Arabic, sans-serif">Noto Kufi Arabic</option>
          <option value="IBM Plex Sans Arabic, sans-serif">
            IBM Plex Sans Arabic
          </option>
          <option value="Tajawal, sans-serif">Tajawal (Arabic)</option>
          <option value="El Messiri, sans-serif">El Messiri (Arabic)</option>
          <option value="Markazi Text, serif">Markazi Text (Arabic)</option>
          <option value="Lateef, serif">Lateef (Arabic)</option>
          <option value="Harmattan, sans-serif">Harmattan (Arabic)</option>

          <!-- Bengali/Bangla Fonts -->
          <option value="Hind Siliguri, sans-serif">
            Hind Siliguri (Bangla)
          </option>
          <option value="Noto Sans Bengali, sans-serif">
            Noto Sans Bengali
          </option>
          <option value="Noto Serif Bengali, serif">Noto Serif Bengali</option>
          <option value="Baloo Da 2, cursive">Baloo Da 2 (Bangla)</option>
          <option value="Mukta, sans-serif">Mukta (Bangla)</option>

          <!-- Hindi/Devanagari Fonts -->
          <option value="Noto Sans Devanagari, sans-serif">
            Noto Sans Devanagari (Hindi)
          </option>
          <option value="Noto Serif Devanagari, serif">
            Noto Serif Devanagari (Hindi)
          </option>
          <option value="Poppins, sans-serif">Poppins (Hindi Support)</option>
          <option value="Hind, sans-serif">Hind (Hindi)</option>
          <option value="Tiro Devanagari Hindi, serif">
            Tiro Devanagari (Hindi)
          </option>

          <!-- Chinese Fonts -->
          <option value="Noto Sans SC, sans-serif">
            Noto Sans SC (Chinese Simplified)
          </option>
          <option value="Noto Sans TC, sans-serif">
            Noto Sans TC (Chinese Traditional)
          </option>
          <option value="Noto Serif SC, serif">
            Noto Serif SC (Chinese Simplified)
          </option>
          <option value="Ma Shan Zheng, cursive">
            Ma Shan Zheng (Chinese)
          </option>

          <!-- Japanese Fonts -->
          <option value="Noto Sans JP, sans-serif">
            Noto Sans JP (Japanese)
          </option>
          <option value="Noto Serif JP, serif">Noto Serif JP (Japanese)</option>
          <option value="M PLUS Rounded 1c, sans-serif">
            M PLUS Rounded 1c (Japanese)
          </option>

          <!-- Korean Fonts -->
          <option value="Noto Sans KR, sans-serif">
            Noto Sans KR (Korean)
          </option>
          <option value="Noto Serif KR, serif">Noto Serif KR (Korean)</option>
          <option value="Black Han Sans, sans-serif">
            Black Han Sans (Korean)
          </option>

          <!-- Thai Fonts -->
          <option value="Noto Sans Thai, sans-serif">Noto Sans Thai</option>
          <option value="Noto Serif Thai, serif">Noto Serif Thai</option>
          <option value="Prompt, sans-serif">Prompt (Thai)</option>

          <!-- Vietnamese Fonts -->
          <option value="Noto Sans, sans-serif">Noto Sans (Vietnamese)</option>
          <option value="Be Vietnam Pro, sans-serif">Be Vietnam Pro</option>

          <!-- Cyrillic/Russian Fonts -->
          <option value="Roboto, sans-serif">Roboto (Cyrillic)</option>
          <option value="Noto Sans, sans-serif">
            Noto Sans (Multi-language)
          </option>
        </select>
      </div>
      <div class="field" style="flex: 2; min-width: 100px">
        <label class="small" for="textSize"
          >Translation Size
          <span id="textSizeVal" class="name-chip">(100%)</span></label
        >
        <input
          id="textSize"
          type="range"
          min="25"
          max="160"
          step="5"
          value="100"
        />
      </div>
      <div class="field" style="width: auto">
        <label class="small" for="fontColor">Translation Color</label>
        <input id="fontColor" type="color" value="#1f1f1f" />
      </div>
    </div>

    <!-- Row 2: Arabic Controls -->
    <!-- Row 2: Show Arabic Toggle -->
    <div class="typo-row" style="display: flex; width: 100%; margin-top: 8px">
      <label
        class="toggle"
        title="Show Arabic Text"
        style="margin-top: 0; min-width: fit-content; height: 38px"
      >
        <input type="checkbox" id="showArabicText" checked />
        <span>Show Arabic Text</span>
      </label>
    </div>

    <!-- Row 3: Arabic Controls (Style, Size, Color) -->
    <div
      class="typo-row"
      style="
        display: flex;
        width: 100%;
        gap: 12px;
        align-items: flex-end;
        flex-wrap: wrap;
        margin-top: 8px;
      "
    >
      <div class="field" style="flex: 1; width: auto; min-width: 120px">
        <label class="small" for="arabicFontPicker">Arabic Style</label>
        <select id="arabicFontPicker">
          <!-- Only Arabic Fonts -->
          <option value="Amiri, serif">Amiri</option>
          <option value="Scheherazade New, serif">Scheherazade New</option>
          <option value="Cairo, sans-serif">Cairo</option>
          <option value="Changa, sans-serif">Changa</option>
          <option value="Reem Kufi, sans-serif">Reem Kufi</option>
          <option value="Noto Naskh Arabic, serif">Noto Naskh Arabic</option>
          <option value="Noto Kufi Arabic, sans-serif">Noto Kufi Arabic</option>
          <option value="IBM Plex Sans Arabic, sans-serif">
            IBM Plex Sans Arabic
          </option>
          <option value="Tajawal, sans-serif">Tajawal</option>
          <option value="El Messiri, sans-serif">El Messiri</option>
          <option value="Markazi Text, serif">Markazi Text</option>
          <option value="Lateef, serif">Lateef</option>
          <option value="Harmattan, sans-serif">Harmattan</option>
          <option value="Aref Ruqaa, serif">Aref Ruqaa</option>
          <option value="Katibeh, cursive">Katibeh</option>
          <option value="Lalezar, cursive">Lalezar</option>
          <option value="Rakkas, cursive">Rakkas</option>
          <option value="Mada, sans-serif">Mada</option>
          <option value="Almarai, sans-serif">Almarai</option>
        </select>
      </div>
      <div class="field" style="flex: 2; min-width: 100px">
        <label class="small" for="arabicTextSize"
          >Arabic Size
          <span id="arabicTextSizeVal" class="name-chip">(100%)</span></label
        >
        <input
          id="arabicTextSize"
          type="range"
          min="25"
          max="200"
          step="5"
          value="100"
        />
      </div>
      <div class="field" style="width: auto">
        <label class="small" for="arabicFontColor">Arabic Color</label>
        <input id="arabicFontColor" type="color" value="#1f1f1f" />
      </div>
    </div>
  </div>
</div>
  `,
  'assets/html/credits-panel.html': `
<!-- Panel: Credits -->
<div class="panel">
  <h3>Credits</h3>
  <div class="credits-grid">
    <!-- Row 1: Name Input + Made By Toggle -->
    <div class="credits-line">
      <div class="field" style="flex: 1;">
        <label class="small" for="madeByInput">Made by (name)</label>
        <input
          id="madeByInput"
          type="text"
          placeholder="Your name"
          value=""
        />
      </div>
      <label class="toggle" title="Show a Made by badge" style="margin-bottom: 2px;">
        <input type="checkbox" id="creditMadeBy" checked />
        <span>Made by</span>
      </label>
    </div>

    <!-- Row 2: Data Source + Developer Toggles -->
    <div class="credits-line">
      <label class="toggle" title="Show attribution">
        <input type="checkbox" id="creditData" checked />
        <span>Data Source</span>
      </label>
      <label class="toggle" title="Show developer tag">
        <input type="checkbox" id="creditCreator" checked />
        <span>Editor Developer</span>
      </label>
    </div>

    <!-- Row 3: Color -->
    <div class="credits-line">
      <div class="field" style="flex: 0 0 auto">
        <label class="small" for="creditColor">Credit Color</label>
        <input id="creditColor" type="color" value="#1f1f1f" />
      </div>
    </div>
  </div>
</div>
  `,
  'assets/html/hadith-playback-panel.html': `
        <!-- Panel: Playback & Export -->
        <div class="panel">
          <h3>Export</h3>
          <div class="transport">
            <button id="previewPlayBtn" class="btn">
              <i class="fas fa-play"></i> Load & Preview
            </button>
            <button id="takePictureBtn" class="btn" title="Capture and download individual images for each Hadith in your selected range">
              <i class="fas fa-camera"></i> Save Picture <span id="pictureSaveCount">(1)</span>
            </button>
          </div>

          <div class="two-col-inline">
            <div class="status" id="recStatus">
              Click "Load & Preview" to see your Hadith or "Save Picture" to download images.
            </div>
          </div>
        </div>
  `,
  'assets/html/hadith-preview.html': `
        <div class="preview-header">
          <div class="ar-toggle">
            <button id="arVerticalBtn" class="ar-btn active" title="Vertical (9:16)">
              <i class="fas fa-mobile-alt"></i> 9:16
            </button>
            <button id="arSquareBtn" class="ar-btn" title="Square (1:1)">
              <i class="fas fa-square"></i> 1:1
            </button>
          </div>
        </div>
        <div class="preview-stage">
          <canvas
            id="previewCanvas"
            width="1080"
            height="1920"
            aria-label="Shorts Preview"
          ></canvas>
        </div>

        <div class="preview-controls">
          <!-- Fullscreen button (mobile only) -->
          <button id="fullscreenBtn" class="btn btn-icon fullscreen-btn" title="Toggle Fullscreen">
            <i class="fas fa-expand"></i>
          </button>
        </div>
  `
};

async function loadHTMLPartial(containerId, partialPath) {
  try {
    const html = TEMPLATES[partialPath];
    if (!html) {
      throw new Error(`Template not found for path: ${partialPath}`);
    }
    
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = html;
    } else {
      console.warn(`Container with id "${containerId}" not found`);
    }
  } catch (error) {
    console.error(`Error loading ${partialPath}:`, error);
  }
}

// Load all HTML partials when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  // Load sidebar sections
  await loadHTMLPartial('brand-container', 'assets/html/hadith-brand.html');
  await loadHTMLPartial('input-panel-container', 'assets/html/hadith-input-panel.html');
  await loadHTMLPartial('background-panel-container', 'assets/html/background-panel.html');
  await loadHTMLPartial('typography-panel-container', 'assets/html/typography-panel.html');
  await loadHTMLPartial('credits-panel-container', 'assets/html/credits-panel.html');
  await loadHTMLPartial('playback-panel-container', 'assets/html/hadith-playback-panel.html');
  
  // Load preview section
  await loadHTMLPartial('preview-container', 'assets/html/hadith-preview.html');
  
  // Dispatch custom event when all HTML partials are loaded
  window.dispatchEvent(new CustomEvent('htmlPartialsLoaded'));
});
