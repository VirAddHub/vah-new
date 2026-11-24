# Logo PNG Conversion Instructions

The PDF certificate needs a PNG version of the logo (PDFKit doesn't support SVG well).

## Option 1: Online Converter (Easiest)
1. Go to https://convertio.co/svg-png/ or https://cloudconvert.com/svg-to-png
2. Upload `logo.svg`
3. Set dimensions: 400x100 pixels (or 2x for retina: 800x200)
4. Download and save as `logo.png` in `apps/frontend/public/images/`

## Option 2: Using ImageMagick (if installed)
```bash
cd apps/frontend/public/images
convert logo.svg -resize 400x100 logo.png
```

## Option 3: Using Inkscape
1. Open `logo.svg` in Inkscape
2. File → Export PNG Image
3. Set width: 400px, height: 100px
4. Save as `logo.png`

## Option 4: Manual Creation
You can also manually create a PNG version using any image editor:
- Dimensions: 400x100 pixels (or higher for quality)
- Transparent background
- Same design as SVG

Once `logo.png` is created, the PDF certificate will automatically use it.

