// ------------------ DOM ------------------
let hadithBookSel,
  hadithNumberInput,
  hadithEditionSel,
  fontPicker,
  arabicFontPicker,
  textSize,
  textSizeVal,
  arabicTextSize,
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
let buildPreviewBtn, downloadBtn, previewPlayBtn, dismissBtn, takePictureBtn;
let arVerticalBtn, arSquareBtn;
let recStatus, meterBar;

function initializeDOM() {
  console.log("initializeDOM called for Hadith");
  hadithBookSel = $("#hadithBook");
  hadithNumberInput = $("#hadithNumber");
  hadithEditionSel = $("#hadithEdition");
  
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

  previewCanvas = $("#previewCanvas");
  if (!previewCanvas) {
    console.error("previewCanvas not found!");
    return false;
  }
  pctx = previewCanvas.getContext("2d");

  window.previewCanvas = previewCanvas;
  window.pctx = pctx;

  // buildPreviewBtn = $("#buildPreviewBtn"); // Removed for Hadith
  takePictureBtn = $("#takePictureBtn");
  // downloadBtn = $("#downloadBtn"); // Removed for Hadith
  previewPlayBtn = $("#previewPlayBtn");
  dismissBtn = $("#dismissBtn");

  arVerticalBtn = $("#arVerticalBtn");
  arSquareBtn = $("#arSquareBtn");

  recStatus = $("#recStatus");
  meterBar = $("#meterBar");

  return true;
}

// ------------------ State ------------------
window.playlist = [];
window.index = 0;
window.isPlaying = false;

window.selectedFont = "Inter, sans-serif";
window.selectedArabicFont = "Inter, sans-serif";
window.sizePercent = 100;
window.hadithEdition = "eng-sahihbukhari";

window.currentText = "Hadith text will appear here.";
window.currentArabicText = "إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى";
window.currentLabel = "Hadith Reference";

window.fontColor = "#111111";
window.arabicFontColor = "#111111";

window.showCreditData = true;
window.showCreditCreator = true;
window.showArabicText = true;

// Recording state (simplified for Hadith)
window.audioCtx = null;
window.recorder = null;
window.chunks = [];
window.recordingStarted = false;
window.finalBlob = null;
window.hasAudioError = false;
window.wasDismissed = false;
window.allowRecording = true;

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
    previewCanvas.width = 1080;
    previewCanvas.height = 1920;
    previewCanvas.style.aspectRatio = "9 / 16";
    arSquareBtn?.classList.remove("active");
    arVerticalBtn?.classList.add("active");
  }
  if (window.drawingModule && window.drawingModule.drawPreview) {
    window.drawingModule.drawPreview();
  }
}

function getAspectRatioString() {
  if (!previewCanvas) return "9-16";
  return previewCanvas.width === previewCanvas.height ? "1-1" : "9-16";
}

function setDuringRecordingUI(active) {
  if (dismissBtn) dismissBtn.disabled = !active;
  if (previewPlayBtn) previewPlayBtn.disabled = !!active;
}

function resetSessionUI() {
  try {
    if (window.recorder && window.recorder.state === "recording")
      window.recorder.stop();
  } catch {}
  window.recorder = null;
  window.recordingStarted = false;
  window.chunks = [];
  window.finalBlob = null;
  // downloadBtn.disabled = true; // Removed for Hadith
  if (recStatus) recStatus.textContent = "Click 'Load & Preview' or 'Save Picture'.";
  if (meterBar) meterBar.style.width = "0%";
  setDuringRecordingUI(false);
}

window.resetSessionUI = resetSessionUI;
window.setDuringRecordingUI = setDuringRecordingUI;

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
  window.hadithEdition = hadithEditionSel?.value || "eng-sahihbukhari";
  window.showCreditData = !!creditDataChk?.checked;
  window.showCreditCreator = !!creditCreatorChk?.checked;
  window.showArabicText = !!showArabicTextChk?.checked;
}

window.onAnyInputChange = onAnyInputChange;

// Update picture save count based on hadith selection
function updatePictureSaveCount() {
  // For single hadith, count is always 1
  const pictureSaveCount = $("#pictureSaveCount");
  if (pictureSaveCount) {
    pictureSaveCount.textContent = `(1)`;
  }
}

window.updatePictureSaveCount = updatePictureSaveCount;

function setupEventListeners() {
  [
    hadithBookSel,
    hadithNumberInput,
    hadithEditionSel,
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
    showArabicTextChk,
  ]
    .filter(Boolean)
    .forEach((el) => {
      el.addEventListener("change", onAnyInputChange);
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
    });

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

  if (bgMediaSelect) {
    bgMediaSelect.addEventListener("change", () => {
      window.backgroundModule.onBgMediaChange();
    });
  }

  document.addEventListener("change", (e) => {
    if (e.target && e.target.id === "bgUploadInput") {
      if (e.target.files && e.target.files.length) {
        window.backgroundModule.handleUserUploads(e.target.files);
        const bgModeMedia = document.getElementById("bgModeMedia");
        if (bgModeMedia && !bgModeMedia.checked) {
          bgModeMedia.checked = true;
          window.backgroundModule.setBackgroundMode("media");
          window.backgroundModule.applyBgModeUI();
        }
        if (bgMediaSelect) {
          bgMediaSelect.value = "0";
          window.backgroundModule.onBgMediaChange();
        }
      }
    }
  });

  // if (buildPreviewBtn) { ... } // Removed for Hadith

  if (previewPlayBtn) {
    previewPlayBtn.addEventListener("click", async () => {
      window.allowRecording = false;
      await loadAndPlay({ record: false });
    });
  }

  // Wire up hadith number changes to update picture count
  if (hadithNumberInput) {
    hadithNumberInput.addEventListener("change", () => {
      updatePictureSaveCount();
    });
    hadithNumberInput.addEventListener("input", () => {
      updatePictureSaveCount();
    });
  }

  // Take Picture button for Hadith
  if (takePictureBtn) {
    takePictureBtn.addEventListener("click", async () => {
      const book = hadithBookSel.value;
      const hadithNum = parseInt(hadithNumberInput.value) || 1;
      const edition = hadithEditionSel.value;
      const bookName = window.hadithMetadata.books[book]?.name || book;
      const ts = timestampStr();
      const aspectRatio = getAspectRatioString();
      const editionName = edition.replace(/[^a-zA-Z0-9]/g, '-');
      
      // Single hadith - no zip needed
      // Prepare playlist with single hadith
      window.playlist = [{ book: book, number: hadithNum, edition: edition }];
      window.index = 0;
      
      // Load data but DO NOT autoplay
      const success = await playIndex(0, false);
      
      if (success) {
        // Wait for canvas to render
        await new Promise((r) => setTimeout(r, 500));
        
        // Capture and download canvas
        const canvas = document.getElementById("previewCanvas");
        if (canvas) {
          const dataUrl = canvas.toDataURL("image/png");
          const link = document.createElement("a");
          link.download = `${safe(bookName)}_Hadith-${hadithNum}_${aspectRatio}_${editionName}_${ts}.png`;
          link.href = dataUrl;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          if (recStatus) {
            recStatus.textContent = `Image saved successfully!`;
          }
        }
      } else {
        console.warn(`Failed to load Hadith ${hadithNum}`);
        if (recStatus) {
          recStatus.textContent = `Failed to load Hadith ${hadithNum}`;
        }
      }
    });
  }
  
  if (arVerticalBtn) arVerticalBtn.addEventListener("click", () => setAspectRatio("vertical"));
  if (arSquareBtn) arSquareBtn.addEventListener("click", () => setAspectRatio("square"));
}

async function loadAndPlay({ record }) {
  window.allowRecording = !!record;
  if (window.resetSessionUI) window.resetSessionUI();
  if (window.setDuringRecordingUI) window.setDuringRecordingUI(!!record);
  
  // Get selections
  const book = hadithBookSel.value;
  const hadithNum = parseInt(hadithNumberInput.value) || 1;
  const edition = hadithEditionSel.value;
  
  // Fetch Hadith
  try {
      const bookId = window.hadithMetadata.books[book]?.id || book.toLowerCase().replace(/\s+/g, '');
      
      // Single hadith
      window.playlist = [{ book: bookId, number: hadithNum, edition: edition }];
      window.index = 0;
      window.totalAyahs = 1;
      
      await playIndex(0, true);
      
  } catch (e) {
      console.error("Error fetching hadith", e);
      alert("Failed to fetch Hadith. Please check your internet connection.");
  }
}

async function playIndex(i, autoplay = false) {
    const item = window.playlist[i];
    if (!item) return false;
    
    // Fetch text
    try {
        // Correct API structure: /editions/{edition}/{hadith_number}.json
        const url = `https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/${item.edition}/${item.number}.json`;
        console.log("Fetching Hadith from:", url);
        const res = await fetch(url);
        
        if (!res.ok) {
            if (res.status === 403 || res.status === 404) {
                console.warn(`Hadith ${item.number} not found (403/404)`);
                window.currentText = "Hadith not found in this edition.";
                window.currentArabicText = "";
                window.drawingModule.drawPreview();
                return false;
            }
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        
        const data = await res.json();
        
        // Fetch Arabic using metadata helper
        let arabicText = "";
        const arabicEditionId = window.hadithMetadata.getArabicEditionForBook(item.book);
        
        if (arabicEditionId) {
            try {
                const araUrl = `https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/${arabicEditionId}/${item.number}.json`;
                console.log("Fetching Arabic Hadith from:", araUrl);
                const araRes = await fetch(araUrl);
                if (araRes.ok) {
                    const araData = await araRes.json();
                    arabicText = araData.hadiths?.[0]?.text || "";
                }
            } catch(e) {
                console.warn("Arabic hadith not found", e);
            }
        }
        
        const text = data.hadiths?.[0]?.text || "Text not found";
        
        // Get book name from metadata
        const bookName = window.hadithMetadata.books[item.book]?.name || item.book;
        
        window.currentText = text;
        window.currentArabicText = arabicText;
        window.currentLabel = `${bookName} #${item.number}`;
        
        window.drawingModule.drawPreview();
        
        // If recording/autoplay, we need to simulate a duration since there is no audio.
        // calculate duration based on text length?
        if (autoplay) {
            const duration = Math.max(3000, text.length * 50); // 50ms per char, min 3s
            
            // Start recording if needed
            if (window.allowRecording && !window.recordingStarted) {
                // We need audioModule to init recorder
                window.audioModule.initRecorder();
                window.audioModule.startRecordingIfNeeded();
            }
            
            window.isPlaying = true;
            
            // Wait for duration then next
            setTimeout(async () => {
                if (!window.isPlaying) return;
                
                if (window.index < window.playlist.length - 1) {
                    window.index++;
                    await playIndex(window.index, true);
                } else {
                    window.isPlaying = false;
                    window.audioModule.stopRecordingIfActive();
                }
            }, duration);
        }
        
        return true;
        
    } catch (e) {
        console.error("Failed to load hadith", e);
        window.currentText = `Failed to load Hadith: ${e.message}`;
        window.currentArabicText = "";
        window.drawingModule.drawPreview();
        return false;
    }
}

async function initializeApp() {
  if (!initializeDOM()) return;
  setupEventListeners();
  
  await window.hadithMetadata.init();
  
  window.backgroundModule.setBgColor(bgColorInput.value);
  window.fontColor = fontColorInput.value;
  window.creditColor = creditColorInput?.value || "#1f1f1f";
  window.backgroundModule.applyBgModeUI();
  await window.backgroundModule.loadBackgroundAssets();
  
  setPanelNumbers();
  setupMobileNav();
  
  // Initial draw
  window.drawingModule.drawPreview();
  
  // Update picture count
  updatePictureSaveCount();
}

function setPanelNumbers() {
  const panels = document.querySelectorAll(".panel");
  panels.forEach((panel, index) => {
    const heading = panel.querySelector("h3");
    if (heading) heading.setAttribute("data-panel-number", index + 1);
  });
}

function setupMobileNav() {
  const navBtns = document.querySelectorAll(".nav-btn");
  const sidebarPanels = document.querySelectorAll(".sidebar > div");
  if (!navBtns.length) return;
  function switchPanel(targetId) {
    navBtns.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.target === targetId);
    });
    sidebarPanels.forEach((panel) => {
      panel.classList.toggle("active", panel.id === targetId);
    });
  }
  navBtns.forEach((btn) => {
    btn.addEventListener("click", () => switchPanel(btn.dataset.target));
  });
  if (navBtns.length > 0) switchPanel(navBtns[0].dataset.target);
}

let appInitialized = false;
async function safeInitializeApp() {
  if (appInitialized) return;
  appInitialized = true;
  await initializeApp();
}

if (document.readyState === "loading") {
  window.addEventListener("htmlPartialsLoaded", safeInitializeApp);
} else {
  window.addEventListener("htmlPartialsLoaded", safeInitializeApp);
  setTimeout(() => {
    if (document.getElementById("previewCanvas")) safeInitializeApp();
  }, 100);
}
