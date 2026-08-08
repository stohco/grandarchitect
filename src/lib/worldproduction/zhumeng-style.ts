/**
 * Zhumeng Style Pass — the art direction department's grade.
 *
 * Target reference: Zhumeng Animation (Hebei Zhumeng Culture Communication
 * Co., Ltd., 沧元图/Cang Yuan Tu donghua), Tencent Penguin Pictures, BUILD
 * DREAM — the painterly 3D donghua look the six art boards encode:
 *   - painterly hand-painted materials, believable PBR (boards)
 *   - warm key light, cool fill, strong rim separation (filmic)
 *   - muted naturalistic palette with restrained accents
 *   - soft atmospheric depth (fog) instead of harsh distance
 *
 * All values are tunable constants the style gauntlet critic can push on.
 */

export interface ZhumengStyleSettings {
  keyIntensity: number;
  keyWarmth: number;        // 0..1 mix of warm vs neutral sun
  fillCoolness: number;     // hemisphere fill strength
  rimIntensity: number;     // back-rim light strength
  rimWarmth: number;
  exposure: number;
  saturation: number;       // applied via CSS filter fallback (1 = neutral)
  vignette: number;         // 0..1
  fogDensity: number;       // 0..1 (farther = softer)
  paletteBoost: number;     // extra saturation on earthy reds/golds
}

export const ZHUMENG_STYLE: ZhumengStyleSettings = {
  keyIntensity: 2.9,
  keyWarmth: 0.9,
  fillCoolness: 0.5,
  rimIntensity: 1.3,
  rimWarmth: 0.5,
  exposure: 1.3,
  saturation: 1.06,
  vignette: 0.3,
  fogDensity: 0.75,
  paletteBoost: 0.15,
};

/** Apply the style to a renderer + scene lights; returns the rim light. */
export function applyZhumengStyle(
  renderer: { toneMappingExposure: number },
  sun: { color: { setHSL: (h: number, s: number, l: number) => void }; intensity: number },
  fill: { intensity: number },
  addRim: () => { intensity: number; color: { setHSL: (h: number, s: number, l: number) => void } },
): void {
  renderer.toneMappingExposure = ZHUMENG_STYLE.exposure;
  sun.intensity = ZHUMENG_STYLE.keyIntensity;
  // warm key: orange-gold, restrained saturation (Zhumeng muted warmth)
  sun.color.setHSL(0.08, 0.55 * ZHUMENG_STYLE.keyWarmth, 0.72);
  fill.intensity = ZHUMENG_STYLE.fillCoolness;
  const rim = addRim();
  rim.intensity = ZHUMENG_STYLE.rimIntensity;
  rim.color.setHSL(0.05, 0.6 * ZHUMENG_STYLE.rimWarmth, 0.85);
}

/** CSS style string for the viewport (vignette + saturation, donghua grade). */
export function zhumengCss(): string {
  const s = ZHUMENG_STYLE;
  const vig = `radial-gradient(ellipse at center, rgba(0,0,0,0) 62%, rgba(10,6,2,${s.vignette}) 100%)`;
  const sat = s.saturation !== 1 ? `saturate(${s.saturation * 100}%)` : 'none';
  return `filter:${sat};`;
}

export const ZHUMENG_STYLE_REFERENCE = [
  'painterly 3D render, hand-painted materials, believable PBR',
  'warm key light with cool fill; strong rim separation on characters',
  'muted naturalistic palette (ethereal teals, forest greens, gold lantern accents, deep red sparingly)',
  'soft atmospheric depth; gentle vignette; filmic exposure',
  'chunky readable silhouettes; grounded 1.8 m proportions',
  'Zhumeng Animation 3D donghua direction: dynamic camera, filmic cuts, restrained supernatural color',
].join('; ');
