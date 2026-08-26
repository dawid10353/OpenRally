import {
  CanvasTexture,
  RepeatWrapping,
  SRGBColorSpace,
  Texture,
  DataTexture,
  RGBAFormat,
  UnsignedByteType,
} from 'three';

function getOrCreateCanvas(width: number, height: number): HTMLCanvasElement | null {
  if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }
  return null;
}

function createFallbackTexture(): Texture {
  const data = new Uint8Array([200, 30, 30, 255]);
  const tex = new DataTexture(data, 1, 1, RGBAFormat, UnsignedByteType);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Creates a high-definition 2048x2048 livery texture for Veloce Sport Coupe.
 * Features metallic crimson red paint, twin racing stripes, carbon accents,
 * door seams, heat extraction vents, and #07 racing decals.
 */
export function createSportCoupeLiveryTexture(): Texture {
  const canvas = getOrCreateCanvas(2048, 2048);
  if (!canvas) return createFallbackTexture();
  const ctx = canvas.getContext('2d');
  if (!ctx) return createFallbackTexture();

  // 1. Base Metallic Crimson Red Paint
  const bgGrad = ctx.createLinearGradient(0, 0, 2048, 2048);
  bgGrad.addColorStop(0, '#a50026');
  bgGrad.addColorStop(0.5, '#d73027');
  bgGrad.addColorStop(1, '#800020');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 2048, 2048);

  // 2. Central Twin Racing Stripes (White & Gold)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(940, 0, 60, 2048);
  ctx.fillRect(1048, 0, 60, 2048);

  ctx.fillStyle = '#f6bd60';
  ctx.fillRect(925, 0, 10, 2048);
  ctx.fillRect(1113, 0, 10, 2048);

  // 3. Carbon fiber roof & hood section
  ctx.fillStyle = '#141414';
  ctx.fillRect(700, 700, 648, 650);

  // Carbon weave pattern
  ctx.fillStyle = '#222222';
  for (let y = 700; y < 1350; y += 8) {
    for (let x = 700; x < 1348; x += 16) {
      ctx.fillRect(x + ((y / 8) % 2) * 8, y, 8, 4);
    }
  }

  // 4. Hood Heat Extractor Vents (Hexagonal Grille)
  ctx.fillStyle = '#0a0a0a';
  ctx.beginPath();
  ctx.roundRect(800, 300, 140, 220, 16);
  ctx.roundRect(1108, 300, 140, 220, 16);
  ctx.fill();

  ctx.strokeStyle = '#333333';
  ctx.lineWidth = 4;
  ctx.stroke();

  // 5. Side Door Decal Panels & #07 Racing Number Badge
  // Left door badge
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(450, 1024, 180, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 12;
  ctx.strokeStyle = '#141414';
  ctx.stroke();

  ctx.fillStyle = '#141414';
  ctx.font = '900 190px Arial Black, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('07', 450, 1030);

  // Right door badge
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(1598, 1024, 180, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 12;
  ctx.strokeStyle = '#141414';
  ctx.stroke();

  ctx.fillStyle = '#141414';
  ctx.fillText('07', 1598, 1030);

  // 6. Sponsor Lettering & Logos
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 72px Impact, sans-serif';
  ctx.fillText('VELOCE SPORT', 450, 800);
  ctx.fillText('VELOCE SPORT', 1598, 800);

  ctx.fillStyle = '#f6bd60';
  ctx.font = 'bold 36px Arial, sans-serif';
  ctx.fillText('RWD DRIFT SPEC • COMPETIZIONE', 450, 1260);
  ctx.fillText('RWD DRIFT SPEC • COMPETIZIONE', 1598, 1260);

  // 7. Panel Seams and Door Lines
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(250, 600);
  ctx.lineTo(250, 1450);
  ctx.lineTo(650, 1450);
  ctx.moveTo(1798, 600);
  ctx.lineTo(1798, 1450);
  ctx.lineTo(1398, 1450);
  ctx.stroke();

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Creates a high-definition 2048x2048 livery texture for Baja Dune Runner.
 * Features matte desert camouflage, Dakar/Baja sponsor graphics,
 * diamond plate flatbed texture, and #42 offroad decals.
 */
export function createBajaTruckLiveryTexture(): Texture {
  const canvas = getOrCreateCanvas(2048, 2048);
  if (!canvas) return createFallbackTexture();
  const ctx = canvas.getContext('2d');
  if (!ctx) return createFallbackTexture();

  // 1. Base Sand Ochre Desert Color
  ctx.fillStyle = '#c59b6d';
  ctx.fillRect(0, 0, 2048, 2048);

  // 2. Multi-color Matte Camo Blotches (Olive, Charcoal, Terracotta)
  const camoColors = ['#4a5743', '#2d3142', '#a0522d', '#7f5539', '#e07a5f'];
  for (let i = 0; i < 48; i++) {
    ctx.fillStyle = camoColors[i % camoColors.length];
    ctx.beginPath();
    const cx = (Math.sin(i * 99) * 0.5 + 0.5) * 2048;
    const cy = (Math.cos(i * 77) * 0.5 + 0.5) * 2048;
    const r = 120 + (i % 7) * 35;
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // Secondary blob connecting
    ctx.beginPath();
    ctx.arc(cx + r * 0.6, cy + r * 0.4, r * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3. Side Offroad Number Banners & Decals (#42)
  // Left door number square
  ctx.fillStyle = '#f4a261';
  ctx.fillRect(260, 840, 360, 360);
  ctx.lineWidth = 14;
  ctx.strokeStyle = '#1d3557';
  ctx.strokeRect(260, 840, 360, 360);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 210px Impact, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('42', 440, 1024);

  // Right door number square
  ctx.fillStyle = '#f4a261';
  ctx.fillRect(1428, 840, 360, 360);
  ctx.strokeRect(1428, 840, 360, 360);

  ctx.fillStyle = '#ffffff';
  ctx.fillText('42', 1608, 1024);

  // 4. Trophy Truck Sponsor Graphics
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 68px Arial Black, sans-serif';
  ctx.fillText('BAJA DUNE RUNNER', 440, 740);
  ctx.fillText('BAJA DUNE RUNNER', 1608, 740);

  ctx.fillStyle = '#e76f51';
  ctx.font = 'bold 44px Impact, sans-serif';
  ctx.fillText('TROPHY TRUCK • 4x4 ALL-TERRAIN', 440, 1260);
  ctx.fillText('TROPHY TRUCK • 4x4 ALL-TERRAIN', 1608, 1260);

  // 5. Rear Bed Diamond Plate Texture (Steel mesh in center)
  ctx.fillStyle = '#1c1c1c';
  ctx.fillRect(724, 1300, 600, 650);

  ctx.strokeStyle = '#444444';
  ctx.lineWidth = 3;
  for (let d = 0; d < 650; d += 24) {
    ctx.beginPath();
    ctx.moveTo(724, 1300 + d);
    ctx.lineTo(1324, 1300 + d);
    ctx.stroke();
  }

  // 6. Hood Desert Star / Compass graphic
  ctx.strokeStyle = '#1d3557';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(1024, 450, 180, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#e76f51';
  ctx.beginPath();
  ctx.moveTo(1024, 250);
  ctx.lineTo(1055, 430);
  ctx.lineTo(1224, 450);
  ctx.lineTo(1055, 470);
  ctx.lineTo(1024, 650);
  ctx.lineTo(993, 470);
  ctx.lineTo(824, 450);
  ctx.lineTo(993, 430);
  ctx.closePath();
  ctx.fill();

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Creates a micro-detail twill carbon fiber texture for splitters, spoilers, and diffusers.
 */
export function createCarbonFiberTexture(): Texture {
  const canvas = getOrCreateCanvas(256, 256);
  if (!canvas) return createFallbackTexture();
  const ctx = canvas.getContext('2d');
  if (!ctx) return createFallbackTexture();

  ctx.fillStyle = '#111111';
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = '#242424';
  for (let y = 0; y < 256; y += 8) {
    for (let x = 0; x < 256; x += 16) {
      const offset = ((y / 8) % 2) * 8;
      ctx.fillRect(x + offset, y, 8, 4);
    }
  }

  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(6, 6);
  texture.needsUpdate = true;
  return texture;
}
