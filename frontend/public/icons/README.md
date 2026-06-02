# PWA Icons

This directory contains SVG placeholder icons for development.

## For production

Replace each `.svg` file with a properly branded `.png` at the same filename (e.g. `icon-192x192.png`), then update `manifest.json`, `layout.tsx`, and `sw.js` to reference the `.png` files.

You can use the generation script to produce PNGs automatically:

```bash
# From the frontend directory:
npm install -D sharp
npm run generate:pwa-assets
```

## Required sizes

| File                 | Purpose                                |
|----------------------|----------------------------------------|
| icon-72x72           | Notification badge (Android)           |
| icon-96x96           | Shortcut icons                         |
| icon-128x128         | Chrome Web Store                       |
| icon-144x144         | MS Tiles                               |
| icon-152x152         | iPad touch icon                        |
| icon-192x192         | Maskable — Android home screen         |
| icon-384x384         | High-DPI Android                       |
| icon-512x512         | Maskable — splash / install prompt     |
