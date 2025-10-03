const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

function drawIcon(size, isMaskable = false) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    const center = size / 2;
    const radius = isMaskable ? size / 2.5 : size / 2;
    
    // Clear canvas with transparent background
    ctx.clearRect(0, 0, size, size);
    
    // Background circle
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, 2 * Math.PI);
    ctx.fill();
    
    // Mail envelope
    const mailWidth = size * 0.5;
    const mailHeight = size * 0.35;
    const mailX = center - mailWidth / 2;
    const mailY = center - mailHeight / 2;
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(mailX, mailY, mailWidth, mailHeight);
    
    // Mail envelope flap
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.moveTo(mailX, mailY + size * 0.04);
    ctx.lineTo(center, mailY + size * 0.16);
    ctx.lineTo(mailX + mailWidth, mailY + size * 0.04);
    ctx.closePath();
    ctx.fill();
    
    // Building skyline
    const buildings = [
        { x: size * 0.15, y: size * 0.62, w: size * 0.08, h: size * 0.15 },
        { x: size * 0.27, y: size * 0.58, w: size * 0.1, h: size * 0.19 },
        { x: size * 0.41, y: size * 0.54, w: size * 0.12, h: size * 0.23 },
        { x: size * 0.56, y: size * 0.6, w: size * 0.09, h: size * 0.17 },
        { x: size * 0.69, y: size * 0.56, w: size * 0.08, h: size * 0.21 }
    ];
    
    ctx.fillStyle = '#ffffff';
    buildings.forEach(building => {
        ctx.fillRect(building.x, building.y, building.w, building.h);
    });
    
    // VAH text
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${size * 0.09}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText('VAH', center, size * 0.88);
    
    return canvas;
}

// Create the icons directory if it doesn't exist
const iconsDir = path.join(__dirname, '../public/icons');
if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate 192x192 icon
console.log('Generating 192x192 icon...');
const icon192 = drawIcon(192);
const icon192Buffer = icon192.toBuffer('image/png');
fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), icon192Buffer);

// Generate 512x512 icon
console.log('Generating 512x512 icon...');
const icon512 = drawIcon(512);
const icon512Buffer = icon512.toBuffer('image/png');
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), icon512Buffer);

// Generate maskable 512x512 icon
console.log('Generating maskable 512x512 icon...');
const maskable512 = drawIcon(512, true);
const maskable512Buffer = maskable512.toBuffer('image/png');
fs.writeFileSync(path.join(iconsDir, 'maskable-512.png'), maskable512Buffer);

console.log('✅ Generated PNG icons successfully!');
console.log('📁 Icons created in:', iconsDir);
console.log('📱 Files created:');
console.log('   - icon-192.png (192x192)');
console.log('   - icon-512.png (512x512)');
console.log('   - maskable-512.png (512x512, maskable)');
