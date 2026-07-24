/**
 * Derives the three platform icon assets from assets/studiq_logo.png.
 *
 * Run once (sharp installed with --no-save):  node scripts/generate-icons.mjs
 *
 * Why three different files:
 *  - icon.png          iOS. Must be OPAQUE (no alpha) or the App Store rejects it.
 *                      Corners stay square; iOS applies its own mask.
 *  - adaptive-icon.png Android foreground. TRANSPARENT, and the artwork must sit
 *                      inside the central ~66% "safe zone" — launchers mask the
 *                      rest away (circle / squircle / rounded square).
 *  - splash.png        Transparent logo; app.json fills the rest with
 *                      backgroundColor and uses resizeMode "contain".
 *
 * studiq_logo.png is left untouched: the app renders it in-app (Welcome, Splash,
 * Lock screens) and those layouts expect the current framing.
 */
import sharp from 'sharp';

const SRC = 'assets/studiq_logo.png';
const CANVAS = 1024;

// Logo height as a share of the canvas, per platform.
const TARGETS = [
  // 0.50 keeps the logo's diagonal comfortably inside Android's safe circle;
  // 0.55 landed within 4px of the edge, which any launcher mask would graze.
  { out: 'assets/adaptive-icon.png', heightRatio: 0.5, opaque: false },
  { out: 'assets/icon.png', heightRatio: 0.64, opaque: true },
  { out: 'assets/splash.png', heightRatio: 0.46, opaque: false },
];

// Crop away the uniform border so scaling is relative to the artwork itself,
// not to whatever padding the source happened to have.
const artwork = await sharp(SRC).trim().toBuffer();
const { width: aw, height: ah } = await sharp(artwork).metadata();
console.log(`artwork recortado: ${aw}x${ah}`);

for (const { out, heightRatio, opaque } of TARGETS) {
  const target = Math.round(CANVAS * heightRatio);
  const scaled = await sharp(artwork).resize({ height: target, fit: 'inside' }).toBuffer();
  const { width: sw, height: sh } = await sharp(scaled).metadata();

  let img = sharp({
    create: {
      width: CANVAS,
      height: CANVAS,
      channels: 4,
      background: opaque ? { r: 255, g: 255, b: 255, alpha: 1 } : { r: 0, g: 0, b: 0, alpha: 0 },
    },
  }).composite([
    { input: scaled, top: Math.round((CANVAS - sh) / 2), left: Math.round((CANVAS - sw) / 2) },
  ]);

  // flatten() composites onto white; removeAlpha() actually strips the channel,
  // which is what the App Store checks for.
  if (opaque) img = img.flatten({ background: '#ffffff' }).removeAlpha();

  await img.png().toFile(out);

  const check = await sharp(out).metadata();
  console.log(`${out}: ${check.width}x${check.height} logo=${sw}x${sh} alfa=${check.hasAlpha}`);
}

// Sanity: the Android artwork must fit the safe circle (diameter 66% of canvas).
const advH = Math.round(CANVAS * 0.5);
const advW = Math.round((aw / ah) * advH);
const diagonal = Math.round(Math.hypot(advW, advH));
const safeDiameter = Math.round(CANVAS * 0.66);
console.log(
  `\nzona segura Android: diagonal del logo ${diagonal}px vs círculo ${safeDiameter}px -> ` +
    (diagonal <= safeDiameter ? 'OK' : 'SE RECORTARÁ')
);
