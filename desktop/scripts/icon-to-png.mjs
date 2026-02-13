/**
 * app-icon を PNG に正規化する（JPEG で保存されている場合に対応）
 * usage: node scripts/icon-to-png.mjs
 */
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const inputPath = join(root, 'app-icon.png');
const outputPath = join(root, 'app-icon.png');

const buffer = readFileSync(inputPath);
const pngBuffer = await sharp(buffer)
  .png()
  .toBuffer();
writeFileSync(outputPath, pngBuffer);
console.log('Converted app-icon.png to valid PNG.');
