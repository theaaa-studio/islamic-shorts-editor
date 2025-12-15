// ------------------ Volume helpers ------------------
function setVolumeFromSlider() {
  const volumeSlider = $("#volumeSlider");
  const volumeVal = $("#volumeVal");
  const audio1 = $("#audioPlayer");
  const audio2 = $("#audioPlayer2");
  const v = Math.max(0, Math.min(100, Number(volumeSlider?.value) || 0));
  
  if (volumeVal) volumeVal.textContent = `${v}%`;
  
  // Set global volume target
  window.masterVolume = v / 100;
  
  // Apply to active players if not currently fading? 
  // Actually simplest is to apply to gain nodes if present, or elements.
  // We will manage volume dynamically during crossfade, so this sets the "Max" volume.
  
  if (window.gainNode) window.gainNode.gain.value = window.masterVolume;
}

// ------------------ Audio graph + routing ------------------
function ensureAudioGraph() {
  if (window.audioCtx) return true;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    
    const audio1 = $("#audioPlayer");
    const audio2 = $("#audioPlayer2");
    
    if (!audio1 || !audio2) return false;
    
    window.audioCtx = new AC();
    window.srcNode1 = window.audioCtx.createMediaElementSource(audio1);
    window.srcNode2 = window.audioCtx.createMediaElementSource(audio2);
    
    // Create individual gain nodes for crossfading
    window.gainNode1 = window.audioCtx.createGain();
    window.gainNode2 = window.audioCtx.createGain();
    
    // Main master gain for overall volume
    window.gainNode = window.audioCtx.createGain();
    
    // Dest node for recording
    window.destNode = window.audioCtx.createMediaStreamDestination();

    // Start with slider value
    const volumeSlider = $("#volumeSlider");
    window.masterVolume = (Number(volumeSlider?.value) || 100) / 100;
    window.gainNode.gain.value = window.masterVolume;

    // Connect graph
    // Source -> Individual Gain -> Master Gain -> Destination/Context
    window.srcNode1.connect(window.gainNode1);
    window.srcNode2.connect(window.gainNode2);
    
    window.gainNode1.connect(window.gainNode);
    window.gainNode2.connect(window.gainNode);

    // We'll route to speakers/recorder via updateAudioRouting()
    window.connections = { toDest: false, toRecorder: false };
    updateAudioRouting();

    return true;
  } catch (e) {
    console.warn("Audio graph unavailable (CORS or browser):", e);
    const audio = $("#audioPlayer");
    const volumeSlider = $("#volumeSlider");
    if (audio) audio.volume = (Number(volumeSlider?.value) || 100) / 100;
    // Fallback?
    return false;
  }
}

function updateAudioRouting() {
  if (!window.gainNode || !window.audioCtx) return;

  const connect = (node, target) => { try { node.connect(target); } catch (_) {} };
  const disconnect = (node, target) => { try { node.disconnect(target); } catch (_) {} };

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
    if (!ok) return false;
  }
  if (window.audioCtx.state === "suspended") {
    try {
      await window.audioCtx.resume();
    } catch {}
  }
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
  return new MediaStream([...canvasStream.getTracks()]);
}

function pickMime() {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  for (const m of candidates) {
    if (window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m))
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
       window.recorder = null; // Force new recorder
       window.handleMultiExportNext();
       return; 
    }

    if (!window.hasAudioError && !window.wasDismissed) {
      if (downloadBtn) downloadBtn.disabled = false;
      if (recStatus) recStatus.textContent = "Recording complete. You can download your Short.";
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
      if (recStatus) recStatus.textContent = "Recording failed to start. Check browser permissions.";
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

// ------------------ Dual Player Playback & CrossfadeLogic ------------------

// We keep track of the active player index (0 or 1)
// 0 -> audioPlayer, 1 -> audioPlayer2
window.currentPlayerId = 0; 
window.crossfadeDuration = 0.25; // seconds overlap

function getPlayer(id) {
  return id === 0 ? $("#audioPlayer") : $("#audioPlayer2");
}

function getGainNode(id) {
  if (!window.gainNode1 || !window.gainNode2) return null;
  return id === 0 ? window.gainNode1 : window.gainNode2;
}

// --- Translation fetch helper ---
async function fetchAyahText(surah, ayah, editionId) {
    try {
      const tRes = await fetchRetry(
        `https://api.alquran.cloud/v1/ayah/${surah}:${ayah}/${editionId}`
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

async function prepareNextTrack(index) {
  // Uses pre-loaded data from window.playlist
  // Returns object with url, text, arabic, duration, etc.
  
  if (index >= window.playlist.length) return null;
  
  const it = window.playlist[index];
  
  // Use config if playing/active, otherwise fallback to UI
  const reciter = (window.isPlaying && window.playbackConfig) 
    ? window.playbackConfig.reciter 
    : $("#reciter").value;
    
  const s3 = pad3(it.surah);
  const a3 = pad3(it.ayah);
  const audioUrl = `https://everyayah.com/data/${reciter}/${s3}${a3}.mp3`;
  
  // If data was pre-fetched (Batch Mode), use it
  if (it.text && it.arabicText) {
      return {
          index,
          it,
          audioUrl,
          currentText: it.text,
          currentArabicText: it.arabicText,
          currentLabel: `${it.sName} • Ayah ${it.ayah}`
      };
  }

  // Fallback (Legacy/Single fetch mode if batch failed)
  // Use config.translationEdition if valid, else UI or fallback
  let chosenEdition = "en.asad";
  if (window.isPlaying && window.playbackConfig) {
      chosenEdition = window.playbackConfig.translationEdition;
  } else {
      const translationEditionSel = $("#translationEdition");
      chosenEdition = (translationEditionSel?.value || window.translationEdition || "en.asad").trim();
  }

  // Fetch parallel
  const [tResult, aResult] = await Promise.all([
    fetchAyahText(it.surah, it.ayah, chosenEdition),
    fetchAyahText(it.surah, it.ayah, "quran-uthmani")
  ]);
  
  let finalTranslation = tResult;
  if (!finalTranslation.ok && chosenEdition !== "en.asad") {
    finalTranslation = await fetchAyahText(it.surah, it.ayah, "en.asad");
  }

  return {
    index,
    it,
    audioUrl,
    currentText: finalTranslation.ok ? finalTranslation.text : "(Translation unavailable)",
    currentArabicText: aResult.ok ? aResult.text : "",
    currentLabel: `${it.sName} • Ayah ${it.ayah}`
  };
}


async function loadAndPlay({ record }) {
  // Reset state
  window.allowRecording = !!record;
  if (window.resetSessionUI) window.resetSessionUI();
  if (window.setDuringRecordingUI) window.setDuringRecordingUI(!!record);
  window.wasDismissed = false;
  window.hasAudioError = false;
  
  const errorMessage = $("#audioErrorMessage");
  if (errorMessage) errorMessage.style.display = "none";
  const recStatus = $("#recStatus");

  await ensureGraphOnGesture();
  updateAudioRouting();
  setVolumeFromSlider();

  // Recorder cleanup
  stopRecordingIfActive();
  window.recordingStarted = false;
  window.chunks = [];
  window.finalBlob = null;
  const downloadBtn = $("#downloadBtn");
  if (downloadBtn) downloadBtn.disabled = true;

  // Read Selection & Config
  const surahSel = $("#surah");
  const ayahStartSel = $("#ayahStart");
  const ayahEndSel = $("#ayahEnd");
  const reciterSel = $("#reciter");
  const fontPicker = $("#fontPicker");
  const textSize = $("#textSize");
  const creditDataChk = $("#creditData");
  const creditCreatorChk = $("#creditCreator");
  const bgModeMedia = $("#bgModeMedia");
  // const translationEditionSel = $("#translationEdition"); // already global

  window.sessionSurah = +surahSel.value || 1;
  const s = window.metadataModule.meta.surahs.find((x) => x.number === window.sessionSurah) || window.metadataModule.meta.surahs[0];
  window.sessionSurahName = s?.englishName || "Unknown";
  
  // Constrain range
  const totalVerses = s?.ayahCount || 7;
  let start = +ayahStartSel.value || 1;
  let end = +ayahEndSel.value || 1;
  if (start < 1) start = 1;
  if (end > totalVerses) end = totalVerses;
  if (start > end) start = end;

  window.sessionFrom = start;
  window.sessionTo = end;
  window.sessionReciterName = reciterSel.options[reciterSel.selectedIndex]?.text || "Unknown";

  // Snapshot Configuration
  window.playbackConfig = {
      reciter: reciterSel.value,
      translationEdition: translationEditionSel?.value || window.translationEdition || "en.sahih",
      selectedFont: fontPicker.value,
      selectedArabicFont: $("#arabicFontPicker")?.value || "Inter, sans-serif",
      sizePercent: parseInt(textSize.value, 10) || 100,
      arabicSizePercent: parseInt($("#arabicTextSize")?.value, 10) || 100,
      fontColor: window.fontColor,
      arabicFontColor: window.arabicFontColor,
      creditColor: window.creditColor,
      showCreditData: !!creditDataChk?.checked,
      showCreditCreator: !!creditCreatorChk?.checked,
      showArabicText: window.showArabicText, // check where this comes from
      
      // BACKGROUND SNAPSHOT
      background: {
          mode: window.backgroundModule.getBackgroundMode(),
          color: window.backgroundModule.getBgColor(),
          blur: window.backgroundModule.getBgBlur ? window.backgroundModule.getBgBlur() : 0,
          textBoxColor: window.backgroundModule.getTextBoxColor(),
          textBoxOpacity: window.backgroundModule.getTextBoxOpacity(),
          selectedBg: window.backgroundModule.selectedBg,
          bgImg: window.backgroundModule.bgImg, 
      }
  };
  
  if (typeof window.showArabicText === 'undefined') window.showArabicText = true;
  window.playbackConfig.showArabicText = window.showArabicText;

  window.selectedFont = fontPicker.value;
  window.sizePercent = parseInt(textSize.value, 10) || 100;
  window.showCreditData = !!creditDataChk?.checked;
  window.showCreditCreator = !!creditCreatorChk?.checked;
  window.backgroundModule.setBackgroundMode(bgModeMedia.checked ? "media" : "color");

  // 1. UI Loading State
  if (recStatus) recStatus.textContent = "Fetching data...";

  // 2. Batch Fetch Data
  const offset = start - 1; // 0-indexed
  const limit = end - start + 1;
  const translationId = window.playbackConfig.translationEdition;

  try {
      // Parallel Fetch: Translation + Arabic
      // API: api.alquran.cloud/v1/surah/{surah}/{edition}?offset={offset}&limit={limit}
      
      const tReq = fetch(`https://api.alquran.cloud/v1/surah/${window.sessionSurah}/${translationId}?offset=${offset}&limit=${limit}`);
      const aReq = fetch(`https://api.alquran.cloud/v1/surah/${window.sessionSurah}/quran-uthmani?offset=${offset}&limit=${limit}`);
      
      const [tRes, aRes] = await Promise.all([tReq, aReq]);
      const tJson = await tRes.json();
      const aJson = await aRes.json();
      
      // Validate
      const tAyahs = (tJson.code === 200 && tJson.data && tJson.data.ayahs) ? tJson.data.ayahs : [];
      const aAyahs = (aJson.code === 200 && aJson.data && aJson.data.ayahs) ? aJson.data.ayahs : [];
      
      // 3. Build Playlist from Data
      window.playlist = [];
      const count = Math.min(tAyahs.length, aAyahs.length, limit); // Safety min
      
      for (let i = 0; i < count; i++) {
          const ayahNum = start + i;
          const tObj = tAyahs[i]; // should match offset
          const aObj = aAyahs[i];
          
          window.playlist.push({
              surah: window.sessionSurah,
              ayah: ayahNum,
              sName: s.englishName,
              text: tObj ? tObj.text : "",
              arabicText: aObj ? aObj.text : ""
          });
      }
      
      // Fallback if API failed or returned partial
      if (window.playlist.length === 0) {
           console.warn("Batch fetch returned empty, falling back to lazy load.");
           // Re-populate with empty slots for lazy loading
           for (let a = start; a <= end; a++) {
              window.playlist.push({ surah: window.sessionSurah, ayah: a, sName: s.englishName });
           }
      }

  } catch (e) {
      console.error("Batch fetch failed", e);
      if (recStatus) recStatus.textContent = "Data fetch error, retrying linearly...";
      // Fallback
      window.playlist = [];
       for (let a = start; a <= end; a++) {
          window.playlist.push({ surah: window.sessionSurah, ayah: a, sName: s.englishName });
       }
  }

  window.index = 0;
  window.totalAyahs = window.playlist.length;

  const meterBar = $("#meterBar");
  if (meterBar) meterBar.style.width = "0%";
  
  // Clear Loading msg
  if (recStatus) recStatus.textContent = record ? "Recording in the background…" : "Playing...";

  // Start Sequence
  window.isPlaying = true; // Set global flag
  await playDualSequence(0);
}

// Function to handle the actual playback sequence with crossfading
async function playDualSequence(startIndex) {
    if (startIndex >= window.playlist.length) {
        // End of sequence
        window.isPlaying = false;
        // In verify we might have recording to stop
        stopRecordingIfActive();
        return;
    }

    // Determine current player
    const currentPlayerId = window.currentPlayerId; // 0 or 1
    const nextPlayerId = currentPlayerId === 0 ? 1 : 0;
    
    const currentPlayer = getPlayer(currentPlayerId);
    const nextPlayer = getPlayer(nextPlayerId);
    
    // Prepare data for current track
    const trackData = await prepareNextTrack(startIndex);
    if (!trackData) return;

    // Update UI/Text immediately for start
    updateUIForTrack(trackData);
    
    // Load Audio
    currentPlayer.src = trackData.audioUrl;
    
    // Reset gains
    const currentGain = getGainNode(currentPlayerId);
    const nextGain = getGainNode(nextPlayerId);
    
    if (currentGain) {
        currentGain.gain.cancelScheduledValues(window.audioCtx.currentTime);
        currentGain.gain.setValueAtTime(0, window.audioCtx.currentTime);
        currentGain.gain.linearRampToValueAtTime(1, window.audioCtx.currentTime + 0.1); // Quick fade in
    }
    if (nextGain) {
        nextGain.gain.cancelScheduledValues(window.audioCtx.currentTime); 
        nextGain.gain.setValueAtTime(0, window.audioCtx.currentTime);
    }

    // Play
    try {
        await currentPlayer.play();
        if (window.allowRecording) startRecordingIfNeeded();
    } catch (e) {
        console.error("Play failed", e);
        // Handle error
        window.hasAudioError = true;
        stopRecordingIfActive();
        return;
    }

    // Listen for timeupdate to schedule next
    const checkTime = () => {
        if (!window.isPlaying) return; // Stopped externally
        
        const timeLeft = currentPlayer.duration - currentPlayer.currentTime;
        const CROSSFADE_TIME = 0.25; // 0.25 second overlap
        
        // If we are near end and haven't triggered next yet
        if (timeLeft <= CROSSFADE_TIME && !currentPlayer.dataset.triggeredNext) {
             currentPlayer.dataset.triggeredNext = "true";
             // Trigger next track if not in multi-export mode
             if (!window.multiExportMode && startIndex + 1 < window.playlist.length) {
                 triggerNextTrack(startIndex + 1, nextPlayerId, currentGain, nextGain);
             }
        }
    };
    
    const onEnded = () => {
         currentPlayer.removeEventListener("timeupdate", checkTime);
         currentPlayer.removeEventListener("ended", onEnded);
         currentPlayer.dataset.triggeredNext = ""; // clear
         
         // If we are in multi-export mode, we stop after every track
         // If normal mode, we stop if we reached end of playlist
         if (window.multiExportMode || startIndex + 1 >= window.playlist.length) {
             window.isPlaying = false;
             stopRecordingIfActive();
             window.dispatchEvent(new Event("quran-playback-stopped"));
         }
    };
    
    currentPlayer.dataset.triggeredNext = "";
    currentPlayer.addEventListener("timeupdate", checkTime);
    currentPlayer.addEventListener("ended", onEnded);
}

async function triggerNextTrack(nextIndex, playerId, outgoingGain, incomingGain) {
    // 1. Prepare Data
    const trackData = await prepareNextTrack(nextIndex);
    if (!trackData) return;
    
    const player = getPlayer(playerId);
    player.src = trackData.audioUrl;
    
    // 2. Play (muted initially/low volume logic is handled by gain node)
    if (incomingGain) {
        incomingGain.gain.cancelScheduledValues(window.audioCtx.currentTime);
        incomingGain.gain.setValueAtTime(0, window.audioCtx.currentTime);
    }
    
    try {
        await player.play();
    } catch(e) { console.error("Next play failed", e); return; }
    
    // 3. Crossfade
    const now = window.audioCtx.currentTime;
    const fadeDuration = 0.25; 
    
    if (incomingGain) {
        incomingGain.gain.linearRampToValueAtTime(1, now + fadeDuration);
    }
    
    if (outgoingGain) {
        outgoingGain.gain.linearRampToValueAtTime(0, now + fadeDuration);
    }
    
    // 4. Update UI
    updateUIForTrack(trackData);
    
    // 5. Update State
    window.currentPlayerId = playerId;
    window.index = nextIndex;
    updateMeter();
    
    // 6. Chain
    setupNextTrigger(player, playerId, nextIndex);
}

function setupNextTrigger(currentPlayer, currentPlayerId, currentIndex) {
    const nextPlayerId = currentPlayerId === 0 ? 1 : 0;
    const currentGain = getGainNode(currentPlayerId);
    const nextGain = getGainNode(nextPlayerId);

     const checkTime = () => {
        if (!window.isPlaying) return;
        
        if (!currentPlayer.duration) return;

        const timeLeft = currentPlayer.duration - currentPlayer.currentTime;
        const CROSSFADE_TIME = 0.25; 
        
        if (timeLeft <= CROSSFADE_TIME && !currentPlayer.dataset.triggeredNext) {
             currentPlayer.dataset.triggeredNext = "true";
             // Trigger next track if not in multi-export mode
             if (!window.multiExportMode && currentIndex + 1 < window.playlist.length) {
                 triggerNextTrack(currentIndex + 1, nextPlayerId, currentGain, nextGain);
             }
        }
    };
    
    const onEnded = () => {
         currentPlayer.removeEventListener("timeupdate", checkTime);
         currentPlayer.removeEventListener("ended", onEnded);
         currentPlayer.dataset.triggeredNext = "";
         
         if (window.multiExportMode || currentIndex + 1 >= window.playlist.length) {
             window.isPlaying = false;
             stopRecordingIfActive();
             window.dispatchEvent(new Event("quran-playback-stopped"));
         }
    };
    
    currentPlayer.dataset.triggeredNext = "";
    currentPlayer.addEventListener("timeupdate", checkTime);
    currentPlayer.addEventListener("ended", onEnded);
}


function updateUIForTrack(data) {
    window.currentText = data.currentText;
    window.currentArabicText = data.currentArabicText;
    window.currentLabel = data.currentLabel;
    if (window.drawingModule && window.drawingModule.drawPreview) {
        window.drawingModule.drawPreview();
    }
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


// Export
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
  playIndex: async (i, autoplay) => {
      if (autoplay) {
           await window.audioModule.ensureGraphOnGesture();
           window.audioModule.updateAudioRouting();
           window.isPlaying = true;
           await playDualSequence(i);
      } else {
          // Just load data (for Picture mode)
          const data = await prepareNextTrack(i);
          if (data) updateUIForTrack(data);
      }
  }
};
