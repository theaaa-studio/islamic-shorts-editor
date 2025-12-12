// ------------------ Background assets (simplified) ------------------
// Note: $ function from utils.js must be available
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

let userUploads = []; // [{ src, type, name, __blobUrl: true }]
let baseMediaList = []; // items from JSON or defaults

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

// Background state
let backgroundMode = "color"; // 'color' | 'media'
let boxMode = "color"; // 'color' | 'blur'
let bgColor = "#ffffff";
let textBoxColor = "#000000"; // Color for text background box
let textBoxOpacity = 0.12; // Opacity for text background box (0-1)
let bgBlur = 0; // Blur radius in px
let bgMediaList = []; // [{src, type, name?}]
let selectedBg = null; // active media item
const bgImg = new Image();
bgImg.crossOrigin = "anonymous";
const bgVideo = document.createElement("video");
bgVideo.loop = true;
bgVideo.muted = true;
bgVideo.playsInline = true;
bgVideo.crossOrigin = "anonymous";
bgVideo.preload = "auto"; // Ensure video is fully buffered
bgVideo.setAttribute("playsinline", ""); // Better mobile support

// Track video state for smooth looping
let videoIsStable = false;
bgVideo.addEventListener("canplaythrough", () => {
  videoIsStable = true;
});
bgVideo.addEventListener("seeking", () => {
  // Video is seeking (e.g., looping back to start)
  // Don't mark as unstable to prevent flashing
});
bgVideo.addEventListener("seeked", () => {
  // Seeking complete, video ready again
  videoIsStable = true;
});

function populateSelectFromList(list) {
  const bgMediaSelect = $("#bgMediaSelect");
  const bgMediaHint = $("#bgMediaHint");
  if (!bgMediaSelect || !bgMediaHint) {
    console.warn("populateSelectFromList: Elements not found", {
      bgMediaSelect: !!bgMediaSelect,
      bgMediaHint: !!bgMediaHint,
    });
    return;
  }

  // If list is provided, update baseMediaList (unless it's a re-render)
  if (list) {
    baseMediaList = list;
  }

  const combined = [
    ...userUploads,
    ...(baseMediaList || []).filter(
      (it) => it.src && (it.type === "image" || it.type === "video")
    ),
  ];

  bgMediaList = combined;
  // Update exported bgMediaList
  window.backgroundModule.bgMediaList = bgMediaList;

  if (!bgMediaList.length) {
    bgMediaSelect.innerHTML = "";
    bgMediaHint.textContent = "No media configured. Upload to get started.";
    bgMediaSelect.disabled = true;
    selectedBg = null;
    window.backgroundModule.selectedBg = null;
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
  // Show upload indicators if there are user uploads
  if (userUploads.length) {
    bgMediaHint.textContent = `Upload ${userUploads.length}`;
  } else {
    bgMediaHint.textContent = "Ready";
  }

  // Ensure select has a value
  if (bgMediaSelect.value === "" || bgMediaSelect.value == null) {
    bgMediaSelect.value = "0";
  }

  // Mirror the visible selected text into the overlay element (used on mobile)
  const bgMediaValueEl = $("#bgMediaValue");
  if (bgMediaValueEl) {
    const selIdx = parseInt(bgMediaSelect.value, 10) || 0;
    const opt = bgMediaSelect.options[selIdx];
    bgMediaValueEl.textContent = opt ? opt.textContent.trim() : "";
  }

  onBgMediaChange();
}

async function loadBackgroundAssets() {
  const bgMediaHint = $("#bgMediaHint");
  try {
    if (bgMediaHint) bgMediaHint.textContent = "Loading background.json…";
    const res = await fetchRetry("./assets/background/background.json");
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
        if (bgMediaHint)
          bgMediaHint.textContent = "No items in JSON; using defaults.";
        populateSelectFromList(DEFAULT_BG_MEDIA);
      } else {
        if (bgMediaHint)
          bgMediaHint.textContent = "No items found in background.json.";
        populateSelectFromList([]);
      }
      return;
    }

    populateSelectFromList(normalized);
    // Don't override bgMediaHint since populateSelectFromList will set it
  } catch (e) {
    console.warn("Failed to load background.json:", e);
    if (DEFAULT_BG_MEDIA.length) {
      if (bgMediaHint)
        bgMediaHint.textContent = "Failed to load JSON; using defaults.";
      populateSelectFromList(DEFAULT_BG_MEDIA);
    } else {
      if (bgMediaHint)
        bgMediaHint.textContent = "Failed to load background.json.";
      populateSelectFromList([]);
    }
  }
}

function handleUserUploads(fileList) {
  console.log("handleUserUploads called with", fileList.length, "files");
  if (!fileList || !fileList.length) return;

  const uploadStartIndex = userUploads.length; // Track where new uploads start
  const uploadCount = fileList.length; // How many files are being uploaded

  // Create new uploads and append to existing ones (don't clear)
  for (const f of fileList) {
    const url = URL.createObjectURL(f);
    const isVideo = (f.type || "").startsWith("video");
    const isImage = (f.type || "").startsWith("image");
    console.log(
      "Processing file:",
      f.name,
      "type:",
      f.type,
      "isVideo:",
      isVideo,
      "isImage:",
      isImage
    );
    if (!isVideo && !isImage) continue;

    userUploads.push({
      src: url,
      type: isVideo ? "video" : "image",
      name: f.name,
      __blobUrl: true,
    });
  }
  console.log("User uploads processed. Total:", userUploads.length);

  // Store upload batch info for hint display
  window.lastUploadBatchSize = uploadCount;
  window.lastUploadBatchStart = uploadStartIndex;

  // Re-populate select using existing baseMediaList
  populateSelectFromList(null); // passing null to use existing baseMediaList
}

function onBgMediaChange() {
  const bgMediaSelect = document.getElementById("bgMediaSelect"); // Use direct DOM access
  if (!bgMediaSelect) {
    console.warn("onBgMediaChange: bgMediaSelect not found");
    return;
  }
  const idx = parseInt(bgMediaSelect.value, 10);
  selectedBg = bgMediaList[idx] || null;

  // Update the exported object's selectedBg property
  window.backgroundModule.selectedBg = selectedBg;

  // Update overlay value (mobile-friendly truncated label)
  try {
    const bgMediaValueEl = document.getElementById("bgMediaValue");
    if (bgMediaValueEl) {
      const opt = bgMediaSelect.options[idx];
      bgMediaValueEl.textContent = opt ? opt.textContent.trim() : "";
    }
  } catch (e) {
    // ignore
  }

  if (!selectedBg) return;

  if (selectedBg.type === "image") {
    bgImg.onload = () => {
      // Image loaded, trigger redraw
      if (window.drawingModule && window.drawingModule.drawPreview) {
        // The drawPreview function is already in a requestAnimationFrame loop
        // but we can ensure it's called
      }
    };
    bgImg.onerror = () => {
      console.warn("Failed to load background image:", selectedBg.src);
    };
    bgImg.src = selectedBg.src;
  } else {
    try {
      // Set up video event handlers before setting src
      bgVideo.onloadeddata = () => {
        // Video loaded, ensure it plays and loops
        bgVideo.play().catch((err) => {
          console.warn("Video play failed:", err);
        });
      };
      bgVideo.oncanplay = () => {
        // Video can start playing
        bgVideo.play().catch(() => {});
      };
      bgVideo.onerror = (e) => {
        console.warn("Failed to load background video:", selectedBg.src, e);
      };

      // Set video properties
      bgVideo.loop = true;
      bgVideo.muted = true;
      bgVideo.playsInline = true;

      // Reset video buffer when changing videos
      if (window.resetVideoBuffer) {
        window.resetVideoBuffer();
      }

      // Set source and load
      bgVideo.src = selectedBg.src;
      bgVideo.load();

      // Try to play immediately (may fail due to autoplay policies)
      bgVideo.play().catch(() => {
        // Autoplay blocked, will play when user interacts
        console.log("Video autoplay blocked, will play on user interaction");
      });
    } catch (e) {
      console.warn("Error setting up background video:", e);
    }
  }
}

function applyBgModeUI() {
  const bgColorField = $("#bgColorField");
  const bgMediaField = $("#bgMediaField");
  const bgUploadBtn = $("#bgUploadBtn");
  // bgBlurField logic handled by boxMode now inside media block?
  
  if (!bgColorField || !bgMediaField) return; 
  
  if (backgroundMode === "color") {
    bgColorField.style.display = "block";
    bgMediaField.style.display = "none";
    if (bgUploadBtn) bgUploadBtn.style.display = "none";
  } else {
    bgColorField.style.display = "none";
    bgMediaField.style.display = "block";
    if (bgUploadBtn) bgUploadBtn.style.display = "flex"; // or block/inline-flex as needed
  }
}

function applyBoxModeUI() {
  const boxColorControls = $("#boxColorControls");
  const boxBlurControls = $("#boxBlurControls");
  if (!boxColorControls || !boxBlurControls) return;

  if (boxMode === "blur") {
    boxColorControls.style.display = "none";
    boxBlurControls.style.display = "block";
  } else {
    // Color mode
    boxColorControls.style.display = "block";
    boxBlurControls.style.display = "none";
  }
}

// Export functions and variables that need to be accessed from other modules
window.backgroundModule = {
  backgroundMode,
  bgColor,
  textBoxColor,
  textBoxOpacity,
  bgImg,
  bgVideo,
  selectedBg,
  bgMediaList,
  userUploads,
  getBackgroundMode: () => backgroundMode,
  setBackgroundMode: (mode) => {
    backgroundMode = mode;
  },
  getBoxMode: () => boxMode,
  setBoxMode: (mode) => {
    boxMode = mode;
    // Trigger redraw
    if (window.drawingModule && window.drawingModule.drawPreview) {
      window.drawingModule.drawPreview();
    }
  },
  getBgColor: () => bgColor,
  setBgColor: (color) => {
    bgColor = color;
  },
  getTextBoxColor: () => textBoxColor,
  setTextBoxColor: (color) => {
    textBoxColor = color;
  },
  getTextBoxOpacity: () => {
    // If in Blur mode, user requested "opacity disabled". 
    // We enforce a fixed low opacity for the frosted glass tint only.
    if (boxMode === "blur") return 0.2; 
    return textBoxOpacity;
  },
  setTextBoxOpacity: (opacity) => {
    textBoxOpacity = opacity;
  },
  getBgBlur: () => {
     // Blur is only active in Blur Box Mode
     if (boxMode === "blur") return bgBlur;
     return 0;
  },
  setBgBlur: (val) => {
    bgBlur = val;
    // Trigger redraw
    if (window.drawingModule && window.drawingModule.drawPreview) {
      window.drawingModule.drawPreview();
    }
  },
  getVideoIsStable: () => videoIsStable,
  loadBackgroundAssets,
  applyBgModeUI,
  applyBoxModeUI,
  populateSelectFromList,
  onBgMediaChange,
  handleUserUploads,
};
