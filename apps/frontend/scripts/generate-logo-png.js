const { createCanvas, loadImage, registerFont } = require('canvas');
const fs = require('fs');
const path = require('path');

async function generateLogoPNG() {
    const canvas = createCanvas(400, 100);
    const ctx = canvas.getContext('2d');
    
    // Clear with transparent background
    ctx.clearRect(0, 0, 400, 100);
    
    // Navy blue color
    const navy = '#1e3a8a';
    const darkGrey = '#374151';
    
    // Draw mailbox icon
    const iconX = 20;
    const iconY = 30;
    const iconSize = 40;
    
    // Mailbox body (rounded rectangle)
    ctx.fillStyle = navy;
    ctx.beginPath();
    ctx.roundRect(iconX, iconY, iconSize * 0.6, iconSize * 0.45, 3);
    ctx.fill();
    
    // Mailbox top (rounded)
    ctx.beginPath();
    ctx.arc(iconX + iconSize * 0.3, iconY, 4, Math.PI, 0, false);
    ctx.fill();
    
    // Mailbox door line
    ctx.strokeStyle = navy;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(iconX + 8, iconY + 12);
    ctx.lineTo(iconX + iconSize * 0.6 - 8, iconY + 12);
    ctx.stroke();
    
    // Mailbox post
    ctx.fillStyle = navy;
    ctx.fillRect(iconX + iconSize * 0.25, iconY + iconSize * 0.45, 5, 10);
    
    // Wi-Fi signal flag
    const flagX = iconX + iconSize * 0.6;
    const flagY = iconY;
    
    // Flag pole
    ctx.strokeStyle = navy;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(flagX, flagY);
    ctx.lineTo(flagX, flagY + 16);
    ctx.stroke();
    
    // Signal waves
    ctx.strokeStyle = navy;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(flagX, flagY, 8, -Math.PI / 2, 0);
    ctx.stroke();
    
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(flagX, flagY + 3, 9, -Math.PI / 2, 0);
    ctx.stroke();
    
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(flagX, flagY + 6, 6.5, -Math.PI / 2, 0);
    ctx.stroke();
    
    // Text: VirtualAddress (dark grey)
    ctx.fillStyle = darkGrey;
    ctx.font = 'bold 28px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText('VirtualAddress', iconX + iconSize + 20, iconY + 28);
    
    // Text: Hub (navy blue)
    ctx.fillStyle = navy;
    ctx.font = 'bold 28px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    const virtualAddressWidth = ctx.measureText('VirtualAddress').width;
    ctx.fillText('Hub', iconX + iconSize + 20 + virtualAddressWidth + 5, iconY + 28);
    
    // Save as PNG
    const buffer = canvas.toBuffer('image/png');
    const outputPath = path.join(__dirname, '../public/images/logo.png');
    fs.writeFileSync(outputPath, buffer);
    console.log('✅ Logo PNG created at:', outputPath);
}

// Add roundRect polyfill if needed
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, width, height, radius) {
        this.beginPath();
        this.moveTo(x + radius, y);
        this.lineTo(x + width - radius, y);
        this.quadraticCurveTo(x + width, y, x + width, y + radius);
        this.lineTo(x + width, y + height - radius);
        this.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        this.lineTo(x + radius, y + height);
        this.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.lineTo(x, y + radius);
        this.quadraticCurveTo(x, y, x + radius, y);
        this.closePath();
    };
}

generateLogoPNG().catch(console.error);

