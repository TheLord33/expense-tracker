import sharp from "sharp";
import { mkdir } from "fs/promises";

// Indigo-to-purple gradient background with a white piggy bank emoji rendered
// via an SVG. We render the SVG at high resolution then downscale with sharp.

const SIZES = [192, 512];

const svg = (size) => {
  const fontSize = Math.round(size * 0.5);
  return Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#4f46e5"/>
      <stop offset="100%" stop-color="#7c3aed"/>
    </linearGradient>
    <clipPath id="round">
      <rect width="${size}" height="${size}" rx="${Math.round(size * 0.22)}" ry="${Math.round(size * 0.22)}"/>
    </clipPath>
  </defs>
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.22)}" ry="${Math.round(size * 0.22)}" fill="url(#g)"/>
  <text
    x="50%" y="54%"
    dominant-baseline="middle"
    text-anchor="middle"
    font-size="${fontSize}"
    font-family="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif"
  >💰</text>
</svg>`);
};

await mkdir("public/icons", { recursive: true });

for (const size of SIZES) {
  await sharp(svg(size), { density: 300 })
    .resize(size, size)
    .png()
    .toFile(`public/icons/icon-${size}.png`);
  console.log(`✓ public/icons/icon-${size}.png`);
}
