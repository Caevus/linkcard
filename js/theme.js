// Theme resolution: turns an outlets.yaml Theme spec into concrete colors for the Card renderer.

const rgb = (h) => {
  h = h.replace(/^#/, "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};
const mix = (a, b, t) => a.map((v, i) => Math.round(v * (1 - t) + b[i] * t));
const lum = (c) => {
  const [r, g, b] = c.map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
export const css = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;

/** Resolve a Theme spec (see outlet-registry.js) to colors and style flags. */
export function resolveTheme(spec) {
  let weight = spec.weight;
  weight = weight === true ? "bold" : weight === false ? "regular" : String(weight).toLowerCase();
  if (!["regular", "bold", "black"].includes(weight)) weight = "bold";

  const bg = rgb(spec.background), fg = rgb(spec.text), accent = rgb(spec.accent);
  let label;
  if (spec.nameColor) {
    label = rgb(spec.nameColor); // explicit choice: used exactly as given
  } else {
    label = accent; // darken until it reads against the background
    for (let i = 0; i < 10 && contrast(label, bg) < 3; i++) label = mix(label, [0, 0, 0], 0.15);
  }
  const white = [255, 255, 255], black = [0, 0, 0];
  return {
    bg, fg, accent, label, weight,
    serif: spec.serif,
    band: spec.band,
    dark: lum(bg) < 0.2,
    onBand: contrast(white, accent) >= contrast(black, accent) ? white : black,
    muted: mix(fg, bg, 0.4),
    rule: mix(bg, fg, 0.15),
  };
}
