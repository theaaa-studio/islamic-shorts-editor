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

function drawPreview() {
  const previewCanvas = $("#previewCanvas");
  if (!previewCanvas) return;
  const pctx = previewCanvas.getContext("2d");
  const W = previewCanvas.width,
    H = previewCanvas.height;

  // Access global variables from app.js via window
  const currentText =
    window.currentText || "Centered translation will appear here.";
  const currentLabel = window.currentLabel || "—";
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
      // Check if video has loaded enough data and is playing
      if (bgVideo.readyState >= 2 && bgVideo.videoWidth > 0) {
        // Ensure video is playing
        if (bgVideo.paused) {
          bgVideo.play().catch(() => {});
        }
        drew = drawMediaCover(pctx, bgVideo, W, H);
      } else if (bgVideo.src && bgVideo.src !== "") {
        // Video is loading, show background color as fallback
        pctx.fillStyle = bgCol;
        pctx.fillRect(0, 0, W, H);
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
  pctx.font = `600 ${Math.max(30, Math.round(36 * scale))}px ${selectedFont}`;
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
    pctx.font = `600 28px ${selectedFont}`;
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
    pctx.font = `600 28px ${selectedFont}`;
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
    pctx.font = `600 28px ${selectedFont}`;
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
      by - th - badgePadY - 46,
      tw + badgePadX * 2,
      th + badgePadY * 2,
      badgeRadius
    );
    pctx.fill();
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
