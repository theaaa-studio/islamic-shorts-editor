// ------------------ DOM ------------------
// DOM elements will be initialized after HTML partials are loaded
let reciterSel,
  surahSel,
  ayahStartSel,
  ayahEndSel,
  fontPicker,
  textSize,
  textSizeVal;
let bgColorInput, fontColorInput;
let translationEditionSel;
let creditDataChk, creditCreatorChk, madeByInput, creditMadeByChk;
let bgModeColor,
  bgModeMedia,
  bgColorField,
  bgMediaField,
  bgMediaSelect,
  bgMediaHint,
  bgUploadInput;
let previewCanvas, pctx;
let buildPreviewBtn, downloadBtn, previewPlayBtn, dismissBtn;
let volumeSlider, volumeVal;
let audio, recStatus, meterBar;

function initializeDOM() {
  reciterSel = $("#reciter");
  surahSel = $("#surah");
  ayahStartSel = $("#ayahStart");
  ayahEndSel = $("#ayahEnd");
  fontPicker = $("#fontPicker");
  textSize = $("#textSize");
  textSizeVal = $("#textSizeVal");

  bgColorInput = $("#bgColor");
  fontColorInput = $("#fontColor");

  translationEditionSel = $("#translationEdition");

  creditDataChk = $("#creditData");
  creditCreatorChk = $("#creditCreator");
  madeByInput = $("#madeByInput");
  creditMadeByChk = $("#creditMadeBy");

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

  // Expose canvas and context to drawing module
  window.previewCanvas = previewCanvas;
  window.pctx = pctx;

  buildPreviewBtn = $("#buildPreviewBtn");
  downloadBtn = $("#downloadBtn");
  previewPlayBtn = $("#previewPlayBtn");
  dismissBtn = $("#dismissBtn");

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
window.sizePercent = 100; // 25–160
window.translationEdition = "en.asad";

// drawing content
window.currentText = "Centered translation will appear here.";
window.currentLabel = "—";

window.fontColor = "#111111";

// credits
window.showCreditData = true;
window.showCreditCreator = true;

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
  setDuringRecordingUI(false);
}

// Expose to window for audio module
window.resetSessionUI = resetSessionUI;
window.setDuringRecordingUI = setDuringRecordingUI;

function onAnyInputChange() {
  resetSessionUI();
  window.selectedFont = fontPicker.value;
  window.sizePercent = parseInt(textSize.value, 10) || 100;
  if (textSizeVal) textSizeVal.textContent = `(${window.sizePercent}%)`;
  if (bgColorInput) {
    window.backgroundModule.setBgColor(bgColorInput.value);
  }
  if (fontColorInput) window.fontColor = fontColorInput.value;
  window.translationEdition = translationEditionSel?.value || "en.asad";
  window.showCreditData = !!creditDataChk?.checked;
  window.showCreditCreator = !!creditCreatorChk?.checked;
}

// Expose to window for metadata module
window.onAnyInputChange = onAnyInputChange;

function setupEventListeners() {
  [
    reciterSel,
    surahSel,
    ayahStartSel,
    ayahEndSel,
    fontPicker,
    textSize,
    creditDataChk,
    creditCreatorChk,
    bgColorInput,
    fontColorInput,
    translationEditionSel,
  ]
    .filter(Boolean)
    .forEach((el) => {
      el.addEventListener("change", onAnyInputChange);
      if (el === textSize) {
        el.addEventListener("input", () => {
          window.sizePercent = parseInt(textSize.value, 10) || 100;
          if (textSizeVal) textSizeVal.textContent = `(${window.sizePercent}%)`;
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

  // Wire up background file upload
  bgUploadInput?.addEventListener("change", (e) => {
    handleUserFiles(e.target.files);
  });

  // Wire up surah change to update ayah range
  if (surahSel) {
    surahSel.addEventListener("change", () => {
      window.metadataModule.updateAyahRange();
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
    downloadBtn.addEventListener("click", () => {
      if (!window.finalBlob) return;
      const ts = timestampStr();
      const filename = `Surah-${window.sessionSurah}-${safe(
        window.sessionSurahName
      )}_Ayah-${window.sessionFrom}-${window.sessionTo}_${safe(
        window.sessionReciterName
      )}_${ts}.webm`;
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

function handleUserFiles(fileList) {
  if (!fileList || !fileList.length) return;

  // Revoke old URLs
  const userUploads = window.backgroundModule.userUploads || [];
  for (const item of userUploads) {
    if (item.__blobUrl && item.src) {
      try {
        URL.revokeObjectURL(item.src);
      } catch {}
    }
  }
  window.backgroundModule.userUploads = [];

  // Create new uploads
  for (const f of fileList) {
    const url = URL.createObjectURL(f);
    const isVideo = (f.type || "").startsWith("video");
    const isImage = (f.type || "").startsWith("image");
    if (!isVideo && !isImage) continue;

    window.backgroundModule.userUploads.push({
      src: url,
      type: isVideo ? "video" : "image",
      name: `📥 ${f.name}`,
      __blobUrl: true,
    });
  }

  // Update the select with new uploads
  window.backgroundModule.populateSelectFromList(
    window.backgroundModule.bgMediaList
  );
  if (bgModeMedia && !bgModeMedia.checked) {
    bgModeMedia.checked = true;
    window.backgroundModule.setBackgroundMode("media");
    window.backgroundModule.applyBgModeUI();
  }

  if (window.backgroundModule.userUploads.length) {
    const firstUploadIndex = 0;
    bgMediaSelect.value = String(firstUploadIndex);
    window.backgroundModule.onBgMediaChange();
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
  window.sizePercent = parseInt(textSize.value, 10) || 100;
  if (textSizeVal) textSizeVal.textContent = `(${window.sizePercent}%)`;
  window.backgroundModule.setBgColor(bgColorInput.value);
  window.fontColor = fontColorInput.value;

  // Keep state aligned with the <select>
  window.translationEdition =
    translationEditionSel?.value || window.translationEdition || "en.asad";

  window.showCreditData = !!creditDataChk?.checked;
  window.showCreditCreator = !!creditCreatorChk?.checked;
  window.backgroundModule.applyBgModeUI();
  await window.backgroundModule.loadBackgroundAssets();
  setDuringRecordingUI(false);

  // Volume UI defaults
  if (volumeVal) volumeVal.textContent = `${volumeSlider?.value || 100}%`;
  if (audio) audio.volume = (Number(volumeSlider?.value) || 100) / 100;

  window.drawingModule.drawPreview();
  setupMobileNav();
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
if (document.readyState === "loading") {
  window.addEventListener("htmlPartialsLoaded", initializeApp);
} else {
  // If DOM is already loaded, wait a bit for partials or try immediately
  window.addEventListener("htmlPartialsLoaded", initializeApp);
  // Also try after a short delay in case event already fired
  setTimeout(() => {
    if (document.getElementById("previewCanvas")) {
      initializeApp();
    }
  }, 100);
}
