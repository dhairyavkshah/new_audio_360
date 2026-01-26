#!/usr/bin/env node

/**
 * Windows Store Icon Generator
 * 
 * This script generates all required icons for Microsoft Store submission
 * from a source 1024x1024 PNG icon.
 * 
 * Usage:
 *   node generate-icons.js <source-icon-path>
 * 
 * Example:
 *   node generate-icons.js ../../assets/images/icon.png
 * 
 * Requirements:
 *   - Node.js 16+
 *   - sharp package: npm install sharp
 */

const fs = require('fs');
const path = require('path');

const ICON_SIZES = {
  pwa: [48, 72, 96, 128, 144, 152, 192, 256, 384, 512],
  
  windows: {
    'Square44x44Logo': [44],
    'Square44x44Logo.targetsize': [16, 24, 32, 48, 256],
    'Square44x44Logo.altform-unplated_targetsize': [16, 24, 32, 48, 256],
    'Square44x44Logo.altform-lightunplated_targetsize': [16, 24, 32, 48, 256],
    'SmallTile': [71],
    'Square150x150Logo': [150],
    'Wide310x150Logo': [310, 150],
    'Square310x310Logo': [310],
    'StoreLogo': [50],
    'BadgeLogo': [24],
    'SplashScreen': [620, 300]
  }
};

async function generateIcons(sourcePath) {
  let sharp;
  try {
    sharp = require('sharp');
  } catch (e) {
    console.error('Error: sharp package not found. Install it with: npm install sharp');
    console.log('\nAlternatively, use an online tool like:');
    console.log('  - PWABuilder: https://www.pwabuilder.com/imageGenerator');
    console.log('  - App Icon Generator: https://appicon.co/');
    process.exit(1);
  }

  const sourceIcon = path.resolve(sourcePath);
  
  if (!fs.existsSync(sourceIcon)) {
    console.error(`Error: Source icon not found: ${sourceIcon}`);
    process.exit(1);
  }

  const outputDir = path.resolve(__dirname, '../assets/icons');
  const pwaOutputDir = path.resolve(__dirname, '../../public/icons');

  fs.mkdirSync(outputDir, { recursive: true });
  fs.mkdirSync(pwaOutputDir, { recursive: true });

  console.log('Generating PWA icons...');
  for (const size of ICON_SIZES.pwa) {
    const outputPath = path.join(pwaOutputDir, `icon-${size}.png`);
    await sharp(sourceIcon)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 21, g: 101, b: 192, alpha: 1 }
      })
      .png()
      .toFile(outputPath);
    console.log(`  Created: icon-${size}.png`);
  }

  console.log('\nGenerating Windows Store icons...');
  
  for (const size of ICON_SIZES.windows['Square44x44Logo.targetsize']) {
    const outputPath = path.join(outputDir, `Square44x44Logo.targetsize-${size}.png`);
    await sharp(sourceIcon)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(outputPath);
    console.log(`  Created: Square44x44Logo.targetsize-${size}.png`);
  }

  const squareSizes = [44, 71, 150, 310];
  for (const size of squareSizes) {
    const name = size === 44 ? 'Square44x44Logo' : 
                 size === 71 ? 'SmallTile' :
                 size === 150 ? 'Square150x150Logo' : 'Square310x310Logo';
    const outputPath = path.join(outputDir, `${name}.png`);
    await sharp(sourceIcon)
      .resize(size, size, { 
        fit: 'contain', 
        background: { r: 21, g: 101, b: 192, alpha: 1 } 
      })
      .png()
      .toFile(outputPath);
    console.log(`  Created: ${name}.png`);
  }

  const wideOutput = path.join(outputDir, 'Wide310x150Logo.png');
  await sharp(sourceIcon)
    .resize(150, 150, { fit: 'contain', background: { r: 21, g: 101, b: 192, alpha: 1 } })
    .extend({
      left: 80,
      right: 80,
      background: { r: 21, g: 101, b: 192, alpha: 1 }
    })
    .png()
    .toFile(wideOutput);
  console.log('  Created: Wide310x150Logo.png');

  const storeOutput = path.join(outputDir, 'StoreLogo.png');
  await sharp(sourceIcon)
    .resize(50, 50, { fit: 'contain', background: { r: 21, g: 101, b: 192, alpha: 1 } })
    .png()
    .toFile(storeOutput);
  console.log('  Created: StoreLogo.png');

  const splashOutput = path.join(outputDir, 'SplashScreen.png');
  await sharp(sourceIcon)
    .resize(300, 300, { fit: 'contain', background: { r: 21, g: 101, b: 192, alpha: 1 } })
    .extend({
      left: 160,
      right: 160,
      background: { r: 21, g: 101, b: 192, alpha: 1 }
    })
    .png()
    .toFile(splashOutput);
  console.log('  Created: SplashScreen.png');

  const badgeOutput = path.join(outputDir, 'BadgeLogo.png');
  await sharp(sourceIcon)
    .resize(24, 24, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(badgeOutput);
  console.log('  Created: BadgeLogo.png');

  console.log('\n✓ All icons generated successfully!');
  console.log(`  PWA icons: ${pwaOutputDir}`);
  console.log(`  Windows icons: ${outputDir}`);
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage: node generate-icons.js <source-icon-path>');
  console.log('Example: node generate-icons.js ../../assets/images/icon.png');
  process.exit(0);
}

generateIcons(args[0]).catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
