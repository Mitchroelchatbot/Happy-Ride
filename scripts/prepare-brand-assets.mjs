// Verkleint de logo's van Google Drive naar web-formaten.
// Gebruik: node scripts/prepare-brand-assets.mjs "<map met logo's>"
import path from 'node:path';
import sharp from 'sharp';

const srcDir = process.argv[2];
if (!srcDir) {
  console.error('Geef de map met logo’s op, bv.: node scripts/prepare-brand-assets.mjs "J:/Mijn Drive/..."');
  process.exit(1);
}

await sharp(path.join(srcDir, 'Logo zonder achtergrond.png'))
  .resize(512, 512, { fit: 'inside' })
  .png({ compressionLevel: 9, palette: true })
  .toFile('public/logo.png');

await sharp(path.join(srcDir, 'Logo zonder naam.png'))
  .resize(192, 192, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png({ compressionLevel: 9 })
  .toFile('src/app/icon.png');

console.log('Klaar: public/logo.png en src/app/icon.png');
