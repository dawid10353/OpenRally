import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const resDir = path.join(rootDir, 'android/app/src/main/res');
const emblemSource = path.join(rootDir, 'public/favicon.png');

if (!fs.existsSync(emblemSource)) {
  console.error('Source emblem not found:', emblemSource);
  process.exit(1);
}

// Android Icon Densities
// Adaptive Foreground: standard 108dp base canvas
// Android Adaptive spec: safe zone is central 66dp-72dp diameter (~66% of canvas).
// Legacy Icons: standard 48dp base canvas
const densityConfigs = [
  { dir: 'mipmap-mdpi',    foregroundSize: 108, legacySize: 48 },
  { dir: 'mipmap-hdpi',    foregroundSize: 162, legacySize: 72 },
  { dir: 'mipmap-xhdpi',   foregroundSize: 216, legacySize: 96 },
  { dir: 'mipmap-xxhdpi',  foregroundSize: 324, legacySize: 144 },
  { dir: 'mipmap-xxxhdpi', foregroundSize: 432, legacySize: 192 }
];

const bgColor = { r: 10, g: 10, b: 30, alpha: 1 }; // #0a0a1e

console.log('Generating OpenRally Android Launcher Icons...');

for (const config of densityConfigs) {
  const targetDir = path.join(resDir, config.dir);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // 1. Adaptive Icon Foreground (ic_launcher_foreground.png)
  // Transparent canvas of size foregroundSize x foregroundSize
  // Emblem inside safe zone (70% of canvas)
  const fgCanvasSize = config.foregroundSize;
  const fgEmblemSize = Math.round(fgCanvasSize * 0.70);

  const fgEmblem = await sharp(emblemSource)
    .resize(fgEmblemSize, fgEmblemSize, { fit: 'contain' })
    .toBuffer();

  const fgPath = path.join(targetDir, 'ic_launcher_foreground.png');
  await sharp({
    create: {
      width: fgCanvasSize,
      height: fgCanvasSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
  .composite([{ input: fgEmblem, gravity: 'center' }])
  .png()
  .toFile(fgPath);

  // 2. Legacy Square / Squircle Launcher Icon (ic_launcher.png)
  // Background #0a0a1e with centered emblem (~82% of size)
  const legacySize = config.legacySize;
  const legacyEmblemSize = Math.round(legacySize * 0.82);

  const legacyEmblem = await sharp(emblemSource)
    .resize(legacyEmblemSize, legacyEmblemSize, { fit: 'contain' })
    .toBuffer();

  const legacySquarePath = path.join(targetDir, 'ic_launcher.png');
  await sharp({
    create: {
      width: legacySize,
      height: legacySize,
      channels: 4,
      background: bgColor
    }
  })
  .composite([{ input: legacyEmblem, gravity: 'center' }])
  .png()
  .toFile(legacySquarePath);

  // 3. Legacy Round Launcher Icon (ic_launcher_round.png)
  // Background #0a0a1e with centered emblem clipped to circle
  const circleMaskSvg = Buffer.from(
    `<svg width="${legacySize}" height="${legacySize}"><circle cx="${legacySize/2}" cy="${legacySize/2}" r="${legacySize/2}" fill="white"/></svg>`
  );

  const legacyRoundComposite = await sharp({
    create: {
      width: legacySize,
      height: legacySize,
      channels: 4,
      background: bgColor
    }
  })
  .composite([{ input: legacyEmblem, gravity: 'center' }])
  .png()
  .toBuffer();

  const legacyRoundPath = path.join(targetDir, 'ic_launcher_round.png');
  await sharp(legacyRoundComposite)
    .composite([{ input: circleMaskSvg, blend: 'dest-in' }])
    .png()
    .toFile(legacyRoundPath);

  console.log(`✓ Generated icons for ${config.dir} (FG: ${fgCanvasSize}px, Legacy: ${legacySize}px)`);
}

// 4. Update Splash Screens (drawable and drawable-land-* / drawable-port-*)
// High quality OpenRally dark logo on #0a0a1e splash screen
const splashConfigs = [
  { dir: 'drawable', width: 480, height: 800 },
  { dir: 'drawable-land-mdpi', width: 480, height: 320 },
  { dir: 'drawable-land-hdpi', width: 800, height: 480 },
  { dir: 'drawable-land-xhdpi', width: 1280, height: 720 },
  { dir: 'drawable-land-xxhdpi', width: 1600, height: 960 },
  { dir: 'drawable-land-xxxhdpi', width: 1920, height: 1080 },
  { dir: 'drawable-port-mdpi', width: 320, height: 480 },
  { dir: 'drawable-port-hdpi', width: 480, height: 800 },
  { dir: 'drawable-port-xhdpi', width: 720, height: 1280 },
  { dir: 'drawable-port-xxhdpi', width: 960, height: 1600 },
  { dir: 'drawable-port-xxxhdpi', width: 1080, height: 1920 }
];

const splashLogoSource = path.join(rootDir, 'public/openrally_logo_dark.png');
if (fs.existsSync(splashLogoSource)) {
  console.log('Generating OpenRally Splash Screens...');
  for (const splash of splashConfigs) {
    const splashDir = path.join(resDir, splash.dir);
    if (!fs.existsSync(splashDir)) {
      fs.mkdirSync(splashDir, { recursive: true });
    }

    // Logo size: 45% of min dimension
    const minDim = Math.min(splash.width, splash.height);
    const targetLogoWidth = Math.round(Math.min(splash.width * 0.75, minDim * 1.1));

    const resizedLogo = await sharp(splashLogoSource)
      .resize(targetLogoWidth, null, { fit: 'inside' })
      .toBuffer();

    const splashPath = path.join(splashDir, 'splash.png');
    await sharp({
      create: {
        width: splash.width,
        height: splash.height,
        channels: 4,
        background: bgColor
      }
    })
    .composite([{ input: resizedLogo, gravity: 'center' }])
    .png()
    .toFile(splashPath);

    console.log(`✓ Generated splash screen for ${splash.dir} (${splash.width}x${splash.height})`);
  }
}

console.log('\nAll Android app launcher icons and splash screens successfully generated!');
