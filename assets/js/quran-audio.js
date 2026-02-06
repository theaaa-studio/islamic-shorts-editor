// ------------------ Listener Management ------------------
function addListener(element, event, handler) {
    if (!element._customListeners) {
        element._customListeners = [];
    }
    // Remove it if it exists to avoid dupes (strict cleanup)
    element.removeEventListener(event, handler);
    element.addEventListener(event, handler);
    element._customListeners.push({ event, handler });
}

function removeAllListeners(element) {
    if (!element || !element._customListeners) return;
    for (const l of element._customListeners) {
        element.removeEventListener(l.event, l.handler);
    }
    element._customListeners = [];
}

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
    // 1. Strict Dismissal Check - Priority 1
    if (window.wasDismissed) {
        window.finalBlob = null;
        window.chunks = [];
        if (downloadBtn) downloadBtn.disabled = true;
        if (recStatus) recStatus.textContent = "Dismissed. Ready.";
        if (window.setDuringRecordingUI) window.setDuringRecordingUI(false);
        return;
    }

    window.finalBlob = new Blob(window.chunks, { type: mime || "video/webm" });

    // Multi Export Hook
    if (window.multiExportMode && window.handleMultiExportNext && !window.hasAudioError) {
       window.recordingStarted = false; // Reset flag so next one can start
       window.recorder = null; // Force new recorder
       window.handleMultiExportNext();
       return; 
    }

    if (!window.hasAudioError) {
      if (downloadBtn) downloadBtn.disabled = false;
      if (recStatus) recStatus.textContent = "Recording complete. You can download your Short.";
    } else {
      if (downloadBtn) downloadBtn.disabled = true;
      if (recStatus) recStatus.textContent = "Recording incomplete due to audio error. Download disabled.";
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
window.crossfadeDuration = 0.5; // seconds overlap

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

// Helper: Detect start and end of actual audio (skip silence)
function detectSilence(audioBuffer, threshold = 0.01) {
    const raw = audioBuffer.getChannelData(0); // Use channel 0
    const len = raw.length;
    let start = 0;
    let end = len - 1;
    
    // Scan for start
    while (start < len && Math.abs(raw[start]) < threshold) {
        start++;
    }
    
    // Scan for end
    while (end > start && Math.abs(raw[end]) < threshold) {
        end--;
    }
    
    // Check if empty
    if (start >= end) return { start: 0, end: audioBuffer.duration, trimStart: 0, trimEnd: 0, duration: audioBuffer.duration };
    
    const sampleRate = audioBuffer.sampleRate;
    const startTime = start / sampleRate;
    const endTime = end / sampleRate;
    
    // Safety padding (keep 0.05s of "silence" to avoid abrupt cuts)
    const padding = 0.05; 
    
    return {
        start: Math.max(0, startTime - padding),
        end: Math.min(audioBuffer.duration, endTime + padding),
        trimStart: Math.max(0, startTime - padding), 
        trimEnd: Math.max(0, audioBuffer.duration - (endTime + padding)),
        duration: Math.max(0, (endTime + padding) - (startTime - padding))
    };
}

async function prepareNextTrack(index, skipAudio = false) {
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
  
  let bufferData = null;
  
  // Fetch Audio Buffer if needed
  if (!skipAudio) {
      try {
          // console.log("Fetching audio buffer:", audioUrl);
          const response = await fetch(audioUrl);
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await window.audioCtx.decodeAudioData(arrayBuffer);
          const trim = detectSilence(audioBuffer);
          
          bufferData = {
              buffer: audioBuffer,
              trim
          };
      } catch (e) {
          console.warn("Audio fetch/decode failed", e);
          // Fallback? We might return null or just no audio
      }
  }
  
  // If data was pre-fetched (Batch Mode), use it
  if (it.text && it.arabicText && (skipAudio || bufferData)) { // Only return if audio ready overlap
      return {
          index,
          it,
          audioUrl,
          audioData: bufferData,
          currentText: it.text,
          currentArabicText: it.arabicText,
          currentLabel: `${it.sName} • Ayah ${it.ayah}`
      };
  } else if (it.text && it.arabicText && !skipAudio && !bufferData) {
      // Audio failed but text exists
       return {
          index,
          it,
          audioUrl,
          audioData: null,
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
    audioData: bufferData,
    currentText: finalTranslation.ok ? finalTranslation.text : "(Translation unavailable)",
    currentArabicText: aResult.ok ? aResult.text : "",
    currentLabel: `${it.sName} • Ayah ${it.ayah}`
  };
}

// ------------------ Playback Sequence Logic ------------------

function stopPlayback() {
    window.isPlaying = false;
    stopRecordingIfActive();
    
    // Stop players and clean up
    stopAllNodes();
    
    window.pendingTrackData = null;
    window.isTransitioning = false;
    window.activeTrackState = { startTime: 0, duration: 0, trimEnd: 0 };
    
    window.index = 0;
    updateMeter();
    window.currentPlayerId = 0;
    
    // Dispatch event so UI can update
    window.dispatchEvent(new Event("quran-playback-stopped"));
}


async function loadAndPlay({ record }) {
  // Ensure strict clean start
  stopPlayback();

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
      showTranslationText: window.showTranslationText,
      
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
  if (typeof window.showTranslationText === 'undefined') window.showTranslationText = true;
  window.playbackConfig.showArabicText = window.showArabicText;
  window.playbackConfig.showTranslationText = window.showTranslationText;

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

// Store active source nodes (instead of HTML Audio elements)
window.activeSourceNodes = { 0: null, 1: null };
window.activeTrackState = { startTime: 0, duration: 0, trimEnd: 0 };
window.checkTimeInterval = null;

// Store pending track data for the next player
window.pendingTrackData = null;
window.isTransitioning = false;

// Function to handle the actual playback sequence with AudioBuffer
async function playDualSequence(startIndex) {
    if (startIndex >= window.playlist.length) {
        window.isPlaying = false;
        stopRecordingIfActive();
        window.dispatchEvent(new Event("quran-playback-stopped"));
        return;
    }

    const currentPlayerId = 0; 
    const nextPlayerId = 1;
    
    // START: Prepare current track immediately
    const trackData = await prepareNextTrack(startIndex);
    if (!trackData) return;
    
    // If audio failed to load but we have text, we might want to skip or just show text?
    // For now, assume if audioData is missing, we can't play it properly as audio.
    if (!trackData.audioData) {
        console.warn("Audio buffer missing for index", startIndex);
        // Skip or stop? Let's stop to avoid infinite loops of errors
        window.isPlaying = false; 
        return;
    }

    updateUIForTrack(trackData);
    
    // Create Source Node
    const source = window.audioCtx.createBufferSource();
    source.buffer = trackData.audioData.buffer;
    
    // Connect to specific gain node
    const currentGain = getGainNode(currentPlayerId);
    if (currentGain) {
        source.connect(currentGain);
        // Reset Gain to 1
        currentGain.gain.cancelScheduledValues(window.audioCtx.currentTime);
        currentGain.gain.setValueAtTime(1, window.audioCtx.currentTime); 
    }
    
    // START PLAYBACK (Trimmed)
    const now = window.audioCtx.currentTime;
    const trim = trackData.audioData.trim;
    
    // start(when, offset, duration)
    source.start(now, trim.trimStart); 
    
    // Store State
    window.activeSourceNodes[currentPlayerId] = source;
    window.activeTrackState = {
        startTime: now,
        duration: trim.duration, // Real duration after trim
        trimEnd: trim.trimEnd
    };
    window.currentPlayerId = currentPlayerId;
    window.index = startIndex;
    updateMeter();
    
    if (window.allowRecording) startRecordingIfNeeded();
    
    // Setup Scheduler
    startScheduler(startIndex);
    
    // PRELOAD NEXT IMMEDIATELY
    if (startIndex + 1 < window.playlist.length) {
        preloadNextTrack(startIndex + 1, nextPlayerId);
    }
}

// Pre-fetch next
async function preloadNextTrack(index, targetPlayerId) {
    window.pendingTrackData = await prepareNextTrack(index);
}

// Scheduler loop (replaces timeupdate event)
function startScheduler(currentIndex) {
    if (window.checkTimeInterval) clearInterval(window.checkTimeInterval);
    
    // Check every 30ms-50ms
    window.checkTimeInterval = setInterval(() => {
        if (!window.isPlaying) {
            clearInterval(window.checkTimeInterval);
            return;
        }
        
        const now = window.audioCtx.currentTime;
        const elapsed = now - window.activeTrackState.startTime;
        const remaining = window.activeTrackState.duration - elapsed;
        
        // Trigger Transition
        const CROSSFADE_TIME = window.crossfadeDuration || 0.5; 
        
        if (remaining <= CROSSFADE_TIME && !window.isTransitioning) {
             // Transition Logic
             if (!window.multiExportMode && currentIndex + 1 < window.playlist.length) {
                 // Determine next ID
                 const nextId = window.currentPlayerId === 0 ? 1 : 0;
                 transitionToNext(currentIndex + 1, nextId);
             } else if (remaining <= 0) {
                 // End of playlist or multi-export mode
                 window.isPlaying = false;
                 clearInterval(window.checkTimeInterval);
                 stopRecordingIfActive();
                 
                 // Stop nodes strictly
                 stopAllNodes();
                 window.dispatchEvent(new Event("quran-playback-stopped"));
             }
        }
    }, 50);
}

async function transitionToNext(nextIndex, playerId) {
    if (window.isTransitioning) return;
    window.isTransitioning = true; // Block double triggers

    // Get Data
    let trackData = window.pendingTrackData;
    if (!trackData || trackData.index !== nextIndex) {
        trackData = await prepareNextTrack(nextIndex);
    }
    
    if (!trackData || !trackData.audioData) {
        window.isTransitioning = false;
        return; // Gap or error
    }
    
    // Create Node
    const source = window.audioCtx.createBufferSource();
    source.buffer = trackData.audioData.buffer;
    
    const currentId = playerId === 0 ? 1 : 0; // Outgoing
    const outgoingGain = getGainNode(currentId);
    const incomingGain = getGainNode(playerId);
    
    // Connect
    if (incomingGain) source.connect(incomingGain);
    
    const now = window.audioCtx.currentTime;
    const trim = trackData.audioData.trim;
    const fadeDuration = window.crossfadeDuration || 0.5;

    // Crossfade Logic
    if (incomingGain) {
        incomingGain.gain.cancelScheduledValues(now);
        incomingGain.gain.setValueAtTime(0, now);
        incomingGain.gain.linearRampToValueAtTime(1, now + (fadeDuration * 0.7));
    }
    
    if (outgoingGain) {
        outgoingGain.gain.cancelScheduledValues(now);
        outgoingGain.gain.setValueAtTime(1, now);
        outgoingGain.gain.linearRampToValueAtTime(0, now + fadeDuration);
    }
    
    // START
    source.start(now, trim.trimStart);
    
    // Update State
    if (window.activeSourceNodes[playerId]) {
        // Stop old node on this channel if any (should have finished long ago but safety)
        try { window.activeSourceNodes[playerId].stop(); } catch {}
    }
    window.activeSourceNodes[playerId] = source;
    
    window.activeTrackState = {
        startTime: now,
        duration: trim.duration,
        trimEnd: trim.trimEnd
    };
    window.currentPlayerId = playerId;
    window.index = nextIndex;
    updateUIForTrack(trackData);
    updateMeter();
    
    window.isTransitioning = false;
    
    // Restart Scheduler for NEW track
    startScheduler(nextIndex);
    
    // Preload Next
    if (nextIndex + 1 < window.playlist.length) {
         const nextNextId = playerId === 0 ? 1 : 0;
         preloadNextTrack(nextIndex + 1, nextNextId);
    }
    
    // Stop outgoing node after fade
    const outgoingNode = window.activeSourceNodes[currentId];
    if (outgoingNode) {
        // Give it buffer time to fade out then stop
        // We know it ends roughly at now + remaining (closest to 0)
        // But let's just schedule stop? 
        // Actually, we don't strictly need to stop it if it runs out of buffer data, 
        // BUT if file has long silence at end we skipped, we MUST stop it or it will play silence.
        // It plays until end of buffer by default.
        // We want to stop it at (now + remaining duration of overlap).
        // It's cleaner to let it play out if we are mixing, 
        // unless we want to "cut" the tail silence.
        // Since we trimmed the Data logically, but we assume the buffer itself is long?
        
        // Wait, start(now, offset) plays until end of buffer.
        // We WANT to stop it when the trimmed duration ends.
        // So we should have executed stop() on the outgoing node?
        // Ah, in playDualSequence we didn't schedule stop().
        // We should schedule stop() for every node!
        outgoingNode.stop(now + fadeDuration + 0.1); // Safety stop after fade
    }
    
    // Schedule stop for THIS new node?
    // source.stop(now + trim.duration); 
    // Yes, we should schedule stop to avoid playing the trailing silence we wanted to trigger over.
    source.stop(now + trim.duration);
}

function stopAllNodes() {
    if (window.activeSourceNodes[0]) { try { window.activeSourceNodes[0].stop(); } catch {} window.activeSourceNodes[0] = null; }
    if (window.activeSourceNodes[1]) { try { window.activeSourceNodes[1].stop(); } catch {} window.activeSourceNodes[1] = null; }
    if (window.checkTimeInterval) clearInterval(window.checkTimeInterval);
}

// Stub for old setupNextTrigger (removed)
function setupNextTrigger() {}


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
  stopPlayback,
  updateMeter,
  playIndex: async (i, autoplay) => {
      if (autoplay) {
           await window.audioModule.ensureGraphOnGesture();
           window.audioModule.updateAudioRouting();
           window.isPlaying = true;
           await playDualSequence(i);
      } else {
          // Just load data (for Picture mode) - Skip Audio
          const data = await prepareNextTrack(i, true);
          if (data) updateUIForTrack(data);
      }
  }
};
