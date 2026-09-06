import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const fullLogoPath = path.join(rootDir, 'public/openrally_logo_darkmode.png');
const fullLogoDark = path.join(rootDir, 'public/openrally_logo_dark.png');

// Test composite with full logo (transparent background) inside 432x432
const logoResized = await sharp(fullLogoDark)
  .resize(400, 400, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .toBuffer();

await sharp({
  create: {
    width: 432,
    height: 432,
    channels: 4,
    background: { r: 10, g: 10, b: 30, alpha: 1 }
  }
})
.composite([{ input: logoResized, gravity: 'center' }])
.png()
.toFile(path.join(rootDir, 'scripts/preview_full_logo_432.png'));

console.log('Full logo preview generated');
