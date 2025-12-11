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
    if (totalH <= maxH) return { fontSize: size, lines, lineHeight: lineH };
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

// ------------------ Double Buffering System for Video ------------------
let videoOffscreenCanvas = null;
let videoOffscreenCtx = null;
let lastVideoFrameValid = false;
let videoBufferInitialized = false;

function initVideoBuffer(width, height) {
  try {
    // Use OffscreenCanvas if available (better performance)
    if (typeof OffscreenCanvas !== 'undefined') {
      videoOffscreenCanvas = new OffscreenCanvas(width, height);
      videoOffscreenCtx = videoOffscreenCanvas.getContext('2d', { 
        alpha: false,
        desynchronized: true // Better performance for animations
      });
    } else {
      // Fallback to regular canvas
      videoOffscreenCanvas = document.createElement('canvas');
      videoOffscreenCanvas.width = width;
      videoOffscreenCanvas.height = height;
      videoOffscreenCtx = videoOffscreenCanvas.getContext('2d', { alpha: false });
    }
    videoBufferInitialized = true;
    lastVideoFrameValid = false;
  } catch (e) {
    console.warn('Failed to create offscreen canvas:', e);
    videoBufferInitialized = false;
  }
}

function updateVideoBuffer(bgVideo, W, H) {
  if (!videoBufferInitialized || !videoOffscreenCtx) {
    initVideoBuffer(W, H);
  }
  
  // Ensure buffer size matches canvas size
  if (videoOffscreenCanvas && 
      (videoOffscreenCanvas.width !== W || videoOffscreenCanvas.height !== H)) {
    videoOffscreenCanvas.width = W;
    videoOffscreenCanvas.height = H;
  }
  
  // Try to capture current video frame
  if (bgVideo.readyState >= 2 && bgVideo.videoWidth > 0) {
    try {
      const success = drawMediaCover(videoOffscreenCtx, bgVideo, W, H);
      if (success) {
        lastVideoFrameValid = true;
        return true;
      }
    } catch (e) {
      console.warn('Failed to update video buffer:', e);
    }
  }
  
  return false;
}

function drawBufferedVideo(ctx, W, H) {
  if (lastVideoFrameValid && videoOffscreenCanvas) {
    try {
      ctx.drawImage(videoOffscreenCanvas, 0, 0, W, H);
      return true;
    } catch (e) {
      console.warn('Failed to draw buffered video:', e);
    }
  }
  return false;
}

function resetVideoBuffer() {
  lastVideoFrameValid = false;
  videoBufferInitialized = false;
  videoOffscreenCanvas = null;
  videoOffscreenCtx = null;
}

// Export buffer reset for when video changes
window.resetVideoBuffer = resetVideoBuffer;

function drawPreview() {
  const previewCanvas = window.previewCanvas || $("#previewCanvas");
  if (!previewCanvas) return;
  const pctx = window.pctx || previewCanvas.getContext("2d");
  if (!pctx) return;
  const W = previewCanvas.width,
    H = previewCanvas.height;

  // Access global variables from app.js via window
  const currentText =
    window.currentText || "In the name of Allah, the Most Gracious, the Most Merciful";
  const currentLabel = window.currentLabel || "Al-Fatiha 1:1";
  const selectedFont = window.selectedFont || "Inter, sans-serif";
  const sizePercent = window.sizePercent || 100;
  const fontColor = window.fontColor || "#111111";
  const showCreditCreator =
    window.showCreditCreator !== undefined ? window.showCreditCreator : true;
  const showCreditData =
    window.showCreditData !== undefined ? window.showCreditData : true;
  const madeByInput = $("#madeByInput");
  const creditMadeByChk = $("#creditMadeBy");

  // Background
  const bgMode = window.backgroundModule.getBackgroundMode();
  const bgCol = window.backgroundModule.getBgColor();
  const selBg = window.backgroundModule.selectedBg;
  const bgImg = window.backgroundModule.bgImg;
  const bgVideo = window.backgroundModule.bgVideo;

  if (bgMode === "media" && selBg) {
    let drew = false;
    if (selBg.type === "image") {
      // Check if image is loaded
      if (bgImg.complete && bgImg.naturalWidth > 0) {
        drew = drawMediaCover(pctx, bgImg, W, H);
      } else if (bgImg.src && bgImg.src !== "") {
        // Image is loading, show background color as fallback
        pctx.fillStyle = bgCol;
        pctx.fillRect(0, 0, W, H);
      }
    } else if (selBg.type === "video") {
      // Use double buffering for smooth video playback
      // First, try to update the buffer with the latest frame
      const bufferUpdated = updateVideoBuffer(bgVideo, W, H);
      
      // Then draw from the buffer (will use last valid frame during transitions)
      drew = drawBufferedVideo(pctx, W, H);
      
      // If we've never drawn a valid frame, show fallback
      if (!drew && !lastVideoFrameValid) {
        pctx.fillStyle = bgCol;
        pctx.fillRect(0, 0, W, H);
      }
      
      // Ensure video is playing
      if (bgVideo.paused && bgVideo.src) {
        bgVideo.play().catch(() => {});
      }
    }
    if (!drew && (!selBg.type || (!bgImg.src && !bgVideo.src))) {
      pctx.fillStyle = bgCol;
      pctx.fillRect(0, 0, W, H);
    }
  } else {
    pctx.fillStyle = bgCol;
    pctx.fillRect(0, 0, W, H);
  }

  // Text
  // Text
  const marginX = 90,
    marginY = 180;
  const usableW = W - 2 * marginX,
    usableH = H - 2 * marginY;
  const scale = (sizePercent || 100) / 100;
  const arabicScale = (window.arabicSizePercent || 100) / 100;

  const currentArabic = (window.showArabicText !== false) ? (window.currentArabicText || "") : "";

  if (currentArabic) {
    // Split space: We want the ENTIRE GROUP (Arabic + Translation) CENTERED vertically.
    
    // --- 1. Calculate Layouts (Measure first, position later) ---
    
    // Translation Layout
    const translationMaxH = usableH * 0.6; 
    const transSpec = fitTextToBox(
      pctx,
      currentText,
      usableW,
      translationMaxH,
      72 * scale,
      34 * scale,
      1.25,
      selectedFont,
      700
    );
    const transTotalH = transSpec.lines.length * transSpec.lineHeight;

    // Arabic Layout
    const arabicMaxH = usableH * 0.35;
    const arabicFont = window.selectedArabicFont || "Amiri, serif";
    const arabicSpec = fitTextToBox(
      pctx,
      currentArabic,
      usableW,
      arabicMaxH,
      80 * arabicScale,
      34 * arabicScale,
      1.6, // Higher line-height for Arabic
      arabicFont,
      700
    );
    const arabicTotalH = arabicSpec.lines.length * arabicSpec.lineHeight;

    // --- 2. Calculate Vertical Positioning (Visual Centering) ---
    const gap = 40 * scale; 
    
    // Initial "Line Box" positioning (just to establish relative positions)
    // We'll treat y=0 as the top of the Arabic line box for now.
    const arabicLineBoxH = arabicSpec.lines.length * arabicSpec.lineHeight;
    const transLineBoxH = transSpec.lines.length * transSpec.lineHeight;
    
    // Relative Y positions (assuming top of Arabic block is 0)
    // Arabic is at top.
    const relArabicY = arabicSpec.lineHeight / 2;
    
    // Translation is below Arabic + Gap
    const relTransTop = arabicLineBoxH + gap;
    const relTransY = relTransTop + transSpec.lineHeight / 2;
    
    // --- Measure Visual Extents (Ink) ---
    // We need to know where the ink actually starts and ends relative to these Ys.
    
    // Measure Arabic Top (First Line)
    pctx.font = `700 ${arabicSpec.fontSize}px ${arabicFont}`;
    pctx.textBaseline = "middle";
    const firstArLine = arabicSpec.lines[0];
    const metricsAr = pctx.measureText(firstArLine);
    const arAscent = metricsAr.actualBoundingBoxAscent; // Dist from middle to top of ink
    
    // Measure Translation Bottom (Last Line)
    pctx.font = `700 ${transSpec.fontSize}px ${selectedFont}`;
    const lastTransLine = transSpec.lines[transSpec.lines.length - 1];
    const metricsTr = pctx.measureText(lastTransLine);
    const trDescent = metricsTr.actualBoundingBoxDescent; // Dist from middle to bottom of ink
    
    // Calculate Visual Bounds relative to top of Arabic Block (y=0)
    // Top of ink = relArabicY - arAscent
    const relInkTop = relArabicY - arAscent;
    
    // Bottom of ink = (relTransTop + (lines-1)*lh + lh/2) + trDescent
    // Actually, let's just get the Y of the last line.
    const relTransLastLineY = relTransTop + (transSpec.lines.length - 1) * transSpec.lineHeight + transSpec.lineHeight / 2;
    const relInkBottom = relTransLastLineY + trDescent;
    
    const totalVisualH = relInkBottom - relInkTop;
    
    // --- Center on Screen (including label) ---
    const labelGap = 30;
    const labelHeight = 36;
    const totalGroupH = totalVisualH + labelGap + labelHeight;
    const screenGroupTop = (H - totalGroupH) / 2;
    
    // Calculate the offset to apply to our relative coordinates
    const yOffset = screenGroupTop - relInkTop;
    
    // Final Y positions
    let arabicY = relArabicY + yOffset;
    let transY = relTransY + yOffset;

    // --- Draw Background Box ---
    // Calculate max width
    let maxLineWidth = 0;
    
    // Measure Arabic lines width
    pctx.font = `700 ${arabicSpec.fontSize}px ${arabicFont}`;
    arabicSpec.lines.forEach(line => {
        const w = pctx.measureText(line).width;
        if (w > maxLineWidth) maxLineWidth = w;
    });

    // Measure Translation lines width
    pctx.font = `700 ${transSpec.fontSize}px ${selectedFont}`;
    transSpec.lines.forEach(line => {
        const w = pctx.measureText(line).width;
        if (w > maxLineWidth) maxLineWidth = w;
    });

    // Measure label width
    pctx.font = `600 36px ${selectedFont}`;
    const labelW = pctx.measureText(currentLabel).width;
    if (labelW > maxLineWidth) maxLineWidth = labelW;

    const boxPadX = 50 * scale;
    const boxPadY = 50 * scale;
    const boxW = maxLineWidth + boxPadX * 2;
    
    // Box dimensions including label
    const boxTop = screenGroupTop - boxPadY;
    const boxH = totalGroupH + boxPadY * 2;
    
    pctx.save();
    pctx.globalAlpha = window.backgroundModule.getTextBoxOpacity() !== undefined 
      ? window.backgroundModule.getTextBoxOpacity() 
      : 0.12;
    pctx.fillStyle = window.backgroundModule.getTextBoxColor() || "#000";
    drawRoundedRect(
        pctx,
        (W - boxW) / 2, // Center horizontally
        boxTop,
        boxW,
        boxH,
        20 // Radius
    );
    pctx.fill();
    pctx.restore();

    // --- Draw Arabic ---
    pctx.fillStyle = window.arabicFontColor || fontColor;
    pctx.textAlign = "center";
    pctx.textBaseline = "middle";
    pctx.font = `700 ${arabicSpec.fontSize}px ${arabicFont}`;
    
    pctx.save();
    pctx.shadowColor = "rgba(0,0,0,0.14)";
    pctx.shadowBlur = 8;
    arabicSpec.lines.forEach((ln, i) => {
      pctx.fillText(ln, W / 2, arabicY + i * arabicSpec.lineHeight);
    });
    pctx.restore();

    // --- Draw Translation ---
    pctx.fillStyle = fontColor;
    pctx.font = `700 ${transSpec.fontSize}px ${selectedFont}`;
    
    pctx.save();
    pctx.shadowColor = "rgba(0,0,0,0.14)";
    pctx.shadowBlur = 8;
    transSpec.lines.forEach((ln, i) => {
      pctx.fillText(ln, W / 2, transY + i * transSpec.lineHeight);
    });
    pctx.restore();

    // --- Draw Label (Ayah Number) inside box ---
    const absInkBottom = relInkBottom + yOffset;
    const labelY = absInkBottom + labelGap + (labelHeight / 2);
    
    pctx.font = `600 36px ${selectedFont}`;
    pctx.fillStyle = fontColor;
    pctx.textAlign = "center";
    pctx.textBaseline = "middle";
    pctx.fillText(currentLabel, W / 2, labelY);

  } else {
    // Original single-text logic
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

    // --- Calculate dimensions for background box ---
    const labelHeight = 36;
    const labelGap = 30;
    const boxPadX = 50 * scale;
    const boxPadY = 50 * scale;
    
    // Measure max line width including label
    pctx.font = `700 ${fontSize}px ${selectedFont}`;
    let maxLineWidth = 0;
    lines.forEach(line => {
      const w = pctx.measureText(line).width;
      if (w > maxLineWidth) maxLineWidth = w;
    });
    
    // Measure label width
    pctx.font = `600 36px ${selectedFont}`;
    const labelW = pctx.measureText(currentLabel).width;
    if (labelW > maxLineWidth) maxLineWidth = labelW;
    
    const boxW = maxLineWidth + boxPadX * 2;
    const totalH = lines.length * lineHeight;
    const totalGroupH = totalH + labelGap + labelHeight;
    
    // Center the entire group (text + label)
    let startY = (H - totalGroupH) / 2;
    
    // --- Draw Background Box ---
    pctx.save();
    pctx.globalAlpha = window.backgroundModule.getTextBoxOpacity() !== undefined 
      ? window.backgroundModule.getTextBoxOpacity() 
      : 0.12;
    pctx.fillStyle = window.backgroundModule.getTextBoxColor() || "#000";
    drawRoundedRect(
      pctx,
      (W - boxW) / 2,
      startY - boxPadY,
      boxW,
      totalGroupH + boxPadY * 2,
      20
    );
    pctx.fill();
    pctx.restore();

    // --- Draw Text ---
    pctx.fillStyle = fontColor;
    pctx.textAlign = "center";
    pctx.textBaseline = "middle";
    pctx.font = `700 ${fontSize}px ${selectedFont}`;
    pctx.save();
    pctx.shadowColor = "rgba(0,0,0,0.14)";
    pctx.shadowBlur = 8;
    lines.forEach((ln, i) =>
      pctx.fillText(ln, W / 2, startY + lineHeight / 2 + i * lineHeight)
    );
    pctx.restore();

    // --- Draw Label (Ayah Number) inside box ---
    const labelY = startY + totalH + labelGap + (labelHeight / 2);
    
    pctx.font = `600 36px ${selectedFont}`;
    pctx.fillStyle = fontColor;
    pctx.textAlign = "center";
    pctx.textBaseline = "middle";
    pctx.fillText(currentLabel, W / 2, labelY);
  }

  // Bottom label (Removed)
  // pctx.font = `600 ${Math.max(30, Math.round(36 * scale))}px ${selectedFont}`;
  // pctx.fillStyle = fontColor;
  // pctx.textAlign = "right";
  // pctx.fillText(currentLabel, W - 40, H - 60);

  // Credits
  const badgePadX = 14,
    badgePadY = 10,
    badgeRadius = 14;
  pctx.textAlign = "left";
  pctx.textBaseline = "alphabetic";
  const creditTextColor = window.creditColor || fontColor;

// Load logo image
const logoImg = new Image();
logoImg.src = 'assets/quran.png';

// ... (rest of the file)

  // Always draw the logo
  const logoSize = 56;
  const logoPad = 10;
  const th = 30;
  const bx = 40,
    by = 80;
  
  // Draw Logo (always visible)
  if (logoImg.complete && logoImg.naturalWidth > 0) {
      const rectY = by - th - badgePadY + 6;
      const rectH = th + badgePadY * 2;
      const centerY = rectY + rectH / 2;
      pctx.drawImage(logoImg, bx, centerY - logoSize / 2, logoSize, logoSize);
  }

  // Draw " by TheAAA" text only if showCreditCreator is true
  if (showCreditCreator) {
    const txt = " by TheAAA";
    pctx.font = `600 36px ${selectedFont}`;
    pctx.fillStyle = creditTextColor;
    pctx.fillText(txt, bx + logoSize + logoPad, by);
  }

  const madeByNameNow = (madeByInput?.value || "").trim();
  const showMadeByNow = !!creditMadeByChk?.checked;
  if (showMadeByNow && madeByNameNow) {
    pctx.font = `600 28px ${selectedFont}`;
    let txt = `Made by ${madeByNameNow}`;
    const th = 30;
    const bx = W - 40,
      by = 80;
    while (pctx.measureText(txt).width > W - 120 && txt.length > 4) {
      txt = txt.slice(0, -4) + "…";
    }
    const tw = pctx.measureText(txt).width;
    pctx.save();
    // Background box removed
    pctx.restore();
    pctx.fillStyle = creditTextColor;
    pctx.textAlign = "right";
    pctx.fillText(txt, bx, by);
    pctx.textAlign = "left";
  }

  if (showCreditData) {
    // Detect if we're in Hadith editor or Quran editor
    const isHadithEditor = typeof window.hadithMetadata !== 'undefined';
    let txt = isHadithEditor 
      ? "Data: Hadith API by fawazahmed0" 
      : "Data: Quran.com & AlQuran Cloud • Audio: EveryAyah.com";
    pctx.font = `600 28px ${selectedFont}`;
    const th = 30;
    const bx = 40,
      by = H - 10;
    while (pctx.measureText(txt).width > W - 120 && txt.length > 4) {
      txt = txt.slice(0, -4) + "…";
    }
    const tw = pctx.measureText(txt).width;
    pctx.save();
    // Background box removed
    pctx.restore();
    pctx.fillStyle = creditTextColor;
    pctx.fillText(txt, bx, by - 48);
  }

  requestAnimationFrame(drawPreview);
}

// Export for use in other modules
window.drawingModule = {
  drawPreview,
  fitTextToBox,
  wrapText,
  drawRoundedRect,
  drawMediaCover,
};
