---
description: "Brand assets shipped by the SignFlow Documents design system (logos, icons, illustrations, photography, fonts, videos) with exact import paths. Read before adding any logo, icon, illustration, image, video, or font to the app: use these real assets instead of placeholders, stock photos, or generated images."
---

# SignFlow Documents — Assets

These files are copied into `src/design-system/{slug}/assets/` in this project — never generate, placeholder, or substitute an asset that exists here.

Raw files import directly, e.g. `import logo from "@/design-system/{slug}/assets/logos/logo.svg"`.
R2 pointer files (`.asset.json`) are imported as JSON — use the `url` property, e.g. `import hero from "@/design-system/{slug}/assets/hero.png.asset.json"` then `<img src={hero.url} />`.
The full machine-readable catalog lives in this library's `design-system.json` (`assets` array).

## Logos

- `@/design-system/{slug}/assets/idoc-business-logo-2026.png.asset.json` (png, R2 pointer)

## Images

- `@/design-system/{slug}/assets/idoc-business.png.asset.json` (png, R2 pointer)
- `@/design-system/{slug}/assets/idoc-hero-workspace.jpg` (jpg)
- `@/design-system/{slug}/assets/idoc-social-share.jpg.asset.json` (jpg, R2 pointer)
- `@/design-system/{slug}/assets/tool-compress.jpg` (jpg)
- `@/design-system/{slug}/assets/tool-convert.jpg` (jpg)
- `@/design-system/{slug}/assets/tool-edit.jpg` (jpg)
- `@/design-system/{slug}/assets/tool-enhance-document.jpg` (jpg)
- `@/design-system/{slug}/assets/tool-ocr.jpg` (jpg)
- `@/design-system/{slug}/assets/tool-organize.jpg` (jpg)
- `@/design-system/{slug}/assets/tool-security.jpg` (jpg)
- `@/design-system/{slug}/assets/tool-sign.jpg` (jpg)

