# Placeholder Image Files

This folder needs the following image assets:

## Required Files

### 1. logo.png (and @2x, @3x)
- Main logo for Settings screen
- Size: 120x120pt (240x240px @2x, 360x360px @3x)
- PNG with transparency
- Optimized for dark background

### 2. logo-mark.png (and @2x, @3x)
- Small icon/mark for headers
- Size: 28x28pt (56x56px @2x, 84x84px @3x)
- PNG with transparency
- Subtle, non-intrusive

## Where to Add Images

1. **Create your logo images** (PNG format)
2. **Add to this folder** with proper naming:
   ```
   logo.png
   logo@2x.png  
   logo@3x.png
   logo-mark.png
   logo-mark@2x.png
   logo-mark@3x.png
   ```

3. React Native will **automatically select** the right resolution:
   - iPhone 6-8: Uses @2x
   - iPhone Plus/Pro Max: Uses @3x
   - Base (1x) rarely needed

## Temporary Placeholder

Until you add real images, the app will show a missing image indicator (empty box). This won't crash the app, but you should add proper branding before production.

## Design Tips

- **Dark Mode First**: Design logo to look good on #0B0D10 background
- **Simple & Clean**: Instalog is about speed, keep branding minimal
- **Monochrome or Accent**: Consider using the app's accent color (#6E6AF2)
