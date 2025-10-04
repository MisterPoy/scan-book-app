import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, '..', 'public', 'icons');
const logoPath = path.join(__dirname, '..', 'public', 'kodeks-logo.png');

/**
 * Vérifie que le logo source existe
 */
function checkSourceLogo() {
  if (!fs.existsSync(logoPath)) {
    console.error(`❌ Erreur: Logo source introuvable à ${logoPath}`);
    console.error('Veuillez placer votre logo à public/kodeks-logo.png');
    process.exit(1);
  }

  console.log(`✅ Logo source trouvé: ${logoPath}`);
}

/**
 * Crée le répertoire des icônes si nécessaire
 */
function ensureIconsDirectory() {
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
    console.log(`📁 Répertoire créé: ${iconsDir}`);
  }
}

/**
 * Génère une icône à une taille donnée
 */
async function generateIcon(size) {
  const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);

  try {
    await sharp(logoPath)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png({
        compressionLevel: 9, // Compression maximale
        adaptiveFiltering: true,
        palette: true // Utiliser palette si possible (plus petit)
      })
      .toFile(outputPath);

    const stats = fs.statSync(outputPath);
    const sizeKB = (stats.size / 1024).toFixed(2);

    console.log(`  ✓ icon-${size}x${size}.png (${sizeKB} KB)`);
    return true;
  } catch (error) {
    console.error(`  ✗ Erreur icon-${size}x${size}.png:`, error.message);
    return false;
  }
}

/**
 * Génère des fichiers additionnels (favicon, apple-touch-icon)
 */
async function generateAdditionalIcons() {
  const additionalIcons = [
    { name: 'favicon.ico', size: 32, format: 'png' }, // favicon en PNG (ICO nécessite lib spéciale)
    { name: 'apple-touch-icon.png', size: 180, format: 'png' },
  ];

  console.log('\n📱 Génération icônes supplémentaires...');

  for (const icon of additionalIcons) {
    const outputPath = path.join(__dirname, '..', 'public', icon.name);

    try {
      await sharp(logoPath)
        .resize(icon.size, icon.size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: icon.name.includes('apple') ? 1 : 0 }
        })
        .png()
        .toFile(outputPath);

      console.log(`  ✓ ${icon.name}`);
    } catch (error) {
      console.error(`  ✗ Erreur ${icon.name}:`, error.message);
    }
  }
}

/**
 * Pipeline complet de génération
 */
async function generateIcons() {
  console.log('\n🚀 Génération des icônes PWA Kodeks\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1. Vérifications préalables
  checkSourceLogo();
  ensureIconsDirectory();

  // 2. Génération des icônes PWA
  console.log('\n🖼️  Génération icônes PWA...');

  let successCount = 0;
  for (const size of sizes) {
    const success = await generateIcon(size);
    if (success) successCount++;
  }

  // 3. Génération icônes supplémentaires
  await generateAdditionalIcons();

  // 4. Rapport final
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`✅ Génération terminée: ${successCount}/${sizes.length} icônes PWA`);
  console.log(`📂 Emplacement: ${iconsDir}\n`);

  if (successCount < sizes.length) {
    console.warn('⚠️  Certaines icônes n\'ont pas pu être générées');
    process.exit(1);
  }
}

// Exécution
generateIcons().catch(error => {
  console.error('\n❌ Erreur fatale:', error);
  process.exit(1);
});