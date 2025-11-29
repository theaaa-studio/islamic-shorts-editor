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
let bgColor = "#ffffff";
let textBoxColor = "#000000"; // Color for text background box
let textBoxOpacity = 0.12; // Opacity for text background box (0-1)
let bgMediaList = []; // [{src, type, name?}]
let selectedBg = null; // active media item
const bgImg = new Image();
bgImg.crossOrigin = "anonymous";
const bgVideo = document.createElement("video");
bgVideo.loop = true;
bgVideo.muted = true;
bgVideo.playsInline = true;
bgVideo.crossOrigin = "anonymous";

function populateSelectFromList(list) {
  const bgMediaSelect = $("#bgMediaSelect");
  const bgMediaHint = $("#bgMediaHint");
  if (!bgMediaSelect || !bgMediaHint) {
    console.warn("populateSelectFromList: Elements not found", { bgMediaSelect: !!bgMediaSelect, bgMediaHint: !!bgMediaHint });
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
  bgMediaHint.textContent = `Available: ${bgMediaList.length} item(s). ${
    userUploads.length ? `(${userUploads.length} from your uploads)` : ""
  }`;
  if (bgMediaSelect.value === "" || bgMediaSelect.value == null) {
    bgMediaSelect.value = "0";
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
    if (bgMediaHint) bgMediaHint.textContent = "Loaded";
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

  // Revoke old URLs
  revokeUserUploadURLs();
  userUploads = [];

  // Create new uploads
  for (const f of fileList) {
    const url = URL.createObjectURL(f);
    const isVideo = (f.type || "").startsWith("video");
    const isImage = (f.type || "").startsWith("image");
    console.log("Processing file:", f.name, "type:", f.type, "isVideo:", isVideo, "isImage:", isImage);
    if (!isVideo && !isImage) continue;

    userUploads.push({
      src: url,
      type: isVideo ? "video" : "image",
      name: `📥 ${f.name}`,
      __blobUrl: true,
    });
  }
  console.log("User uploads processed. Total:", userUploads.length);

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
  if (!bgColorField || !bgMediaField) return;
  if (backgroundMode === "color") {
    bgColorField.style.display = "block";
    bgMediaField.style.display = "none";
  } else {
    bgColorField.style.display = "none";
    bgMediaField.style.display = "block";
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
  getBgColor: () => bgColor,
  setBgColor: (color) => {
    bgColor = color;
  },
  getTextBoxColor: () => textBoxColor,
  setTextBoxColor: (color) => {
    textBoxColor = color;
  },
  getTextBoxOpacity: () => textBoxOpacity,
  setTextBoxOpacity: (opacity) => {
    textBoxOpacity = opacity;
  },
  loadBackgroundAssets,
  applyBgModeUI,
  populateSelectFromList,
  onBgMediaChange,
  handleUserUploads,
};
