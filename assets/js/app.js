
// ------------------ Utils ------------------
const $ = (s) => document.querySelector(s);
const pad3 = (n) => String(Number(n) || 0).padStart(3, "0");
const safe = (s) => (s || "").replace(/[^\w-]+/g, "_");
const timestampStr = (d = new Date()) => {
  const z = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${z(d.getMonth() + 1)}${z(d.getDate())}_${z(
    d.getHours()
  )}${z(d.getMinutes())}${z(d.getSeconds())}`;
};

// ------------------ Theme (dark / light) ------------------
function applyTheme(theme) {
  const t = theme === "light" ? "light" : "dark";
  try {
    document.documentElement.setAttribute("data-theme", t);
  } catch (e) {}
  const btn = document.getElementById("themeToggle");
  if (btn) {
    btn.textContent = t === "light" ? "☀️" : "🌙";
    btn.setAttribute("aria-pressed", t === "light" ? "true" : "false");
  }
  try {
    localStorage.setItem("theme", t);
  } catch (e) {}
}

(function initTheme() {
  try {
    const saved = localStorage.getItem("theme");
    const prefersLight =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: light)").matches;
    const theme = saved || (prefersLight ? "light" : "dark");
    applyTheme(theme);
  } catch (e) {
    /* ignore */
  }
})();

// Toggle via the button (delegated click handler)
document.addEventListener("click", (ev) => {
  const t = ev.target;
  if (t && t.id === "themeToggle") {
    const cur =
      document.documentElement.getAttribute("data-theme") === "light"
        ? "light"
        : "dark";
    applyTheme(cur === "light" ? "dark" : "light");
  }
});

async function fetchRetry(url, opts = {}, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, { cache: "no-store", ...opts });
      if (!res.ok) throw new Error(res.status + " " + res.statusText);
      return res;
    } catch (e) {
      if (i === retries) throw e;
      await new Promise((r) => setTimeout(r, 500 * (i + 1)));
    }
  }
}

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
let meta = { surahs: [] };
let playlist = [];
let index = 0;
let isPlaying = false;

// text controls
let selectedFont = "Inter, sans-serif";
let sizePercent = 100; // 25–160
let translationEdition = "en.asad";

// drawing content
let currentText = "Centered translation will appear here.";
let currentLabel = "—";

// Background state
let backgroundMode = "color"; // 'color' | 'media'
let bgColor = "#ffffff";
let fontColor = "#111111";
let bgMediaList = []; // [{src, type, name?}]
let selectedBg = null; // active media item
const bgImg = new Image();
bgImg.crossOrigin = "anonymous";
const bgVideo = document.createElement("video");
bgVideo.loop = true;
bgVideo.muted = true;
bgVideo.playsInline = true;
bgVideo.crossOrigin = "anonymous";

// credits
let showCreditData = true;
let showCreditCreator = true;

// recording state
let audioCtx = null,
  srcNode = null,
  gainNode = null,
  destNode = null,
  mixedStream = null,
  connections = { toDest: false, toRecorder: false };

let recorder = null;
let chunks = [];
let recordingStarted = false;
let finalBlob = null;
let hasAudioError = false;
let wasDismissed = false;

// gate: only record when explicitly allowed
let allowRecording = true;

// progress
let totalAyahs = 0;

// session info for filename
let sessionSurah = 1,
  sessionSurahName = "Al-Fatihah",
  sessionFrom = 1,
  sessionTo = 1,
  sessionReciterName = "Unknown";

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
    if (recorder && recorder.state === "recording") recorder.stop();
  } catch {}
  recorder = null;
  recordingStarted = false;
  chunks = [];
  finalBlob = null;
  downloadBtn.disabled = true;
  recStatus.textContent =
    "Press Play & Export to preview & auto-record. Avoid the right audio controller during recording.";
  meterBar.style.width = "0%";
  setDuringRecordingUI(false);
}

function onAnyInputChange() {
  resetSessionUI();
  selectedFont = fontPicker.value;
  sizePercent = parseInt(textSize.value, 10) || 100;
  if (textSizeVal) textSizeVal.textContent = `(${sizePercent}%)`;
  if (bgColorInput) bgColor = bgColorInput.value;
  if (fontColorInput) fontColor = fontColorInput.value;
  translationEdition = translationEditionSel?.value || "en.asad";
  showCreditData = !!creditDataChk?.checked;
  showCreditCreator = !!creditCreatorChk?.checked;
}

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
        sizePercent = parseInt(textSize.value, 10) || 100;
        if (textSizeVal) textSizeVal.textContent = `(${sizePercent}%)`;
      });
    }
  });

// Color preview
bgColorInput?.addEventListener("input", () => {
  bgColor = bgColorInput.value;
});
fontColorInput?.addEventListener("input", () => {
  fontColor = fontColorInput.value;
});

// ------------------ Background mode toggles ------------------
function applyBgModeUI() {
  if (backgroundMode === "color") {
    bgColorField.style.display = "block";
    bgMediaField.style.display = "none";
  } else {
    bgColorField.style.display = "none";
    bgMediaField.style.display = "block";
  }
}
bgModeColor?.addEventListener("change", () => {
  if (bgModeColor.checked) {
    backgroundMode = "color";
    applyBgModeUI();
  }
});
bgModeMedia?.addEventListener("change", async () => {
  if (bgModeMedia.checked) {
    backgroundMode = "media";
    applyBgModeUI();
    if (!bgMediaList.length) await loadBackgroundAssets();
  }
});

// ------------------ Metadata ------------------
async function loadMeta() {
  try {
    const m = await (
      await fetchRetry("https://api.alquran.cloud/v1/meta")
    ).json();
    const e = await (
      await fetchRetry("https://api.quran.com/api/v4/chapters")
    ).json();
    const chapters = Array.isArray(e?.chapters) ? e.chapters : [];
    const engById = new Map(chapters.map((c) => [c.id, c]));
    const refs = m?.data?.surahs?.references || [];
    meta.surahs = refs.map((s) => ({
      number: s.number,
      nameAr: s.name,
      englishName:
        engById.get(s.number)?.name_simple || s.englishName || s.name,
      ayahCount: s.numberOfAyahs,
    }));
    if (!meta.surahs.length) throw new Error("Surah metadata missing");

    surahSel.innerHTML = meta.surahs
      .map(
        (s) =>
          `<option value="${s.number}">${s.number}. ${s.englishName} (${s.nameAr})</option>`
      )
      .join("");
    updateAyahRange();
  } catch (err) {
    console.error(err);
  }
}

function updateAyahRange() {
  const sNum = +surahSel.value || 1;
  const s = meta.surahs.find((x) => x.number === sNum) || meta.surahs[0];
  if (!s) return;
  const opts = Array.from(
    { length: s.ayahCount },
    (_, i) => `<option value="${i + 1}">Ayah ${i + 1}</option>`
  ).join("");
  ayahStartSel.innerHTML = opts;
  ayahEndSel.innerHTML = opts;
  ayahStartSel.value = "1";
  ayahEndSel.value = String(Math.min(5, s.ayahCount));
  sessionSurahName = s.englishName;

  const handler = () => {
    if (+ayahEndSel.value < +ayahStartSel.value)
      ayahEndSel.value = ayahStartSel.value;
  };
  ayahStartSel.addEventListener("change", handler, { once: true });
  onAnyInputChange();
}
surahSel.addEventListener("change", updateAyahRange);

// ------------------ Background assets (simplified) ------------------
const ALLOWED_EXT = [
  "png",
  "jpg",
  "jpeg",
  "gif",
  "bmp",
  "webp",
  "avif",
  "mp4",
  "webm",
  "mov",
  "m4v",
];
function inferTypeFromPath(src) {
  const l = (src || "").toLowerCase();
  return ["mp4", "webm", "mov", "m4v"].some((e) => l.endsWith("." + e))
    ? "video"
    : "image";
}

function populateSelectFromList(list) {
  const combined = [
    ...userUploads,
    ...(list || []).filter(
      (it) => it.src && (it.type === "image" || it.type === "video")
    ),
  ];

  bgMediaList = combined;

  if (!bgMediaList.length) {
    bgMediaSelect.innerHTML = "";
    bgMediaHint.textContent =
      "No media configured. Upload to get started.";
    bgMediaSelect.disabled = true;
    selectedBg = null;
    return;
  }

  bgMediaSelect.innerHTML = bgMediaList
    .map(
      (it, i) =>
        `<option value="${i}">${it.type === "video" ? "🎞️" : "🖼️"} ${
          it.name || it.src
        }</option>`
    )
    .join("");

  bgMediaSelect.disabled = false;
  bgMediaHint.textContent = `Available: ${bgMediaList.length} item(s). ${
    userUploads.length ? `(${userUploads.length} from your uploads)` : ""
  }`;
  if (bgMediaSelect.value === "" || bgMediaSelect.value == null) {
    bgMediaSelect.value = "0";
  }
  onBgMediaChange();
}

function handleUserFiles(fileList) {
  if (!fileList || !fileList.length) return;

  revokeUserUploadURLs();
  userUploads = [];

  for (const f of fileList) {
    const url = URL.createObjectURL(f);
    const isVideo = (f.type || "").startsWith("video");
    const isImage = (f.type || "").startsWith("image");
    if (!isVideo && !isImage) continue;

    userUploads.push({
      src: url,
      type: isVideo ? "video" : "image",
      name: `📥 ${f.name}`,
      __blobUrl: true,
    });
  }

  populateSelectFromList(bgMediaList);
  if (bgModeMedia && !bgModeMedia.checked) {
    bgModeMedia.checked = true;
    backgroundMode = "media";
    applyBgModeUI();
  }

  if (userUploads.length) {
    const firstUploadIndex = 0;
    bgMediaSelect.value = String(firstUploadIndex);
    onBgMediaChange();
  }
}

bgUploadInput?.addEventListener("change", (e) => {
  handleUserFiles(e.target.files);
});

let userUploads = []; // [{ src, type, name, __blobUrl: true }]
function revokeUserUploadURLs() {
  for (const item of userUploads) {
    if (item.__blobUrl && item.src) {
      try {
        URL.revokeObjectURL(item.src);
      } catch {}
    }
  }
}
window.addEventListener("beforeunload", revokeUserUploadURLs);

const DEFAULT_BG_MEDIA = []; // fallback (optional)

async function loadBackgroundAssets() {
  try {
    bgMediaHint.textContent = "Loading background.json…";
    const res = await fetchRetry("assets/background/background.json");
    const raw = await res.json();

    const normalized = (Array.isArray(raw) ? raw : [])
      .map((it) => {
        const src = it && it.src ? String(it.src) : "";
        const ext = src.split(".").pop()?.toLowerCase() || "";
        if (!ALLOWED_EXT.includes(ext)) return null;
        return {
          src,
          name: it.name || src.split("/").pop(),
          type: it.type ? it.type : inferTypeFromPath(src),
        };
      })
      .filter(Boolean);

    if (!normalized.length) {
      if (DEFAULT_BG_MEDIA.length) {
        bgMediaHint.textContent = "No items in JSON; using defaults.";
        populateSelectFromList(DEFAULT_BG_MEDIA);
      } else {
        bgMediaHint.textContent = "No items found in background.json.";
        populateSelectFromList([]);
      }
      return;
    }

    populateSelectFromList(normalized);
    bgMediaHint.textContent = "Loaded";
  } catch (e) {
    console.warn("Failed to load background.json:", e);
    if (DEFAULT_BG_MEDIA.length) {
      bgMediaHint.textContent = "Failed to load JSON; using defaults.";
      populateSelectFromList(DEFAULT_BG_MEDIA);
    } else {
      bgMediaHint.textContent = "Failed to load background.json.";
      populateSelectFromList([]);
    }
  }
}

function onBgMediaChange() {
  const idx = parseInt(bgMediaSelect.value, 10);
  selectedBg = bgMediaList[idx] || null;
  if (!selectedBg) return;
  if (selectedBg.type === "image") {
    bgImg.onload = () => {};
    bgImg.src = selectedBg.src;
  } else {
    try {
      bgVideo.src = selectedBg.src;
      bgVideo.load();
      bgVideo.play().catch(() => {});
    } catch {}
  }
}
bgMediaSelect.addEventListener("change", onBgMediaChange);

// ------------------ Text layout + drawing ------------------
function fitTextToBox(
  ctx,
  text,
  maxW,
  maxH,
  startSize,
  minSize,
  lhRatio,
  fontFamily,
  weight = 700
) {
  let size = startSize;
  while (size >= minSize) {
    const lines = wrapText(
      ctx,
      text,
      weight + " " + size + "px " + fontFamily,
      maxW
    );
    const lineH = Math.round(size * lhRatio);
    const totalH = lines.length * lineH;
    if (totalH <= maxH)
      return { fontSize: size, lines, lineHeight: lineH };
    size -= 2;
  }
  return {
    fontSize: minSize,
    lines: wrapText(
      ctx,
      text,
      weight + " " + minSize + "px " + fontFamily,
      maxW
    ),
    lineHeight: Math.round(minSize * lhRatio),
  };
}
function wrapText(ctx, text, font, maxW) {
  ctx.font = font;
  const words = String(text || "")
    .trim()
    .split(/\s+/);
  const lines = [];
  let cur = "";
  for (const w of words) {
    const t = cur ? cur + " " + w : w;
    if (ctx.measureText(t).width <= maxW) cur = t;
    else {
      if (cur) lines.push(cur);
      if (ctx.measureText(w).width > maxW) {
        let buf = "";
        for (const ch of w) {
          const test = buf + ch;
          if (ctx.measureText(test).width <= maxW) buf = test;
          else {
            lines.push(buf);
            buf = ch;
          }
        }
        cur = buf;
      } else cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}
function drawRoundedRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}
function drawMediaCover(ctx, mediaEl, W, H) {
  const mw = mediaEl.videoWidth || mediaEl.naturalWidth;
  const mh = mediaEl.videoHeight || mediaEl.naturalHeight;
  if (!mw || !mh) return false;
  const canvasAR = W / H;
  const mediaAR = mw / mh;
  let dw, dh, dx, dy;
  if (mediaAR > canvasAR) {
    dh = H;
    dw = H * mediaAR;
    dx = (W - dw) / 2;
    dy = 0;
  } else {
    dw = W;
    dh = W / mediaAR;
    dx = 0;
    dy = (H - dh) / 2;
  }
  ctx.drawImage(mediaEl, dx, dy, dw, dh);
  return true;
}
function drawPreview() {
  const W = previewCanvas.width,
    H = previewCanvas.height;

  // Background
  if (backgroundMode === "media" && selectedBg) {
    let drew = false;
    if (
      selectedBg.type === "image" &&
      bgImg.complete &&
      bgImg.naturalWidth
    ) {
      drew = drawMediaCover(pctx, bgImg, W, H);
    } else if (selectedBg.type === "video" && bgVideo.readyState >= 2) {
      drew = drawMediaCover(pctx, bgVideo, W, H);
    }
    if (!drew) {
      pctx.fillStyle = bgColor;
      pctx.fillRect(0, 0, W, H);
    }
  } else {
    pctx.fillStyle = bgColor;
    pctx.fillRect(0, 0, W, H);
  }

  // Text
  const marginX = 90,
    marginY = 180;
  const usableW = W - 2 * marginX,
    usableH = H - 2 * marginY;
  const scale = (sizePercent || 100) / 100;
  const spec = fitTextToBox(
    pctx,
    currentText,
    usableW,
    usableH,
    72 * scale,
    34 * scale,
    1.25,
    selectedFont,
    700
  );
  const { fontSize, lines, lineHeight } = spec;

  pctx.fillStyle = fontColor;
  pctx.textAlign = "center";
  pctx.textBaseline = "middle";
  pctx.font = `700 ${fontSize}px ${selectedFont}`;
  const totalH = lines.length * lineHeight;
  let y = H / 2 - totalH / 2;
  pctx.save();
  pctx.shadowColor = "rgba(0,0,0,0.14)";
  pctx.shadowBlur = 8;
  lines.forEach((ln, i) => pctx.fillText(ln, W / 2, y + i * lineHeight));
  pctx.restore();

  // Bottom label
  pctx.font = `600 ${Math.max(
    30,
    Math.round(36 * scale)
  )}px ${selectedFont}`;
  pctx.fillStyle = fontColor;
  pctx.textAlign = "right";
  pctx.fillText(currentLabel, W - 40, H - 60);

  // Credits
  const badgePadX = 14,
    badgePadY = 10,
    badgeRadius = 14;
  pctx.textAlign = "left";
  pctx.textBaseline = "alphabetic";
  const creditTextColor = fontColor;

  if (showCreditCreator) {
    const txt = "Quran Shorts — Editor by TheAAA";
    pctx.font = `600 18px ${selectedFont}`;
    const tw = pctx.measureText(txt).width;
    const th = 24;
    const bx = 40,
      by = 60;
    pctx.save();
    pctx.globalAlpha = 0.12;
    pctx.fillStyle = "#000";
    drawRoundedRect(
      pctx,
      bx - badgePadX,
      by - th - badgePadY + 6,
      tw + badgePadX * 2,
      th + badgePadY * 2,
      badgeRadius
    );
    pctx.fill();
    pctx.restore();
    pctx.fillStyle = creditTextColor;
    pctx.fillText(txt, bx, by);
  }

  const madeByNameNow = (madeByInput?.value || "").trim();
  const showMadeByNow = !!creditMadeByChk?.checked;
  if (showMadeByNow && madeByNameNow) {
    pctx.font = `600 18px ${selectedFont}`;
    let txt = `Made by ${madeByNameNow}`;
    const th = 24;
    const bx = W - 40,
      by = 60;
    while (pctx.measureText(txt).width > W - 120 && txt.length > 4) {
      txt = txt.slice(0, -4) + "…";
    }
    const tw = pctx.measureText(txt).width;
    pctx.save();
    pctx.globalAlpha = 0.12;
    pctx.fillStyle = "#000";
    drawRoundedRect(
      pctx,
      bx - tw - badgePadX,
      by - th - badgePadY + 6,
      tw + badgePadX * 2,
      th + badgePadY * 2,
      badgeRadius
    );
    pctx.fill();
    pctx.restore();
    pctx.fillStyle = creditTextColor;
    pctx.textAlign = "right";
    pctx.fillText(txt, bx, by);
    pctx.textAlign = "left";
  }

  if (showCreditData) {
    let txt = "Data: Quran.com & AlQuran Cloud • Audio: EveryAyah.com";
    pctx.font = `600 18px ${selectedFont}`;
    const th = 24;
    const bx = 40,
      by = H - 60;
    while (pctx.measureText(txt).width > W - 120 && txt.length > 4) {
      txt = txt.slice(0, -4) + "…";
    }
    const tw = pctx.measureText(txt).width;
    pctx.save();
    pctx.globalAlpha = 0.12;
    pctx.fillStyle = "#000";
    drawRoundedRect(
      pctx,
      bx - badgePadX,
      by - th - badgePadY + 6,
      tw + badgePadX * 2,
      th + badgePadY * 2,
      badgeRadius
    );
    pctx.fill();
    pctx.restore();
    pctx.fillStyle = creditTextColor;
    pctx.fillText(txt, bx, by);
  }

  requestAnimationFrame(drawPreview);
}

// ------------------ Volume helpers ------------------
function setVolumeFromSlider() {
  const v = Math.max(0, Math.min(100, Number(volumeSlider?.value) || 0));
  if (volumeVal) volumeVal.textContent = `${v}%`;
  audio.volume = v / 100; // playback loudness
  if (gainNode) gainNode.gain.value = v / 100; // recorded loudness
}

// ------------------ Audio graph + routing ------------------
function ensureAudioGraph() {
  if (audioCtx) return true;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    audioCtx = new AC();
    srcNode = audioCtx.createMediaElementSource(audio);
    gainNode = audioCtx.createGain();
    destNode = audioCtx.createMediaStreamDestination();

    // Start with slider value
    gainNode.gain.value = (Number(volumeSlider?.value) || 100) / 100;

    // Base connection
    srcNode.connect(gainNode);

    // We'll route to speakers/recorder via updateAudioRouting()
    connections = { toDest: false, toRecorder: false };
    updateAudioRouting();

    return true;
  } catch (e) {
    console.warn("Audio graph unavailable (CORS or browser):", e);
    audioCtx = null;
    srcNode = null;
    gainNode = null;
    destNode = null;
    // Fallback: element audio will be heard
    // audio.muted = false;
    audio.volume = (Number(volumeSlider?.value) || 100) / 100;
    return false;
  }
}

// Replace your entire updateAudioRouting() with this:
function updateAudioRouting() {
  if (!gainNode || !audioCtx) return;

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
  if (audioCtx.destination) disconnect(gainNode, audioCtx.destination);
  if (destNode) disconnect(gainNode, destNode);

  // Always monitor to speakers
  if (audioCtx.destination) connect(gainNode, audioCtx.destination);

  // Additionally feed the recorder only when recording
  if (allowRecording && destNode) connect(gainNode, destNode);
}

async function ensureGraphOnGesture() {
  if (!audioCtx) {
    const ok = ensureAudioGraph();
    if (!ok) {
      // audio.muted = false;
      return false;
    }
  }
  if (audioCtx.state === "suspended") {
    try {
      await audioCtx.resume();
    } catch {}
  }
  // Always keep element audible
  // audio.muted = false;
  return true;
}

// ------------------ Recording setup ------------------
function buildMixedStream() {
  const fps = 30;
  const canvasStream = previewCanvas.captureStream(fps);
  const ok = ensureAudioGraph();
  if (ok && destNode) {
    return new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...destNode.stream.getAudioTracks(),
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
  if (recorder) return;
  mixedStream = buildMixedStream();
  const mime = pickMime();
  try {
    recorder = new MediaRecorder(mixedStream, {
      ...(mime ? { mimeType: mime } : {}),
      videoBitsPerSecond: 5_000_000,
    });
  } catch (e) {
    console.error("MediaRecorder init failed:", e);
    return;
  }
  chunks = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size) chunks.push(e.data);
  };
  recorder.onstart = () => {
    recStatus.textContent = "Recording in the background…";
  };
  recorder.onstop = () => {
    finalBlob = new Blob(chunks, { type: mime || "video/webm" });

    if (!hasAudioError && !wasDismissed) {
      downloadBtn.disabled = false;
      recStatus.textContent =
        "Recording complete. You can download your Short.";
    } else {
      downloadBtn.disabled = true;
      recStatus.textContent = wasDismissed
        ? "Dismissed. Ready."
        : "Recording incomplete due to audio error. Download disabled.";
    }

    setDuringRecordingUI(false);
  };
}

function startRecordingIfNeeded() {
  if (!allowRecording) return;

  // Ensure recorder path is connected
  if (audioCtx && gainNode) updateAudioRouting();

  if (!recorder) initRecorder();
  if (!recorder) return;
  if (!recordingStarted && recorder.state !== "recording") {
    try {
      recorder.start();
      recordingStarted = true;
      recStatus.textContent = "Recording in the background…";
    } catch (e) {
      console.error(e);
      recStatus.textContent =
        "Recording failed to start. Check browser permissions.";
    }
  }
}
function stopRecordingIfActive() {
  if (recorder && recorder.state === "recording") {
    try {
      recorder.stop();
    } catch {}
  }
}

// ------------------ Playback controls ------------------
async function loadAndPlay({ record }) {
  // Mode flag
  allowRecording = !!record;

  // UI & flags
  resetSessionUI();
  setDuringRecordingUI(!!record);
  wasDismissed = false;
  hasAudioError = false;

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
  recordingStarted = false;
  chunks = [];
  finalBlob = null;
  downloadBtn.disabled = true;

  // ---- Read selections ----
  sessionSurah = +surahSel.value || 1;
  const s =
    meta.surahs.find((x) => x.number === sessionSurah) || meta.surahs[0];
  sessionSurahName = s?.englishName || "Unknown";
  sessionFrom = +ayahStartSel.value || 1;
  sessionTo = +ayahEndSel.value || Math.min(5, s?.ayahCount || 5);
  sessionReciterName =
    reciterSel.options[reciterSel.selectedIndex]?.text || "Unknown";

  selectedFont = fontPicker.value;
  sizePercent = parseInt(textSize.value, 10) || 100;
  translationEdition = translationEditionSel?.value || "en.asad";
  showCreditData = !!creditDataChk?.checked;
  showCreditCreator = !!creditCreatorChk?.checked;
  backgroundMode = bgModeMedia.checked ? "media" : "color";

  // ---- Validate ----
  if (
    !s ||
    Number.isNaN(sessionFrom) ||
    Number.isNaN(sessionTo) ||
    sessionFrom < 1 ||
    sessionTo > s.ayahCount ||
    sessionFrom > sessionTo
  ) {
    recStatus.textContent =
      "Invalid ayah range. Please adjust the selection.";
    setDuringRecordingUI(false);
    return;
  }

  // ---- Playlist ----
  playlist = [];
  for (let a = sessionFrom; a <= sessionTo; a++) {
    playlist.push({ surah: sessionSurah, ayah: a, sName: s.englishName });
  }
  index = 0;
  totalAyahs = playlist.length;

  meterBar.style.width = "0%";
  await playIndex(index, true);
}

buildPreviewBtn.addEventListener("click", async () => {
  await ensureGraphOnGesture();
  allowRecording = true;
  updateAudioRouting();
  setVolumeFromSlider();
  loadAndPlay({ record: true });
});

previewPlayBtn.addEventListener("click", async () => {
  await ensureGraphOnGesture();
  allowRecording = false;
  updateAudioRouting();
  setVolumeFromSlider();
  loadAndPlay({ record: false });
});

// Stop button
const previewStopBtn = $("#previewStopBtn");
previewStopBtn.addEventListener("click", () => {
  if (audio) {
    audio.pause();
    audio.currentTime = 0;
    index = 0;
    updateMeter();
    isPlaying = false;
    if (recorder && recorder.state === "recording") {
      stopRecordingIfActive();
    }
  }
});

function updateMeter() {
  if (!totalAyahs) {
    meterBar.style.width = "0%";
    return;
  }
  const denom = Math.max(1, totalAyahs - 1);
  const pct = Math.min(100, Math.round((index / denom) * 100));
  meterBar.style.width = pct + "%";
}

audio.addEventListener("play", async () => {
  isPlaying = true;
  await ensureGraphOnGesture();
  updateAudioRouting();
  if (allowRecording) startRecordingIfNeeded();
});
audio.addEventListener("pause", () => {
  isPlaying = false;
});
audio.addEventListener("ended", async () => {
  if (index < playlist.length - 1) {
    index++;
    updateMeter();
    await playIndex(index, true);
  } else {
    isPlaying = false;
    updateMeter();
    stopRecordingIfActive();
  }
});

async function playIndex(i, autoplay = false) {
  const it = playlist[i];
  if (!it) return;
  const s3 = pad3(it.surah),
    a3 = pad3(it.ayah);

  try {
    const tRes = await fetchRetry(
      `https://api.alquran.cloud/v1/ayah/${it.surah}:${it.ayah}/${translationEdition}`
    );
    const t = await tRes.json();
    currentText =
      t && t.code === 200 && t.data && t.data.text
        ? t.data.text
        : "(Translation unavailable)";
  } catch {
    currentText = "(Failed to load translation)";
  }

  currentLabel = `${it.sName} • Ayah ${it.ayah}`;
  const reciter = reciterSel.value;
  const audioUrl = `https://everyayah.com/data/${reciter}/${s3}${a3}.mp3`;

  // Hide any previous error message
  const errorMessage = $("#audioErrorMessage");
  errorMessage.style.display = "none";

  // Audio error handling
  audio.onerror = () => {
    const errorMessage = $("#audioErrorMessage");
    errorMessage.textContent = `⚠️ Failed to load audio for Surah ${it.surah}, Ayah ${it.ayah}`;
    errorMessage.style.display = "block";

    hasAudioError = true;

    if (recorder && recorder.state === "recording") {
      try {
        recorder.stop();
      } catch {}
      chunks = [];
      finalBlob = null;
    }

    recordingStarted = false;
    recorder = null;
    downloadBtn.disabled = true;
    isPlaying = false;

    recStatus.textContent = "Recording stopped due to audio error.";
    setDuringRecordingUI(false);
  };

  audio.src = audioUrl;

  if (!recorder && allowRecording) initRecorder();
  if (autoplay) {
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

// ------------------ Download recorded WebM ------------------
downloadBtn.addEventListener("click", () => {
  if (!finalBlob) return;
  const ts = timestampStr();
  const filename = `Surah-${sessionSurah}-${safe(
    sessionSurahName
  )}_Ayah-${sessionFrom}-${sessionTo}_${safe(
    sessionReciterName
  )}_${ts}.webm`;
  const url = URL.createObjectURL(finalBlob);
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
  wasDismissed = true;
  try {
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    stopRecordingIfActive();
  } catch {}
  chunks = [];
  finalBlob = null;
  downloadBtn.disabled = true;
  recStatus.textContent = "Dismissed. Ready.";
  setDuringRecordingUI(false);
});

// ------------------ Volume slider wiring ------------------
volumeSlider?.addEventListener("input", async () => {
  await ensureGraphOnGesture();
  setVolumeFromSlider();
  // routing unchanged, element remains audible
});

// ------------------ Init ------------------
(async () => {
  await loadMeta();
  selectedFont = fontPicker.value;
  sizePercent = parseInt(textSize.value, 10) || 100;
  if (textSizeVal) textSizeVal.textContent = `(${sizePercent}%)`;
  bgColor = bgColorInput.value;
  fontColor = fontColorInput.value;
  translationEdition = translationEditionSel?.value || "en.asad";
  showCreditData = !!creditDataChk?.checked;
  showCreditCreator = !!creditCreatorChk?.checked;
  applyBgModeUI();
  await loadBackgroundAssets();
  setDuringRecordingUI(false);

  // Volume UI defaults
  if (volumeVal) volumeVal.textContent = `${volumeSlider?.value || 100}%`;
  audio.volume = (Number(volumeSlider?.value) || 100) / 100;
  // audio.muted = false; // ensure always audible

  requestAnimationFrame(drawPreview);
})();
