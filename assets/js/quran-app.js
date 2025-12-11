// ------------------ DOM ------------------
// DOM elements will be initialized after HTML partials are loaded
let reciterSel,
  surahSel,
  ayahStartSel,
  ayahEndSel,
  fontPicker,
  arabicFontPicker,
  textSize,
  textSizeVal,
  arabicTextSize,
  arabicTextSizeVal;
arabicTextSizeVal;
let bgColorInput,
  fontColorInput,
  arabicFontColorInput,
  creditColorInput,
  textBoxColorInput,
  textBoxOpacitySlider,
  textBoxOpacityVal;
let creditDataChk, creditCreatorChk, madeByInput, creditMadeByChk, showArabicTextChk;
let bgModeColor,
  bgModeMedia,
  bgColorField,
  bgMediaField,
  bgMediaSelect,
  bgMediaHint,
  bgUploadInput;
let previewCanvas, pctx;
let buildPreviewBtn, downloadBtn, previewPlayBtn, dismissBtn, takePictureBtn, multiExportBtn;
let arVerticalBtn, arSquareBtn;
let volumeSlider, volumeVal;
let audio, recStatus, meterBar;

function initializeDOM() {
  console.log("initializeDOM called");
  reciterSel = $("#reciter");
  surahSel = $("#surah");
  ayahStartSel = $("#ayahStart");
  ayahEndSel = $("#ayahEnd");
  fontPicker = $("#fontPicker");
  arabicFontPicker = $("#arabicFontPicker");
  textSize = $("#textSize");
  textSizeVal = $("#textSizeVal");
  arabicTextSize = $("#arabicTextSize");
  arabicTextSizeVal = $("#arabicTextSizeVal");

  bgColorInput = $("#bgColor");
  fontColorInput = $("#fontColor");
  arabicFontColorInput = $("#arabicFontColor");
  creditColorInput = $("#creditColor");
  textBoxColorInput = $("#textBoxColor");
  textBoxOpacitySlider = $("#textBoxOpacity");
  textBoxOpacityVal = $("#textBoxOpacityVal");

  translationEditionSel = $("#translationEdition");

  creditDataChk = $("#creditData");
  creditCreatorChk = $("#creditCreator");
  madeByInput = $("#madeByInput");
  creditMadeByChk = $("#creditMadeBy");
  showArabicTextChk = $("#showArabicText");

  bgModeColor = $("#bgModeColor");
  bgModeMedia = $("#bgModeMedia");
  bgColorField = $("#bgColorField");
  bgMediaField = $("#bgMediaField");
  bgMediaSelect = $("#bgMediaSelect");
  bgMediaHint = $("#bgMediaHint");
  bgUploadInput = $("#bgUploadInput");

  console.log("DOM Elements found:", {
    bgModeMedia: !!bgModeMedia,
    bgMediaSelect: !!bgMediaSelect,
    bgUploadInput: !!bgUploadInput,
  });

  previewCanvas = $("#previewCanvas");
  if (!previewCanvas) {
    console.error("previewCanvas not found!");
    return false;
  }
  pctx = previewCanvas.getContext("2d");

  // Expose canvas and context to drawing module
  window.previewCanvas = previewCanvas;
  window.pctx = pctx;

  buildPreviewBtn = $("#buildPreviewBtn");
  takePictureBtn = $("#takePictureBtn");
  multiExportBtn = $("#multiExportBtn");
  downloadBtn = $("#downloadBtn");
  previewPlayBtn = $("#previewPlayBtn");
  dismissBtn = $("#dismissBtn");

  arVerticalBtn = $("#arVerticalBtn");
  arSquareBtn = $("#arSquareBtn");

  // Volume UI
  volumeSlider = $("#volumeSlider");
  volumeVal = $("#volumeVal");

  audio = $("#audioPlayer");
  recStatus = $("#recStatus");
  meterBar = $("#meterBar");
  if (audio) {
    audio.crossOrigin = "anonymous";
  }

  return true;
}

// ------------------ State ------------------
// Expose state variables to window for module access
window.playlist = [];
window.index = 0;
window.isPlaying = false;

// text controls
window.selectedFont = "Inter, sans-serif";
window.selectedArabicFont = "Inter, sans-serif";
window.sizePercent = 100; // 25–160
window.translationEdition = "en.sahih";

// drawing content
window.currentText =
  "In the name of Allah, the Most Gracious, the Most Merciful";
window.currentArabicText = "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ";
window.currentLabel = "Al-Fatiha 1:1";

window.fontColor = "#111111";
window.arabicFontColor = "#111111";

// credits
window.showCreditData = true;
window.showCreditCreator = true;
window.showArabicText = true;

// recording state
window.audioCtx = null;
window.srcNode = null;
window.gainNode = null;
window.destNode = null;
window.mixedStream = null;
window.connections = { toDest: false, toRecorder: false };

window.recorder = null;
window.chunks = [];
window.recordingStarted = false;
window.finalBlob = null;
window.hasAudioError = false;
window.wasDismissed = false;
window.multiExportMode = false;
window.multiExportBlobs = [];

// gate: only record when explicitly allowed
window.allowRecording = true;

// progress
window.totalAyahs = 0;

// session info for filename
window.sessionSurah = 1;
window.sessionSurahName = "Al-Fatihah";
window.sessionFrom = 1;
window.sessionTo = 1;
window.sessionReciterName = "Unknown";

// ------------------ Font mapping by language ------------------
const fontsByLanguage = {
  // Western/Latin languages
  en: {
    // English
    fonts: [
      "Inter, sans-serif",
      "Poppins, sans-serif",
      "Lora, serif",
      "Merriweather, serif",
      "Nunito, sans-serif",
      "Roboto Slab, serif",
      "Montserrat, sans-serif",
      "Open Sans, sans-serif",
      "Source Sans 3, sans-serif",
      "Work Sans, sans-serif",
      "Raleway, sans-serif",
      "Lato, sans-serif",
      "Oswald, sans-serif",
      "Ubuntu, sans-serif",
      "PT Sans, sans-serif",
      "Karla, sans-serif",
      "Rubik, sans-serif",
      "Heebo, sans-serif",
      "Barlow, sans-serif",
      "Manrope, sans-serif",
      "Space Grotesk, sans-serif",
      "Fira Sans, sans-serif",
      "Playfair Display, serif",
      "DM Serif Text, serif",
      "Libre Baskerville, serif",
      "PT Serif, serif",
      "Quicksand, sans-serif",
      "Space Mono, monospace",
      "Fira Code, monospace",
      "JetBrains Mono, monospace",
    ],
    default: "Inter, sans-serif",
  },

  // Arabic
  ar: {
    fonts: [
      "Amiri, serif",
      "Scheherazade New, serif",
      "Cairo, sans-serif",
      "Changa, sans-serif",
      "Reem Kufi, sans-serif",
      "Noto Naskh Arabic, serif",
      "Noto Kufi Arabic, sans-serif",
      "IBM Plex Sans Arabic, sans-serif",
      "Tajawal, sans-serif",
      "El Messiri, sans-serif",
      "Markazi Text, serif",
      "Lateef, serif",
      "Harmattan, sans-serif",
      "Aref Ruqaa, serif",
      "Katibeh, cursive",
      "Lalezar, cursive",
      "Rakkas, cursive",
      "Mada, sans-serif",
      "Almarai, sans-serif",
    ],
    default: "Amiri, serif",
  },

  // Bengali/Bangla
  bn: {
    fonts: [
      "Hind Siliguri, sans-serif",
      "Noto Sans Bengali, sans-serif",
      "Noto Serif Bengali, serif",
      "Baloo Da 2, cursive",
      "Mukta, sans-serif",
    ],
    default: "Noto Sans Bengali, sans-serif",
  },

  // Hindi/Devanagari
  hi: {
    fonts: [
      "Noto Sans Devanagari, sans-serif",
      "Noto Serif Devanagari, serif",
      "Poppins, sans-serif",
      "Hind, sans-serif",
      "Tiro Devanagari Hindi, serif",
    ],
    default: "Noto Sans Devanagari, sans-serif",
  },

  // Urdu (uses Arabic script)
  ur: {
    fonts: [
      "Amiri, serif",
      "Scheherazade New, serif",
      "Noto Naskh Arabic, serif",
      "Noto Kufi Arabic, sans-serif",
      "Jameel Noori Nastaleeq, cursive",
      "Lateef, serif",
    ],
    default: "Noto Naskh Arabic, serif",
  },

  // Indonesian (uses Latin script)
  id: {
    fonts: [
      "Inter, sans-serif",
      "Poppins, sans-serif",
      "Lora, serif",
      "Nunito, sans-serif",
      "Open Sans, sans-serif",
      "Roboto, sans-serif",
    ],
    default: "Poppins, sans-serif",
  },

  // French (Latin)
  fr: {
    fonts: [
      "Inter, sans-serif",
      "Poppins, sans-serif",
      "Lora, serif",
      "Merriweather, serif",
      "Montserrat, sans-serif",
      "Playfair Display, serif",
    ],
    default: "Merriweather, serif",
  },

  // Chinese Simplified
  zh: {
    fonts: [
      "Noto Sans SC, sans-serif",
      "Noto Serif SC, serif",
      "Ma Shan Zheng, cursive",
    ],
    default: "Noto Sans SC, sans-serif",
  },

  // Japanese
  ja: {
    fonts: [
      "Noto Sans JP, sans-serif",
      "Noto Serif JP, serif",
      "M PLUS Rounded 1c, sans-serif",
    ],
    default: "Noto Sans JP, sans-serif",
  },

  // Korean
  ko: {
    fonts: [
      "Noto Sans KR, sans-serif",
      "Noto Serif KR, serif",
      "Black Han Sans, sans-serif",
    ],
    default: "Noto Sans KR, sans-serif",
  },

  // Thai
  th: {
    fonts: [
      "Noto Sans Thai, sans-serif",
      "Noto Serif Thai, serif",
      "Prompt, sans-serif",
    ],
    default: "Noto Sans Thai, sans-serif",
  },

  // Vietnamese (Latin with diacritics)
  vi: {
    fonts: [
      "Noto Sans, sans-serif",
      "Be Vietnam Pro, sans-serif",
      "Inter, sans-serif",
      "Poppins, sans-serif",
    ],
    default: "Be Vietnam Pro, sans-serif",
  },

  // Russian/Cyrillic
  ru: {
    fonts: [
      "Roboto, sans-serif",
      "Noto Sans, sans-serif",
      "PT Sans, sans-serif",
      "Montserrat, sans-serif",
    ],
    default: "Roboto, sans-serif",
  },

  // Turkish (Latin)
  tr: {
    fonts: [
      "Inter, sans-serif",
      "Poppins, sans-serif",
      "Roboto, sans-serif",
      "Open Sans, sans-serif",
    ],
    default: "Inter, sans-serif",
  },

  // Persian/Farsi (uses Arabic script)
  fa: {
    fonts: [
      "Amiri, serif",
      "Scheherazade New, serif",
      "Noto Naskh Arabic, serif",
      "Lateef, serif",
    ],
    default: "Amiri, serif",
  },
};

// Map font values to display names
const fontDisplayNames = {
  "Inter, sans-serif": "Inter",
  "Poppins, sans-serif": "Poppins",
  "Lora, serif": "Lora",
  "Merriweather, serif": "Merriweather",
  "Nunito, sans-serif": "Nunito",
  "Roboto Slab, serif": "Roboto Slab",
  "Montserrat, sans-serif": "Montserrat",
  "Open Sans, sans-serif": "Open Sans",
  "Source Sans 3, sans-serif": "Source Sans 3",
  "Work Sans, sans-serif": "Work Sans",
  "Raleway, sans-serif": "Raleway",
  "Lato, sans-serif": "Lato",
  "Oswald, sans-serif": "Oswald",
  "Ubuntu, sans-serif": "Ubuntu",
  "PT Sans, sans-serif": "PT Sans",
  "Karla, sans-serif": "Karla",
  "Rubik, sans-serif": "Rubik",
  "Heebo, sans-serif": "Heebo",
  "Barlow, sans-serif": "Barlow",
  "Manrope, sans-serif": "Manrope",
  "Space Grotesk, sans-serif": "Space Grotesk",
  "Fira Sans, sans-serif": "Fira Sans",
  "Playfair Display, serif": "Playfair Display",
  "DM Serif Text, serif": "DM Serif Text",
  "Libre Baskerville, serif": "Libre Baskerville",
  "PT Serif, serif": "PT Serif",
  "Quicksand, sans-serif": "Quicksand",
  "Space Mono, monospace": "Space Mono",
  "Fira Code, monospace": "Fira Code",
  "JetBrains Mono, monospace": "JetBrains Mono",
  "Amiri, serif": "Amiri",
  "Scheherazade New, serif": "Scheherazade New",
  "Cairo, sans-serif": "Cairo",
  "Changa, sans-serif": "Changa",
  "Reem Kufi, sans-serif": "Reem Kufi",
  "Noto Naskh Arabic, serif": "Noto Naskh Arabic",
  "Noto Kufi Arabic, sans-serif": "Noto Kufi Arabic",
  "IBM Plex Sans Arabic, sans-serif": "IBM Plex Sans Arabic",
  "Tajawal, sans-serif": "Tajawal",
  "El Messiri, sans-serif": "El Messiri",
  "Markazi Text, serif": "Markazi Text",
  "Lateef, serif": "Lateef",
  "Harmattan, sans-serif": "Harmattan",
  "Aref Ruqaa, serif": "Aref Ruqaa",
  "Katibeh, cursive": "Katibeh",
  "Lalezar, cursive": "Lalezar",
  "Rakkas, cursive": "Rakkas",
  "Mada, sans-serif": "Mada",
  "Almarai, sans-serif": "Almarai",
  "Hind Siliguri, sans-serif": "Hind Siliguri",
  "Noto Sans Bengali, sans-serif": "Noto Sans Bengali",
  "Noto Serif Bengali, serif": "Noto Serif Bengali",
  "Baloo Da 2, cursive": "Baloo Da 2",
  "Mukta, sans-serif": "Mukta",
  "Noto Sans Devanagari, sans-serif": "Noto Sans Devanagari",
  "Noto Serif Devanagari, serif": "Noto Serif Devanagari",
  "Hind, sans-serif": "Hind",
  "Tiro Devanagari Hindi, serif": "Tiro Devanagari",
  "Noto Sans SC, sans-serif": "Noto Sans SC (Chinese Simplified)",
  "Noto Sans TC, sans-serif": "Noto Sans TC (Chinese Traditional)",
  "Noto Serif SC, serif": "Noto Serif SC",
  "Ma Shan Zheng, cursive": "Ma Shan Zheng",
  "Noto Sans JP, sans-serif": "Noto Sans JP",
  "Noto Serif JP, serif": "Noto Serif JP",
  "M PLUS Rounded 1c, sans-serif": "M PLUS Rounded 1c",
  "Noto Sans KR, sans-serif": "Noto Sans KR",
  "Noto Serif KR, serif": "Noto Serif KR",
  "Black Han Sans, sans-serif": "Black Han Sans",
  "Noto Sans Thai, sans-serif": "Noto Sans Thai",
  "Noto Serif Thai, serif": "Noto Serif Thai",
  "Prompt, sans-serif": "Prompt",
  "Noto Sans, sans-serif": "Noto Sans",
  "Be Vietnam Pro, sans-serif": "Be Vietnam Pro",
  "Roboto, sans-serif": "Roboto",
};

function updateFontPickerForLanguage(langCode) {
  if (!fontPicker) return;

  // Get font list for this language, fallback to English if not found
  const langFonts = fontsByLanguage[langCode] || fontsByLanguage["en"];

  // Clear and repopulate the font picker
  fontPicker.innerHTML = langFonts.fonts
    .map(
      (font) =>
        `<option value="${font}">${fontDisplayNames[font] || font}</option>`
    )
    .join("");

  // Set default font for this language
  fontPicker.value = langFonts.default;
  window.selectedFont = langFonts.default;

  // Trigger update
  onAnyInputChange();
}

// ------------------ Aspect Ratio Logic ------------------
function setAspectRatio(type) {
  if (!previewCanvas) return;
  
  if (type === "square") {
    previewCanvas.width = 1080;
    previewCanvas.height = 1080;
    previewCanvas.style.aspectRatio = "1 / 1";
    
    arVerticalBtn?.classList.remove("active");
    arSquareBtn?.classList.add("active");
  } else {
    // Default: Vertical
    previewCanvas.width = 1080;
    previewCanvas.height = 1920;
    previewCanvas.style.aspectRatio = "9 / 16";
    
    arSquareBtn?.classList.remove("active");
    arVerticalBtn?.classList.add("active");
  }

  // Reset video buffer to force redraw with new dimensions
  if (window.resetVideoBuffer) window.resetVideoBuffer();
  
  // Trigger redraw
  if (window.drawingModule && window.drawingModule.drawPreview) {
    window.drawingModule.drawPreview();
  }
}

// Get current aspect ratio as string for filename
function getAspectRatioString() {
  if (!previewCanvas) return "9-16";
  const width = previewCanvas.width;
  const height = previewCanvas.height;
  
  // Check if square (1:1)
  if (width === height) {
    return "1-1";
  }
  // Default to vertical (9:16)
  return "9-16";
}

// ------------------ UI toggle helper ------------------
function setDuringRecordingUI(active) {
  const stopBtn = document.getElementById("previewStopBtn");
  if (dismissBtn) dismissBtn.disabled = !active;
  if (previewPlayBtn) previewPlayBtn.disabled = !!active;
  if (stopBtn) stopBtn.disabled = !!active;
}

// ------------------ Change handling ------------------
function resetSessionUI() {
  try {
    if (window.recorder && window.recorder.state === "recording")
      window.recorder.stop();
  } catch {}
  window.recorder = null;
  window.recordingStarted = false;
  window.chunks = [];
  window.finalBlob = null;
  downloadBtn.disabled = true;
  recStatus.textContent =
    "Press Play & Export to preview & auto-record. Avoid the right audio controller during recording.";
  meterBar.style.width = "0%";
  window.multiExportMode = false;
  setDuringRecordingUI(false);
}

// Expose to window for audio module
window.resetSessionUI = resetSessionUI;
window.setDuringRecordingUI = setDuringRecordingUI;

function handleMultiExportNext() {
  if (!window.finalBlob) return;
  
  // 1. Cache current file
  const ts = timestampStr();
  const s = window.metadataModule.meta.surahs.find((x) => x.number === window.sessionSurah);
  const sName = s ? s.englishName : "Unknown";
  // current playlist item
  const it = window.playlist[window.index];
  const actualAyahNumber = it ? it.ayah : window.sessionFrom + window.index;
  
  const translationEdition = window.translationEdition || "en.sahih";
  const translationName = translationEdition.replace(/\./g, "-");
  const aspectRatio = getAspectRatioString();
  
  const filename = `Surah-${window.sessionSurah}-${safe(sName)}_Ayah-${actualAyahNumber}_${aspectRatio}_${safe(window.sessionReciterName)}_${translationName}_${ts}.webm`;
  
  window.multiExportBlobs.push({
      blob: window.finalBlob,
      filename: filename
  });

  // 2. Advance to next
  if (window.index < window.playlist.length - 1) {
    window.index++;
    window.audioModule.updateMeter();
    // Give a small delay to ensure cleanup
    setTimeout(() => {
         window.audioModule.playIndex(window.index, true); 
    }, 500);
  } else {
    // Done
    window.isPlaying = false;
    window.audioModule.updateMeter();
    const recStatus = document.getElementById("recStatus");
    const downloadBtn = document.getElementById("downloadBtn");
    
    if (recStatus) recStatus.textContent = "Multi-export ready. Click 'Download' to save all videos as a Zip.";
    if (downloadBtn) downloadBtn.disabled = false;
    
    setDuringRecordingUI(false);
  }
}
window.handleMultiExportNext = handleMultiExportNext;

function onAnyInputChange() {
  resetSessionUI();
  window.selectedFont = fontPicker.value;
  window.selectedArabicFont = arabicFontPicker?.value || "Inter, sans-serif";
  window.sizePercent = parseInt(textSize.value, 10) || 100;
  if (textSizeVal) textSizeVal.textContent = `(${window.sizePercent}%)`;
  if (bgColorInput) {
    window.backgroundModule.setBgColor(bgColorInput.value);
  }
  if (fontColorInput) window.fontColor = fontColorInput.value;
  if (arabicFontColorInput) window.arabicFontColor = arabicFontColorInput.value;
  if (creditColorInput) window.creditColor = creditColorInput.value;
  window.translationEdition = translationEditionSel?.value || "en.sahih";
  window.showCreditData = !!creditDataChk?.checked;
  window.showCreditCreator = !!creditCreatorChk?.checked;
  window.showArabicText = !!showArabicTextChk?.checked;
}

// Expose to window for metadata module
window.onAnyInputChange = onAnyInputChange;

// Update picture save count based on ayah selection
function updatePictureSaveCount() {
  const ayahStartSel = $("#ayahStart");
  const ayahEndSel = $("#ayahEnd");
  const pictureSaveCount = $("#pictureSaveCount");
  const multiExportCount = $("#multiExportCount");
  
  if (!ayahStartSel || !ayahEndSel) return;
  
  const start = +ayahStartSel.value || 1;
  const end = +ayahEndSel.value || 1;
  const count = Math.max(1, end - start + 1);
  
  if (pictureSaveCount) pictureSaveCount.textContent = `(${count})`;
  if (multiExportCount) multiExportCount.textContent = `(${count})`;
}

// Expose to window for metadata module
window.updatePictureSaveCount = updatePictureSaveCount;

function setupEventListeners() {
  [
    reciterSel,
    surahSel,
    ayahStartSel,
    ayahEndSel,
    fontPicker,
    arabicFontPicker,
    textSize,
    arabicTextSize,
    creditDataChk,
    creditCreatorChk,
    bgColorInput,
    fontColorInput,
    arabicFontColorInput,
    creditColorInput,
    textBoxColorInput,
    translationEditionSel,
    showArabicTextChk,
  ]
    .filter(Boolean)
    .forEach((el) => {
      el.addEventListener("change", onAnyInputChange);
      // Real-time updates for sliders and color pickers
      if (
        el === textSize ||
        el === arabicTextSize ||
        el === fontColorInput ||
        el === arabicFontColorInput ||
        el === creditColorInput
      ) {
        el.addEventListener("input", () => {
          if (el === textSize) {
            window.sizePercent = parseInt(textSize.value, 10) || 100;
            if (textSizeVal)
              textSizeVal.textContent = `(${window.sizePercent}%)`;
          }
          if (el === arabicTextSize) {
            window.arabicSizePercent =
              parseInt(arabicTextSize.value, 10) || 100;
            if (arabicTextSizeVal)
              arabicTextSizeVal.textContent = `(${window.arabicSizePercent}%)`;
          }
          onAnyInputChange();
        });
      }

      // Special handling for translation edition changes
      if (el === translationEditionSel) {
        el.addEventListener("change", async () => {
          const edition = translationEditionSel.value;
          if (!edition) return;

          // Extract language code (e.g., "en" from "en.asad")
          const langCode = edition.split(".")[0].toLowerCase();

          // Update font picker based on language
          updateFontPickerForLanguage(langCode);

          // Load translation preview
          await loadTranslationPreview(edition);

          onAnyInputChange();
        });
      }
    });

  // Color preview
  bgColorInput?.addEventListener("input", () => {
    window.backgroundModule.setBgColor(bgColorInput.value);
  });
  fontColorInput?.addEventListener("input", () => {
    window.fontColor = fontColorInput.value;
  });
  creditColorInput?.addEventListener("input", () => {
    window.creditColor = creditColorInput.value;
  });
  arabicFontColorInput?.addEventListener("input", () => {
    window.arabicFontColor = arabicFontColorInput.value;
  });
  textBoxColorInput?.addEventListener("input", () => {
    window.backgroundModule.setTextBoxColor(textBoxColorInput.value);
  });
  textBoxOpacitySlider?.addEventListener("input", () => {
    const opacityPercent = parseInt(textBoxOpacitySlider.value, 10);
    if (textBoxOpacityVal) textBoxOpacityVal.textContent = `${opacityPercent}%`;
    window.backgroundModule.setTextBoxOpacity(opacityPercent / 100);
  });

  // ------------------ Background mode toggles ------------------
  bgModeColor?.addEventListener("change", () => {
    if (bgModeColor.checked) {
      window.backgroundModule.setBackgroundMode("color");
      window.backgroundModule.applyBgModeUI();
    }
  });
  bgModeMedia?.addEventListener("change", async () => {
    if (bgModeMedia.checked) {
      window.backgroundModule.setBackgroundMode("media");
      window.backgroundModule.applyBgModeUI();
      if (!window.backgroundModule.bgMediaList.length)
        await window.backgroundModule.loadBackgroundAssets();
    }
  });

  // Wire up background media select change
  if (bgMediaSelect) {
    bgMediaSelect.addEventListener("change", () => {
      window.backgroundModule.onBgMediaChange();
    });
  }

  // Wire up background file upload using delegation
  document.addEventListener("change", (e) => {
    if (e.target && e.target.id === "bgUploadInput") {
      console.log("Delegated change event on bgUploadInput", e.target.files);
      if (e.target.files && e.target.files.length) {
        window.backgroundModule.handleUserUploads(e.target.files);

        const bgModeMedia = document.getElementById("bgModeMedia");
        const bgMediaSelect = document.getElementById("bgMediaSelect");

        // Switch to media mode if not already
        if (bgModeMedia && !bgModeMedia.checked) {
          bgModeMedia.checked = true;
          window.backgroundModule.setBackgroundMode("media");
          window.backgroundModule.applyBgModeUI();
        }

        // Select the first item (which is the user upload)
        if (bgMediaSelect) {
          console.log("Setting bgMediaSelect value to 0");
          bgMediaSelect.value = "0";
          window.backgroundModule.onBgMediaChange();
        }
      }
    }
  });

  // Wire up surah change to update ayah range
  if (surahSel) {
    surahSel.addEventListener("change", () => {
      window.metadataModule.updateAyahRange();
    });
  }

  // Wire up ayah range changes to update picture count
  if (ayahStartSel) {
    ayahStartSel.addEventListener("change", () => {
      updatePictureSaveCount();
    });
  }
  if (ayahEndSel) {
    ayahEndSel.addEventListener("change", () => {
      updatePictureSaveCount();
    });
  }

  // Wire up playback buttons
  if (buildPreviewBtn) {
    buildPreviewBtn.addEventListener("click", async () => {
      await window.audioModule.ensureGraphOnGesture();
      window.allowRecording = true;
      window.audioModule.updateAudioRouting();
      window.audioModule.setVolumeFromSlider();
      await window.audioModule.loadAndPlay({ record: true });
    });
  }

  if (previewPlayBtn) {
    previewPlayBtn.addEventListener("click", async () => {
      await window.audioModule.ensureGraphOnGesture();
      window.allowRecording = false;
      window.audioModule.updateAudioRouting();
      window.audioModule.setVolumeFromSlider();
      await window.audioModule.loadAndPlay({ record: false });
    });
  }

  // Take Picture button
  if (takePictureBtn) {
    takePictureBtn.addEventListener("click", async () => {
      // 1. Ensure audio graph (just in case, though we won't play audio)
      await window.audioModule.ensureGraphOnGesture();
      window.allowRecording = false; // No recording needed

      // 2. Get range
      const surahSel = $("#surah");
      const ayahStartSel = $("#ayahStart");
      const ayahEndSel = $("#ayahEnd");
      const reciterSel = $("#reciter");
      const translationEditionSel = $("#translationEdition");
      const sNum = +surahSel.value || 1;
      const s = window.metadataModule.meta.surahs.find((x) => x.number === sNum);
      const sName = s?.englishName || "Unknown";
      const start = +ayahStartSel.value || 1;
      const end = +ayahEndSel.value || 1;
      const reciterName = reciterSel.options[reciterSel.selectedIndex]?.text || "Unknown";
      const translationEdition = translationEditionSel?.value || window.translationEdition || "en.sahih";
      const translationName = translationEdition.replace(/\./g, "-");

      if (start > end) {
        alert("Invalid Ayah range.");
        return;
      }

      const imageCount = end - start + 1;
      const ts = timestampStr();
      const aspectRatio = getAspectRatioString();

      // 3. Check if we need to create a zip file (>5 images)
      if (imageCount > 5) {
        // Create zip file
        const zip = new JSZip();
        const folder = zip.folder(`Surah-${sNum}-${safe(sName)}_Ayah-${start}-${end}_${aspectRatio}_${translationName}`);

        // Show progress (optional)
        const recStatus = $("#recStatus");
        if (recStatus) {
          recStatus.textContent = `Preparing ${imageCount} images for download...`;
        }

        // Iterate and capture each ayah
        for (let i = start; i <= end; i++) {
          // Update session info
          window.sessionSurah = sNum;
          window.sessionSurahName = sName;
          window.sessionFrom = start;
          window.sessionTo = end;
          window.sessionReciterName = reciterName;
          
          // Prepare playlist
          window.playlist = [];
          for (let a = start; a <= end; a++) {
            window.playlist.push({ surah: sNum, ayah: a, sName: sName });
          }
          window.index = i - start;

          // Load data (text, translation) but DO NOT autoplay
          await window.audioModule.playIndex(window.index, false);

          // Wait for canvas to render
          await new Promise((r) => setTimeout(r, 500));

          // Capture canvas as blob
          const canvas = document.getElementById("previewCanvas");
          if (canvas) {
            const blob = await new Promise((resolve) => {
              canvas.toBlob(resolve, "image/png");
            });
            
            // Add to zip
            const filename = `Surah-${sNum}-${safe(sName)}_Ayah-${i}_${aspectRatio}_${translationName}.png`;
            folder.file(filename, blob);

            // Update progress
            if (recStatus) {
              recStatus.textContent = `Captured ${i - start + 1} of ${imageCount} images...`;
            }
          }
        }

        // Generate and download zip
        if (recStatus) {
          recStatus.textContent = `Creating zip file...`;
        }

        const zipBlob = await zip.generateAsync({ type: "blob" });
        const zipUrl = URL.createObjectURL(zipBlob);
        const link = document.createElement("a");
        link.download = `Surah-${sNum}-${safe(sName)}_Ayah-${start}-${end}_${aspectRatio}_${translationName}_${ts}.zip`;
        link.href = zipUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(zipUrl);

        if (recStatus) {
          recStatus.textContent = `Download complete! ${imageCount} images saved in zip file.`;
        }

      } else {
        // Download individually (≤5 images)
        for (let i = start; i <= end; i++) {
          // Update session info
          window.sessionSurah = sNum;
          window.sessionSurahName = sName;
          window.sessionFrom = start;
          window.sessionTo = end;
          window.sessionReciterName = reciterName;
          
          // Prepare playlist
          window.playlist = [];
          for (let a = start; a <= end; a++) {
            window.playlist.push({ surah: sNum, ayah: a, sName: sName });
          }
          window.index = i - start;

          // Load data (text, translation) but DO NOT autoplay
          await window.audioModule.playIndex(window.index, false);

          // Wait for canvas to render
          await new Promise((r) => setTimeout(r, 500));

          // Capture and download canvas
          const canvas = document.getElementById("previewCanvas");
          if (canvas) {
            const dataUrl = canvas.toDataURL("image/png");
            const link = document.createElement("a");
            link.download = `Surah-${sNum}-${safe(sName)}_Ayah-${i}_${aspectRatio}_${translationName}_${ts}.png`;
            link.href = dataUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
        }
      }
    });

  }

  // Multi Single Video Export
  if (multiExportBtn) {
    multiExportBtn.addEventListener("click", async () => {
      // Setup similar to buildPreviewBtn but with mode flag
      await window.audioModule.ensureGraphOnGesture();
      window.allowRecording = true;
      window.multiExportMode = true;
      window.audioModule.updateAudioRouting();
      window.audioModule.setVolumeFromSlider();
      
      // Reset cache
      window.multiExportBlobs = [];

      // Load and play - this prepares playlist and starts first item
      // We pass record: true which resets valid flags, so set mode after
      await window.audioModule.loadAndPlay({ record: true });
      window.multiExportMode = true; // Ensure it stays true after loadAndPlay reset
    });
  }

  // Aspect Ratio Toggles
  if (arVerticalBtn) {
    arVerticalBtn.addEventListener("click", () => setAspectRatio("vertical"));
  }
  if (arSquareBtn) {
    arSquareBtn.addEventListener("click", () => setAspectRatio("square"));
  }

  // Stop button
  const previewStopBtn = $("#previewStopBtn");
  if (previewStopBtn) {
    previewStopBtn.addEventListener("click", () => {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
        window.index = 0;
        window.audioModule.updateMeter();
        window.isPlaying = false;
        if (window.recorder && window.recorder.state === "recording") {
          window.audioModule.stopRecordingIfActive();
        }
      }
    });
  }

  if (audio) {
    audio.addEventListener("play", async () => {
      window.isPlaying = true;
      await window.audioModule.ensureGraphOnGesture();
      window.audioModule.updateAudioRouting();
      if (window.allowRecording) window.audioModule.startRecordingIfNeeded();
    });
    audio.addEventListener("pause", () => {
      window.isPlaying = false;
    });
    audio.addEventListener("ended", async () => {
      if (window.multiExportMode) {
        // In multi-export mode, we DO NOT auto-advance here.
        // We stop the recorder, which triggers onstop, where we handle the download and next item.
        window.audioModule.stopRecordingIfActive();
        return;
      }

      if (window.index < window.playlist.length - 1) {
        window.index++;
        window.audioModule.updateMeter();
        await window.audioModule.playIndex(window.index, true);
      } else {
        window.isPlaying = false;
        window.audioModule.updateMeter();
        window.audioModule.stopRecordingIfActive();
      }
    });
  }

  // ------------------ Download recorded WebM ------------------
  if (downloadBtn) {
    downloadBtn.addEventListener("click", async () => {

       // Multi-Export Zip Logic
       if (window.multiExportMode && window.multiExportBlobs.length > 0) {
            const zip = new JSZip();
            window.multiExportBlobs.forEach(item => {
                zip.file(item.filename, item.blob);
            });
            
            const recStatus = $("#recStatus");
            if (recStatus) recStatus.textContent = "Zipping files...";
            
            try {
                const content = await zip.generateAsync({type:"blob"});
                const ts = timestampStr();
                 const s = window.metadataModule.meta.surahs.find((x) => x.number === window.sessionSurah);
                 const sName = s ? s.englishName : "Unknown";
                 
                const zipName = `QuranShorts_Multi_${window.sessionSurah}-${safe(sName)}_${ts}.zip`;
                
                const url = URL.createObjectURL(content);
                const a = document.createElement("a");
                a.href = url;
                a.download = zipName;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                    URL.revokeObjectURL(url);
                    a.remove();
                }, 1000);
                
                if (recStatus) recStatus.textContent = "Zip downloaded!";
                
                // Reset mode after successful download
                window.multiExportMode = false;
                window.multiExportBlobs = [];
                
            } catch (e) {
                console.error("Zip generation failed:", e);
                if (recStatus) recStatus.textContent = "Error creating zip file.";
            }
            return;
       }

      if (!window.finalBlob) return;
      const ts = timestampStr();
      const translationEdition = window.translationEdition || "en.sahih";
      const translationName = translationEdition.replace(/\./g, "-");
      const aspectRatio = getAspectRatioString();
      const filename = `Surah-${window.sessionSurah}-${safe(
        window.sessionSurahName
      )}_Ayah-${window.sessionFrom}-${window.sessionTo}_${aspectRatio}_${safe(
        window.sessionReciterName
      )}_${translationName}_${ts}.webm`;
      const url = URL.createObjectURL(window.finalBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        URL.revokeObjectURL(url);
        a.remove();
      }, 1000);
    });
  }

  // ------------------ Dismiss behavior ------------------
  if (dismissBtn) {
    dismissBtn.addEventListener("click", () => {
      window.wasDismissed = true;
      try {
        if (audio) {
          audio.pause();
          audio.currentTime = 0;
        }
        window.audioModule.stopRecordingIfActive();
      } catch {}
      window.chunks = [];
      window.finalBlob = null;
      if (downloadBtn) downloadBtn.disabled = true;
      if (recStatus) recStatus.textContent = "Dismissed. Ready.";
      setDuringRecordingUI(false);
    });
  }

  // ------------------ Volume slider wiring ------------------
  if (volumeSlider) {
    volumeSlider.addEventListener("input", async () => {
      await window.audioModule.ensureGraphOnGesture();
      window.audioModule.setVolumeFromSlider();
      // routing unchanged, element remains audible
    });
  }
}

// Note: populateSelectFromList is already exposed by background.js module

// ------------------ Init ------------------
async function initializeApp() {
  // Wait for HTML partials to be loaded
  if (!initializeDOM()) {
    console.error(
      "Failed to initialize DOM elements. Waiting for HTML partials..."
    );
    return;
  }

  // Set up all event listeners after DOM is ready
  setupEventListeners();

  await window.metadataModule.loadMeta();
  window.recitersModule.loadReciters(); // populate reciter list with highest-bitrate dedup

  // NEW: populate all translation editions
  await window.translationsModule.loadTranslations();

  window.selectedFont = fontPicker.value;
  window.selectedArabicFont = arabicFontPicker?.value || "Inter, sans-serif";
  window.sizePercent = parseInt(textSize.value, 10) || 100;
  if (textSizeVal) textSizeVal.textContent = `(${window.sizePercent}%)`;
  window.backgroundModule.setBgColor(bgColorInput.value);
  window.fontColor = fontColorInput.value;
  window.creditColor = creditColorInput?.value || "#1f1f1f";

  // Keep state aligned with the <select>
  window.translationEdition =
    translationEditionSel?.value || window.translationEdition || "en.sahih";

  window.showCreditData = !!creditDataChk?.checked;
  window.showCreditCreator = !!creditCreatorChk?.checked;
  window.backgroundModule.applyBgModeUI();
  await window.backgroundModule.loadBackgroundAssets();
  setDuringRecordingUI(false);

  // Volume UI defaults
  if (volumeVal) volumeVal.textContent = `${volumeSlider?.value || 100}%`;
  if (audio) audio.volume = (Number(volumeSlider?.value) || 100) / 100;

  window.drawingModule.drawPreview();
  setPanelNumbers();
  setupMobileNav();

  // Load initial translation preview (Bismillah)
  if (translationEditionSel?.value) {
    loadTranslationPreview(translationEditionSel.value);
  }
}

async function loadTranslationPreview(edition) {
  if (!edition) return;

  try {
    // Fetch Al-Fatiha 1:1 (Bismillah) in the selected language
    const response = await fetch(
      `https://api.alquran.cloud/v1/ayah/1/${edition}`
    );
    const data = await response.json();

    if (data?.data?.text) {
      window.currentText = data.data.text;
      window.currentLabel = "Al-Fatiha 1:1";
    }
  } catch (error) {
    console.warn("Failed to fetch translation preview:", error);
  }
}

function setPanelNumbers() {
  const panels = document.querySelectorAll(".panel");
  panels.forEach((panel, index) => {
    const heading = panel.querySelector("h3");
    if (heading) {
      heading.setAttribute("data-panel-number", index + 1);
    }
  });
}

function setupMobileNav() {
  const navBtns = document.querySelectorAll(".nav-btn");
  const sidebarPanels = document.querySelectorAll(".sidebar > div");

  if (!navBtns.length) return;

  // Function to switch panel
  function switchPanel(targetId) {
    // Update buttons
    navBtns.forEach((btn) => {
      if (btn.dataset.target === targetId) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    // Update panels
    sidebarPanels.forEach((panel) => {
      if (panel.id === targetId) {
        panel.classList.add("active");
      } else {
        panel.classList.remove("active");
      }
    });
  }

  // Add click listeners
  navBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.target;
      if (target) switchPanel(target);
    });
  });

  // Initialize first panel as active if none are active
  const activeBtn = document.querySelector(".nav-btn.active");
  if (activeBtn) {
    switchPanel(activeBtn.dataset.target);
  } else if (navBtns.length > 0) {
    // Default to first if no active class
    switchPanel(navBtns[0].dataset.target);
  }
}

// Wait for HTML partials to load before initializing
let appInitialized = false;

async function safeInitializeApp() {
  if (appInitialized) return;
  appInitialized = true;
  await initializeApp();
}

if (document.readyState === "loading") {
  window.addEventListener("htmlPartialsLoaded", safeInitializeApp);
} else {
  // If DOM is already loaded, wait a bit for partials or try immediately
  window.addEventListener("htmlPartialsLoaded", safeInitializeApp);
  // Also try after a short delay in case event already fired
  setTimeout(() => {
    if (document.getElementById("previewCanvas")) {
      safeInitializeApp();
    }
  }, 100);
}
