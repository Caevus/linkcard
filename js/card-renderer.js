// Card renderer: draws the 1200x630 Card onto a canvas from article details and a resolved Theme.
import { css } from "./theme.js";

export const W = 1200, H = 630, PAD = 72;
const SERIF = 'Georgia, "Times New Roman", serif';
const SANS = 'Arial, Helvetica, sans-serif';
const WEIGHT = { regular: 400, bold: 700, black: 900 };

function wrap(ctx, text, maxW) {
  const lines = [];
  let line = "";
  const fits = (s) => ctx.measureText(s).width <= maxW;
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const trial = line ? `${line} ${word}` : word;
    if (fits(trial)) { line = trial; continue; }
    if (line) lines.push(line);
    line = word;
    // a word wider than a whole line: break it by characters
    while (!fits(line) && [...line].length > 1) {
      const chars = [...line];
      let n = chars.length - 1;
      while (n > 1 && !fits(chars.slice(0, n).join(""))) n--;
      lines.push(chars.slice(0, n).join(""));
      line = chars.slice(n).join("");
    }
  }
  if (line) lines.push(line);
  return lines;
}

const imageCache = new Map();

/** Load an image (cached per src, failures included); resolves null on any failure. Cross-origin requests are anonymous so the canvas stays exportable. */
function loadImage(src) {
  if (!src) return Promise.resolve(null);
  if (!imageCache.has(src)) imageCache.set(src, fetchImage(src));
  return imageCache.get(src);
}

function fetchImage(src) {
  return new Promise((done) => {
    if (!src) return done(null);
    const img = new Image();
    if (!src.startsWith("data:")) img.crossOrigin = "anonymous";
    img.onload = () => done(img.naturalWidth ? img : null);
    img.onerror = () => done(null);
    try { img.src = new URL(src, document.baseURI).href; } catch { done(null); }
  });
}

const fit = (img, maxW, maxH) => {
  const s = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight);
  return [Math.max(1, Math.round(img.naturalWidth * s)), Math.max(1, Math.round(img.naturalHeight * s))];
};

/**
 * Draws the Card. Async because logo and icon images load first.
 * @param {HTMLCanvasElement} canvas
 * @param {{headline:string, outlet:string, date:string, domain:string, icon?:string|null}} article
 * @param {ReturnType<import("./theme.js").resolveTheme>} t
 * @param {string|null} [logo] configured logo: repo-relative path or image link
 */
export async function renderCard(canvas, { headline, outlet, date, domain, icon }, t, logo = null) {
  const logoImg = await loadImage(logo);
  const iconImg = logoImg ? null : await loadImage(icon);
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = css(t.bg);
  ctx.fillRect(0, 0, W, H);

  // header: Band or Stripe, then the Outlet name
  ctx.fillStyle = css(t.accent);
  let cy;
  if (t.band) {
    ctx.fillRect(0, 0, W, 104);
    cy = 52;
  } else {
    ctx.fillRect(0, 0, 18, H);
    cy = 90;
  }
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  let nameX = PAD;
  if (logoImg) {
    // configured logo: drawn directly, no chip
    const [w, h] = fit(logoImg, 460, 52);
    ctx.drawImage(logoImg, PAD, cy - Math.floor(h / 2), w, h);
  } else {
    if (iconImg) {
      const [w, h] = fit(iconImg, 52, 52);
      const top = cy - Math.floor(h / 2);
      let x = PAD;
      if (t.band || t.dark) {
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.roundRect(x, top - 10, w + 20, h + 20, 12);
        ctx.fill();
        x += 10;
      }
      ctx.drawImage(iconImg, x, top, w, h);
      nameX = x + w + (t.band || t.dark ? 10 : 0) + 18;
    }
    ctx.fillStyle = css(t.band ? t.onBand : t.label);
    ctx.font = `700 30px ${SANS}`;
    ctx.fillText((outlet || "").toUpperCase(), nameX, cy);
  }

  // headline: shrink from 68 in steps of 2 until at most five lines fit
  const family = t.serif ? SERIF : SANS;
  const maxW = W - PAD * 2 - 6, maxH = 340;
  let lines = [], lineH = 0;
  for (let size = 68; size > 30; size -= 2) {
    ctx.font = `${WEIGHT[t.weight]} ${size}px ${family}`;
    lines = wrap(ctx, headline || "", maxW);
    lineH = Math.floor(size * 1.25);
    if (lines.length <= 5 && lines.length * lineH <= maxH) break;
  }
  ctx.fillStyle = css(t.fg);
  ctx.textBaseline = "top";
  let y = 150;
  for (const ln of lines) {
    ctx.fillText(ln, PAD, y);
    y += lineH;
  }

  // footer: date left, domain right
  ctx.fillStyle = css(t.rule);
  ctx.fillRect(PAD, H - 101, W - PAD * 2, 2);
  ctx.fillStyle = css(t.muted);
  ctx.font = `400 26px ${SANS}`;
  ctx.fillText(date || "", PAD, H - 72);
  ctx.textAlign = "right";
  ctx.fillText(domain || "", W - PAD, H - 72);
  ctx.textAlign = "left";
}
