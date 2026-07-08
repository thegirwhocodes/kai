# Kai Brand and Visual Direction

Last updated: June 15, 2026

## Direction

Kai should feel like a calm focus room, not an anime theme gallery. The visual system should sit between Flocus's ambient productivity dashboard and a more personal AI coach: quiet, warm, study-forward, and credible enough to become a real paid product.

## Logo Research

Sources consistently point to the same logo requirements:

- Keep the mark simple, memorable, scalable, versatile, balanced, and timeless.
- Test the app icon at tiny sizes first. If the mark only works large, it is not done.
- Use a symbol that connects to the product's job, not a decorative illustration.
- Avoid text inside the app icon. Text belongs in the wordmark or nav label.
- Use labels near ambiguous UI icons. Standalone marks can be beautiful, but product controls need clear names.

Applied to Kai:

- Keep the icon as a K monogram so it remains ownable and recognizable.
- Add a focus orbit to imply timing, flow, and "next block" without using a literal tomato or clock.
- Use a warm peach-to-rose-to-lavender accent family so the mark connects to the current Kai UI without becoming a generic purple SaaS logo.
- Keep the app tile dark so it works on light/dark OS surfaces and against photo backgrounds.
- Pair the mark with a text wordmark in marketing contexts: `Kai Focus`.

## Background Research

Flocus succeeds visually because it treats focus as a full-screen environment: aesthetic themes, ambient scenes, timer controls, tasks, music, and stats all live inside one calm dashboard. Pinterest and home-office trend pages point toward warm desks, books, window light, plants, lamps, texture, and personalized spaces rather than sterile minimalism. The safest production direction is photo-based study ambience, with enough darkness/negative space for Kai's overlay.

Implementation rules:

- Prefer real study/workspace photos over anime, fantasy, or character art.
- Use 16:9 crops at 2400x1350 so the dashboard and landing hero stay crisp.
- Keep the first six image presets focused: desk, library, lamp, window, plant, writing surface.
- Preserve the gradient presets because they are lightweight, legible, and Flocus-adjacent.
- Do not use copied Pinterest pins as shipped assets; use them only as inspiration.

## New Image Presets

All images are stored locally in `public/backgrounds/`, cropped to 2400x1350 from Unsplash image URLs.

- `late-night-desk.jpg` — dim desk with laptop and monitor: https://unsplash.com/photos/a-dimly-lit-desk-with-a-laptop-and-monitor-IUKdnYUlDco
- `sunlit-bookshelf.jpg` — bright room with bookshelves and desks by windows: https://unsplash.com/photos/bright-room-with-bookshelves-and-two-desks-by-windows-Mb-lGau6K5U
- `library-lamps.jpg` — warm reading space with lamps: https://unsplash.com/photos/warm-lighting-illuminates-a-modern-reading-space-CIIflD2YaKY
- `window-lamp.jpg` — desk lamp by a window: https://unsplash.com/photos/desk-lamp-illuminates-a-surface-by-a-window-5_HbwtAALw8
- `quiet-writing-desk.jpg` — moody desk by window with curtains: https://unsplash.com/photos/desk-by-a-window-with-dark-curtains-StCrd5WABUE
- `plant-desk.jpg` — branches on a bright desk by window: https://unsplash.com/photos/vase-with-green-branches-on-a-desk-near-a-window-fSDJsGUnZsY

## Sources

- Flocus: https://flocus.com/
- Flocus Pomodoro timer: https://flocus.com/features/pomodoro-timer
- Pinterest Predicts 2026: https://business.pinterest.com/pinterest-predicts/
- Pinterest cozy desk setup aesthetic: https://www.pinterest.com/ideas/cozy-desk-setup-aesthetic/927864528959/
- Unsplash terms: https://unsplash.com/terms
- Interaction Design Foundation logo design topic: https://ixdf.org/literature/topics/logo-design
- Nielsen Norman Group icon usability: https://www.nngroup.com/articles/icon-usability/
- Nielsen Norman Group icon testing: https://www.nngroup.com/articles/how-to-test-digital-icons/
- Apple app icon design video: https://developer.apple.com/videos/play/wwdc2017/822/
- VistaPrint logo principles: https://www.vistaprint.com/hub/principles-of-logo-design

## Next Design Tests

- Squint test: icon must still read as Kai at 16, 32, 64, and 96 px.
- Black-and-white test: monogram should still work without the gradient.
- Background test: logo/nav must remain legible over each image preset with the existing veil.
- User test: show 5 people the old icon and new icon for 5 seconds, then ask which one feels more like a calm AI focus coach.
- Market test: screenshot the app next to Flocus, Portal, Endel, Brain.fm, and Motion; Kai should look focused and warm, not derivative.
