import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = 'public/icons';
const logoPath = 'public/kodeks-logo.png';

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate PNG icons from logo
async function generateIcons() {
  console.log('Génération des icônes PWA à partir du logo Kodeks...');

  for (const size of sizes) {
    const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);

    try {
      await sharp(logoPath)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png()
        .toFile(outputPath);

      console.log(`Icône ${size}x${size} générée`);
    } catch (error) {
      console.error(`Erreur pour ${size}x${size}:`, error.message);
    }
  }

  console.log('Génération des icônes terminée !');
}

generateIcons();