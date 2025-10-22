// Script pour générer les icônes PWA
// Pour l'instant, on copie juste le SVG
// Dans une vraie prod, utiliser sharp ou @vercel/og pour générer les PNGs

const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, '../public/icons');

// Créer le dossier icons s'il n'existe pas
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

console.log('✅ Icons directory ready');
console.log('📝 NOTE: Pour générer les vraies icônes PNG:');
console.log('   1. Utilise un outil en ligne: https://realfavicongenerator.net/');
console.log('   2. Ou installe sharp: npm install sharp');
console.log('   3. Upload public/icons/icon.svg');
console.log('   4. Télécharge les icônes générées dans public/icons/');
console.log('');
console.log('Sizes needed:', sizes.map(s => `${s}x${s}`).join(', '));

