// ------------------ Volume helpers ------------------
function setVolumeFromSlider() {
  const volumeSlider = $("#volumeSlider");
  const volumeVal = $("#volumeVal");
  const audio = $("#audioPlayer");
  const v = Math.max(0, Math.min(100, Number(volumeSlider?.value) || 0));
  if (volumeVal) volumeVal.textContent = `${v}%`;
  if (audio) audio.volume = v / 100; // playback loudness
  if (window.gainNode) window.gainNode.gain.value = v / 100; // recorded loudness
}

// ------------------ Audio graph + routing ------------------
function ensureAudioGraph() {
  if (window.audioCtx) return true;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    const audio = $("#audioPlayer");
    if (!audio) return false;
    window.audioCtx = new AC();
    window.srcNode = window.audioCtx.createMediaElementSource(audio);
    window.gainNode = window.audioCtx.createGain();
    window.destNode = window.audioCtx.createMediaStreamDestination();

    // Start with slider value
    const volumeSlider = $("#volumeSlider");
    window.gainNode.gain.value = (Number(volumeSlider?.value) || 100) / 100;

    // Base connection
    window.srcNode.connect(window.gainNode);

    // We'll route to speakers/recorder via updateAudioRouting()
    window.connections = { toDest: false, toRecorder: false };
    updateAudioRouting();

    return true;
  } catch (e) {
    console.warn("Audio graph unavailable (CORS or browser):", e);
    const audio = $("#audioPlayer");
    const volumeSlider = $("#volumeSlider");
    window.audioCtx = null;
    window.srcNode = null;
    window.gainNode = null;
    window.destNode = null;
    // Fallback: element audio will be heard
    // audio.muted = false;
    if (audio) audio.volume = (Number(volumeSlider?.value) || 100) / 100;
    return false;
  }
}

// Replace your entire updateAudioRouting() with this:
function updateAudioRouting() {
  if (!window.gainNode || !window.audioCtx) return;

  // Safely connect/disconnect helpers
  const connect = (node, target) => {
    try {
      node.connect(target);
    } catch (_) {}
  };
  const disconnect = (node, target) => {
    try {
      node.disconnect(target);
    } catch (_) {}
  };

  // Reset previous routes
  if (window.audioCtx.destination) disconnect(window.gainNode, window.audioCtx.destination);
  if (window.destNode) disconnect(window.gainNode, window.destNode);

  // Always monitor to speakers
  if (window.audioCtx.destination) connect(window.gainNode, window.audioCtx.destination);

  // Additionally feed the recorder only when recording
  if (window.allowRecording && window.destNode) connect(window.gainNode, window.destNode);
}

async function ensureGraphOnGesture() {
  if (!window.audioCtx) {
    const ok = ensureAudioGraph();
    if (!ok) {
      // audio.muted = false;
      return false;
    }
  }
  if (window.audioCtx.state === "suspended") {
    try {
      await window.audioCtx.resume();
    } catch {}
  }
  // Always keep element audible
  // audio.muted = false;
  return true;
}

// ------------------ Recording setup ------------------
function buildMixedStream() {
  const previewCanvas = $("#previewCanvas");
  if (!previewCanvas) return new MediaStream();
  const fps = 30;
  const canvasStream = previewCanvas.captureStream(fps);
  const ok = ensureAudioGraph();
  if (ok && window.destNode) {
    return new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...window.destNode.stream.getAudioTracks(),
    ]);
  }
  // Fallback: no audio track if WebAudio not available/CORS-blocked
  return new MediaStream([...canvasStream.getTracks()]);
}

function pickMime() {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  for (const m of candidates) {
    if (
      window.MediaRecorder &&
      MediaRecorder.isTypeSupported &&
      MediaRecorder.isTypeSupported(m)
    )
      return m;
  }
  return "";
}

function initRecorder() {
  if (window.recorder) return;
  window.mixedStream = buildMixedStream();
  const mime = pickMime();
  try {
    window.recorder = new MediaRecorder(window.mixedStream, {
      ...(mime ? { mimeType: mime } : {}),
      videoBitsPerSecond: 5_000_000,
    });
  } catch (e) {
    console.error("MediaRecorder init failed:", e);
    return;
  }
  window.chunks = [];
  window.recorder.ondataavailable = (e) => {
    if (e.data && e.data.size) window.chunks.push(e.data);
  };
  const recStatus = $("#recStatus");
  const downloadBtn = $("#downloadBtn");
  window.recorder.onstart = () => {
    if (recStatus) recStatus.textContent = "Recording in the background…";
  };
  window.recorder.onstop = () => {
    window.finalBlob = new Blob(window.chunks, { type: mime || "video/webm" });

    // Multi Export Hook
    if (window.multiExportMode && window.handleMultiExportNext && !window.hasAudioError && !window.wasDismissed) {
       window.recordingStarted = false; // Reset flag so next one can start
       window.recorder = null; // Force new recorder for next track to ensure clean state
       window.handleMultiExportNext();
       return; // Skip default UI updates
    }

    if (!window.hasAudioError && !window.wasDismissed) {
      if (downloadBtn) downloadBtn.disabled = false;
      if (recStatus) recStatus.textContent =
        "Recording complete. You can download your Short.";
    } else {
      if (downloadBtn) downloadBtn.disabled = true;
      if (recStatus) recStatus.textContent = window.wasDismissed
        ? "Dismissed. Ready."
        : "Recording incomplete due to audio error. Download disabled.";
    }

    if (window.setDuringRecordingUI) window.setDuringRecordingUI(false);
  };
}

function startRecordingIfNeeded() {
  if (!window.allowRecording) return;

  // Ensure recorder path is connected
  if (window.audioCtx && window.gainNode) updateAudioRouting();

  if (!window.recorder) initRecorder();
  if (!window.recorder) return;
  if (!window.recordingStarted && window.recorder.state !== "recording") {
    try {
      window.recorder.start();
      window.recordingStarted = true;
      const recStatus = $("#recStatus");
      if (recStatus) recStatus.textContent = "Recording in the background…";
    } catch (e) {
      console.error(e);
      const recStatus = $("#recStatus");
      if (recStatus) recStatus.textContent =
        "Recording failed to start. Check browser permissions.";
    }
  }
}

function stopRecordingIfActive() {
  if (window.recorder && window.recorder.state === "recording") {
    try {
      window.recorder.stop();
    } catch {}
  }
}

// ------------------ Playback controls ------------------
async function loadAndPlay({ record }) {
  // Mode flag
  window.allowRecording = !!record;

  // UI & flags
  if (window.resetSessionUI) window.resetSessionUI();
  if (window.setDuringRecordingUI) window.setDuringRecordingUI(!!record);
  window.wasDismissed = false;
  window.hasAudioError = false;

  // Clear any prior audio error banner
  const errorMessage = $("#audioErrorMessage");
  if (errorMessage) {
    errorMessage.textContent = "";
    errorMessage.style.display = "none";
  }

  // Ensure WebAudio, wire routes, apply current volume (no muting anywhere)
  await ensureGraphOnGesture();
  updateAudioRouting();
  setVolumeFromSlider(); // sets audio.volume and gainNode.gain to slider %

  // Recorder buffers
  stopRecordingIfActive();
  window.recordingStarted = false;
  window.chunks = [];
  window.finalBlob = null;
  const downloadBtn = $("#downloadBtn");
  if (downloadBtn) downloadBtn.disabled = true;

  // ---- Read selections ----
  const surahSel = $("#surah");
  const ayahStartSel = $("#ayahStart");
  const ayahEndSel = $("#ayahEnd");
  const reciterSel = $("#reciter");
  const fontPicker = $("#fontPicker");
  const textSize = $("#textSize");
  const translationEditionSel = $("#translationEdition");
  const creditDataChk = $("#creditData");
  const creditCreatorChk = $("#creditCreator");
  const bgModeMedia = $("#bgModeMedia");

  window.sessionSurah = +surahSel.value || 1;
  const s =
    window.metadataModule.meta.surahs.find((x) => x.number === window.sessionSurah) ||
    window.metadataModule.meta.surahs[0];
  window.sessionSurahName = s?.englishName || "Unknown";
  window.sessionFrom = +ayahStartSel.value || 1;
  window.sessionTo = +ayahEndSel.value || Math.min(5, s?.ayahCount || 5);
  window.sessionReciterName =
    reciterSel.options[reciterSel.selectedIndex]?.text || "Unknown";

  window.selectedFont = fontPicker.value;
  window.sizePercent = parseInt(textSize.value, 10) || 100;
  window.translationEdition = translationEditionSel?.value || "en.asad";
  window.showCreditData = !!creditDataChk?.checked;
  window.showCreditCreator = !!creditCreatorChk?.checked;
  window.backgroundModule.setBackgroundMode(
    bgModeMedia.checked ? "media" : "color"
  );

  // ---- Validate ----
  if (
    !s ||
    Number.isNaN(window.sessionFrom) ||
    Number.isNaN(window.sessionTo) ||
    window.sessionFrom < 1 ||
    window.sessionTo > s.ayahCount ||
    window.sessionFrom > window.sessionTo
  ) {
    const recStatus = $("#recStatus");
    if (recStatus) recStatus.textContent = "Invalid ayah range. Please adjust the selection.";
    if (window.setDuringRecordingUI) window.setDuringRecordingUI(false);
    return;
  }

  // ---- Playlist ----
  window.playlist = [];
  for (let a = window.sessionFrom; a <= window.sessionTo; a++) {
    window.playlist.push({ surah: window.sessionSurah, ayah: a, sName: s.englishName });
  }
  window.index = 0;
  window.totalAyahs = window.playlist.length;

  const meterBar = $("#meterBar");
  if (meterBar) meterBar.style.width = "0%";
  await playIndex(window.index, true);
}

function updateMeter() {
  const meterBar = $("#meterBar");
  if (!window.totalAyahs) {
    if (meterBar) meterBar.style.width = "0%";
    return;
  }
  const denom = Math.max(1, window.totalAyahs - 1);
  const pct = Math.min(100, Math.round((window.index / denom) * 100));
  if (meterBar) meterBar.style.width = pct + "%";
}

async function playIndex(i, autoplay = false) {
  const it = window.playlist[i];
  if (!it) return;
  const s3 = pad3(it.surah),
    a3 = pad3(it.ayah);

  // --- Translation fetch with fallback ---
  async function fetchAyahText(editionId) {
    try {
      const tRes = await fetchRetry(
        `https://api.alquran.cloud/v1/ayah/${it.surah}:${it.ayah}/${editionId}`
      );
      const t = await tRes.json();
      if (t && t.code === 200 && t.data && t.data.text) {
        return { ok: true, text: t.data.text };
      }
      return { ok: false, text: "" };
    } catch {
      return { ok: false, text: "" };
    }
  }

  const translationEditionSel = $("#translationEdition");
  const reciterSel = $("#reciter");
  const audio = $("#audioPlayer");
  const downloadBtn = $("#downloadBtn");
  const recStatus = $("#recStatus");

  const chosenEdition = (
    translationEditionSel?.value ||
    window.translationEdition ||
    "en.asad"
  ).trim();
  
  // Fetch Translation and Arabic in parallel
  const [tResult, aResult] = await Promise.all([
    fetchAyahText(chosenEdition),
    fetchAyahText("quran-uthmani")
  ]);

  let finalTranslation = tResult;

  // Fallback to en.asad if the chosen edition fails
  if (!finalTranslation.ok && chosenEdition !== "en.asad") {
    console.warn(`Edition "${chosenEdition}" failed; falling back to en.asad`);
    finalTranslation = await fetchAyahText("en.asad");
  }

  window.currentText = finalTranslation.ok ? finalTranslation.text : "(Translation unavailable)";
  window.currentArabicText = aResult.ok ? aResult.text : "";
  window.currentLabel = `${it.sName} • Ayah ${it.ayah}`;

  // --- Audio setup (unchanged) ---
  const reciter = reciterSel.value;
  const audioUrl = `https://everyayah.com/data/${reciter}/${s3}${a3}.mp3`;

  // Hide any previous error message
  const errorMessage = $("#audioErrorMessage");
  if (errorMessage) errorMessage.style.display = "none";

  // Audio error handling
  if (audio) {
    audio.onerror = () => {
      const errorMessage = $("#audioErrorMessage");
      if (errorMessage) {
        errorMessage.textContent = `⚠️ Failed to load audio for Surah ${it.surah}, Ayah ${it.ayah}`;
        errorMessage.style.display = "block";
      }

      window.hasAudioError = true;

      if (window.recorder && window.recorder.state === "recording") {
        try {
          window.recorder.stop();
        } catch {}
        window.chunks = [];
        window.finalBlob = null;
      }

      window.recordingStarted = false;
      window.recorder = null;
      if (downloadBtn) downloadBtn.disabled = true;
      window.isPlaying = false;

      if (recStatus) recStatus.textContent = "Recording stopped due to audio error.";
      if (window.setDuringRecordingUI) window.setDuringRecordingUI(false);
    };

    audio.src = audioUrl;
  }

  if (!window.recorder && window.allowRecording) initRecorder();
  if (autoplay && audio) {
    try {
      await audio.play();
    } catch (err) {
      console.warn("audio.play() was blocked:", err);
      const errorMessage = $("#audioErrorMessage");
      if (errorMessage) {
        errorMessage.textContent = `⚠️ Failed to load audio for Surah ${it.surah}, Ayah ${it.ayah}`;
        errorMessage.style.display = "block";
      }
    }
  }
}

// Export for use in other modules
window.audioModule = {
  setVolumeFromSlider,
  ensureAudioGraph,
  updateAudioRouting,
  ensureGraphOnGesture,
  buildMixedStream,
  initRecorder,
  startRecordingIfNeeded,
  stopRecordingIfActive,
  loadAndPlay,
  updateMeter,
  playIndex,
};

