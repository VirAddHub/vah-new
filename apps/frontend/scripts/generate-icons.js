const fs = require('fs');
const path = require('path');

// Simple SVG to PNG conversion using a basic approach
// This creates a simple PNG by generating a data URL

function createSimpleIcon(size, isMaskable = false) {
    const canvas = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Background circle -->
      <circle cx="${size / 2}" cy="${size / 2}" r="${isMaskable ? size / 2.5 : size / 2}" fill="#111827"/>
      
      <!-- Mail/envelope icon -->
      <rect x="${size * 0.25}" y="${size * 0.35}" width="${size * 0.5}" height="${size * 0.35}" rx="${size * 0.02}" fill="#ffffff"/>
      <path d="M${size * 0.25} ${size * 0.39}L${size / 2} ${size * 0.55}L${size * 0.75} ${size * 0.39}V${size * 0.35}H${size * 0.25}V${size * 0.39}Z" fill="#111827"/>
      
      <!-- Building/skyline silhouette -->
      <rect x="${size * 0.15}" y="${size * 0.62}" width="${size * 0.08}" height="${size * 0.15}" fill="#ffffff"/>
      <rect x="${size * 0.27}" y="${size * 0.58}" width="${size * 0.1}" height="${size * 0.19}" fill="#ffffff"/>
      <rect x="${size * 0.41}" y="${size * 0.54}" width="${size * 0.12}" height="${size * 0.23}" fill="#ffffff"/>
      <rect x="${size * 0.56}" y="${size * 0.6}" width="${size * 0.09}" height="${size * 0.17}" fill="#ffffff"/>
      <rect x="${size * 0.69}" y="${size * 0.56}" width="${size * 0.08}" height="${size * 0.21}" fill="#ffffff"/>
      
      <!-- VAH text -->
      <text x="${size / 2}" y="${size * 0.88}" font-family="Arial, sans-serif" font-size="${size * 0.09}" font-weight="bold" text-anchor="middle" fill="#ffffff">VAH</text>
    </svg>
  `;

    return canvas;
}

// Create the icons directory if it doesn't exist
const iconsDir = path.join(__dirname, '../public/icons');
if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate 192x192 icon
const icon192 = createSimpleIcon(192);
fs.writeFileSync(path.join(iconsDir, 'icon-192.svg'), icon192);

// Generate 512x512 icon
const icon512 = createSimpleIcon(512);
fs.writeFileSync(path.join(iconsDir, 'icon-512.svg'), icon512);

// Generate maskable 512x512 icon
const maskable512 = createSimpleIcon(512, true);
fs.writeFileSync(path.join(iconsDir, 'maskable-512.svg'), maskable512);

console.log('✅ Generated SVG icons successfully!');
console.log('📁 Icons created in:', iconsDir);
console.log('📝 Note: These are SVG files. For production, convert to PNG using an online tool or ImageMagick.');
