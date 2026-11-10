// Card renderer: draws the 1200x630 Card onto a canvas from article details and a resolved Theme.
import { css } from "./theme.js";

export const W = 1200, H = 630, PAD = 72;
const SERIF = 'Georgia, "Times New Roman", serif';
const SANS = 'Arial, Helvetica, sans-serif';
const WEIGHT = { regular: 400, bold: 700, black: 900 };

function wrap(ctx, text, maxW) {
  const lines = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const trial = line ? `${line} ${word}` : word;
    if (ctx.measureText(trial).width <= maxW) {
      line = trial;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{headline:string, outlet:string, date:string, domain:string}} article
 * @param {ReturnType<import("./theme.js").resolveTheme>} t
 */
export function renderCard(canvas, { headline, outlet, date, domain }, t) {
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
  ctx.fillStyle = css(t.band ? t.onBand : t.label);
  ctx.font = `700 30px ${SANS}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillText((outlet || "").toUpperCase(), PAD, cy);

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
