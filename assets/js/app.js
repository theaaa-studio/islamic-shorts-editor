// ------------------ DOM ------------------
const reciterSel = $("#reciter");
const surahSel = $("#surah");
const ayahStartSel = $("#ayahStart");
const ayahEndSel = $("#ayahEnd");
const fontPicker = $("#fontPicker");
const textSize = $("#textSize");
const textSizeVal = $("#textSizeVal");

const bgColorInput = $("#bgColor");
const fontColorInput = $("#fontColor");

const translationEditionSel = $("#translationEdition");

const creditDataChk = $("#creditData");
const creditCreatorChk = $("#creditCreator");
const madeByInput = $("#madeByInput");
const creditMadeByChk = $("#creditMadeBy");

const bgModeColor = $("#bgModeColor");
const bgModeMedia = $("#bgModeMedia");
const bgColorField = $("#bgColorField");
const bgMediaField = $("#bgMediaField");
const bgMediaSelect = $("#bgMediaSelect");
const bgMediaHint = $("#bgMediaHint");
const bgUploadInput = $("#bgUploadInput");

const previewCanvas = $("#previewCanvas");
const pctx = previewCanvas.getContext("2d");

const buildPreviewBtn = $("#buildPreviewBtn");
const downloadBtn = $("#downloadBtn");
const previewPlayBtn = $("#previewPlayBtn");
const dismissBtn = $("#dismissBtn");

// Volume UI
const volumeSlider = $("#volumeSlider");
const volumeVal = $("#volumeVal");

const audio = $("#audioPlayer");
const recStatus = $("#recStatus");
const meterBar = $("#meterBar");
audio.crossOrigin = "anonymous";

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
bgMediaSelect.addEventListener("change", () => {
  window.backgroundModule.onBgMediaChange();
});

// Wire up background file upload
bgUploadInput?.addEventListener("change", (e) => {
  handleUserFiles(e.target.files);
});

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

// Wire up surah change to update ayah range
surahSel.addEventListener("change", () => {
  window.metadataModule.updateAyahRange();
});

// Wire up playback buttons
buildPreviewBtn.addEventListener("click", async () => {
  await window.audioModule.ensureGraphOnGesture();
  window.allowRecording = true;
  window.audioModule.updateAudioRouting();
  window.audioModule.setVolumeFromSlider();
  await window.audioModule.loadAndPlay({ record: true });
});

previewPlayBtn.addEventListener("click", async () => {
  await window.audioModule.ensureGraphOnGesture();
  window.allowRecording = false;
  window.audioModule.updateAudioRouting();
  window.audioModule.setVolumeFromSlider();
  await window.audioModule.loadAndPlay({ record: false });
});

// Stop button
const previewStopBtn = $("#previewStopBtn");
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

// ------------------ Download recorded WebM ------------------
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

// ------------------ Dismiss behavior ------------------
dismissBtn?.addEventListener("click", () => {
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
  downloadBtn.disabled = true;
  recStatus.textContent = "Dismissed. Ready.";
  setDuringRecordingUI(false);
});

// ------------------ Volume slider wiring ------------------
volumeSlider?.addEventListener("input", async () => {
  await window.audioModule.ensureGraphOnGesture();
  window.audioModule.setVolumeFromSlider();
  // routing unchanged, element remains audible
});

// ------------------ Init ------------------
(async () => {
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
  audio.volume = (Number(volumeSlider?.value) || 100) / 100;

  window.drawingModule.drawPreview();
})();
