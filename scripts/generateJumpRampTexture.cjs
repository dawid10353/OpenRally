const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function generateJumpRampTexture() {
  const width = 1024;
  const height = 1024;

  // Build high-res SVG
  let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Steel diamond plate pattern -->
    <pattern id="diamondPlate" width="32" height="32" patternUnits="userSpaceOnUse">
      <rect width="32" height="32" fill="#232832" />
      <!-- Diamond tread 1 -->
      <polygon points="16,6 22,16 16,26 10,16" fill="#323846" />
      <polygon points="16,8 20,16 16,24 12,16" fill="#3d4556" />
      <!-- Corner diamond tread 2 -->
      <polygon points="0,0 4,5 0,10 -4,5" fill="#323846" />
      <polygon points="32,0 36,5 32,10 28,5" fill="#323846" />
      <polygon points="0,32 4,37 0,42 -4,37" fill="#323846" />
      <polygon points="32,32 36,37 32,42 28,37" fill="#323846" />
      <!-- Steel micro-noise line -->
      <line x1="0" y1="16" x2="32" y2="16" stroke="#1c2027" stroke-width="0.75" />
    </pattern>

    <!-- Hazard caution stripes pattern (Left) -->
    <pattern id="hazardStripesL" width="40" height="40" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
      <rect width="20" height="40" fill="#f59e0b" />
      <rect x="20" width="20" height="40" fill="#111827" />
    </pattern>

    <!-- Hazard caution stripes pattern (Right) -->
    <pattern id="hazardStripesR" width="40" height="40" patternTransform="rotate(-45)" patternUnits="userSpaceOnUse">
      <rect width="20" height="40" fill="#f59e0b" />
      <rect x="20" width="20" height="40" fill="#111827" />
    </pattern>

    <!-- Top lip checker pattern -->
    <pattern id="lipChecker" width="40" height="40" patternUnits="userSpaceOnUse">
      <rect width="20" height="20" fill="#dc2626" />
      <rect x="20" y="20" width="20" height="20" fill="#dc2626" />
      <rect x="20" width="20" height="20" fill="#f8fafc" />
      <rect y="20" width="20" height="20" fill="#f8fafc" />
    </pattern>

    <!-- Linear metallic gradients -->
    <linearGradient id="metallicSheen" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.12" />
      <stop offset="25%" stop-color="#000000" stop-opacity="0.05" />
      <stop offset="85%" stop-color="#000000" stop-opacity="0.25" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0.45" />
    </linearGradient>

    <!-- Arrow glow -->
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="4" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- 1. Base diamond steel plate -->
  <rect width="${width}" height="${height}" fill="url(#diamondPlate)" />

  <!-- 2. Subtle metallic vertical depth gradient -->
  <rect width="${width}" height="${height}" fill="url(#metallicSheen)" />

  <!-- 3. Left hazard stripe boundary (width: 120px) -->
  <rect x="0" y="0" width="120" height="${height}" fill="url(#hazardStripesL)" />
  <rect x="116" y="0" width="8" height="${height}" fill="#facc15" />
  <rect x="124" y="0" width="2" height="${height}" fill="#0f172a" />

  <!-- 4. Right hazard stripe boundary (width: 120px) -->
  <rect x="${width - 120}" y="0" width="120" height="${height}" fill="url(#hazardStripesR)" />
  <rect x="${width - 124}" y="0" width="8" height="${height}" fill="#facc15" />
  <rect x="${width - 126}" y="0" width="2" height="${height}" fill="#0f172a" />

  <!-- 5. Bottom entry transition wedge plate (Y = 960 to 1024) -->
  <rect x="126" y="974" width="${width - 252}" height="50" fill="#1e222a" />
  <line x1="126" y1="974" x2="${width - 126}" y2="974" stroke="#475569" stroke-width="3" />
  <line x1="126" y1="1022" x2="${width - 126}" y2="1022" stroke="#0f172a" stroke-width="4" />

  <!-- Bottom transition bevel rivets -->
`;

  // Place rivets along bottom and sides
  for (let x = 150; x < width - 150; x += 45) {
    svg += `  <circle cx="${x}" cy="998" r="4.5" fill="#475569" />
  <circle cx="${x - 1}" cy="997" r="3.5" fill="#94a3b8" />
  <circle cx="${x}" cy="998" r="2.5" fill="#1e293b" />\n`;
  }

  // Left & right border rivets
  for (let y = 30; y < height - 30; y += 50) {
    svg += `  <circle cx="120" cy="${y}" r="3.5" fill="#0f172a" />
  <circle cx="${width - 120}" cy="${y}" r="3.5" fill="#0f172a" />\n`;
  }

  // 6. Top launch lip caution header (Y = 0 to 60)
  svg += `
  <!-- Top lip red/white motorsport checkers -->
  <rect x="0" y="0" width="${width}" height="45" fill="url(#lipChecker)" />
  <rect x="0" y="45" width="${width}" height="10" fill="#facc15" />
  <line x1="0" y1="55" x2="${width}" y2="55" stroke="#000000" stroke-width="2" />
`;

  // 7. High-visibility launch chevrons pointing UP (toward the lip)
  const chevronsY = [780, 580, 380, 180];
  for (let i = 0; i < chevronsY.length; i++) {
    const y = chevronsY[i];
    const w = 180 - i * 10;
    const h = 55;
    const thickness = 26;

    // Chevron points UP (tip at y - h, bottom at y)
    svg += `
  <!-- Chevron ${i + 1} -->
  <g filter="url(#glow)">
    <!-- Shadow -->
    <polygon points="
      ${512},${y - h + 4}
      ${512 + w},${y + 4}
      ${512 + w - thickness},${y + 4}
      ${512},${y - h + thickness + 4}
      ${512 - w + thickness},${y + 4}
      ${512 - w},${y + 4}
    " fill="rgba(0,0,0,0.6)" />

    <!-- Main Yellow Chevron -->
    <polygon points="
      ${512},${y - h}
      ${512 + w},${y}
      ${512 + w - thickness},${y}
      ${512},${y - h + thickness}
      ${512 - w + thickness},${y}
      ${512 - w},${y}
    " fill="#facc15" stroke="#eab308" stroke-width="2" />

    <!-- Inner Orange Core Stripe -->
    <polygon points="
      ${512},${y - h + 6}
      ${512 + w - 12},${y - 2}
      ${512 + w - thickness + 4},${y - 2}
      ${512},${y - h + thickness - 6}
      ${512 - w + thickness - 4},${y - 2}
      ${512 - w + 12},${y - 2}
    " fill="#f97316" />
  </g>
`;
  }

  // 8. Central track tire skid marks (burnout rubber marks going up the ramp)
  svg += `
  <g opacity="0.32">
    <!-- Left wheel rubber marks -->
    <path d="M 380 1024 C 385 800, 375 400, 382 55" stroke="#05080e" stroke-width="32" stroke-linecap="round" fill="none" />
    <path d="M 380 1024 C 385 800, 375 400, 382 55" stroke="#000000" stroke-width="18" stroke-dasharray="120 40 80 50" fill="none" />

    <!-- Right wheel rubber marks -->
    <path d="M 644 1024 C 639 800, 649 400, 642 55" stroke="#05080e" stroke-width="32" stroke-linecap="round" fill="none" />
    <path d="M 644 1024 C 639 800, 649 400, 642 55" stroke="#000000" stroke-width="18" stroke-dasharray="90 30 140 60" fill="none" />
  </g>
`;

  // 9. Authentic typography: "LAUNCH", "APEX GYMKHANA"
  svg += `
  <!-- Stencil text on bottom deck -->
  <text x="512" y="930" font-family="'Impact', 'Arial Black', sans-serif" font-size="34" font-weight="900" fill="#64748b" opacity="0.65" text-anchor="middle" letter-spacing="8">
    APEX RAMP • 15°
  </text>
  <text x="512" y="270" font-family="'Impact', 'Arial Black', sans-serif" font-size="28" font-weight="900" fill="#e2e8f0" opacity="0.55" text-anchor="middle" letter-spacing="12">
    MAX LAUNCH
  </text>
`;

  svg += `</svg>`;

  const outDir = path.resolve(__dirname, '../public/textures/props');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outPath = path.join(outDir, 'jump_ramp_diffuse.png');
  await sharp(Buffer.from(svg))
    .png({ compressionLevel: 9, quality: 90 })
    .toFile(outPath);

  console.log(`Generated jump ramp texture at: ${outPath}`);
}

generateJumpRampTexture().catch((err) => {
  console.error('Error generating texture:', err);
  process.exit(1);
});
