# Step Station mockup: what to hand over

Everything runs now with procedural placeholders. Nothing below blocks you from testing.
Drop files in `public/assets/` and tell me the filenames.

## Photos (easy, highest value)
Wire-up exists in `src/config.js` → `PHOTOS`. Set the URL and it appears on the page.
Each step is a spread (left page + right page), so each step needs two photos:
- `cover.jpg`: photo of the job (used on both cover pages)
- `step1a.jpg` / `step1b.jpg` … `step4a.jpg` / `step4b.jpg`
- `reseta.jpg` / `resetb.jpg`
Portrait or landscape both work (cropped to fill a ~3.3 x 3.6 unit slot).

## Content decisions
- Real step text (3–5 steps per the email), real reset text.
- Final list of feelings (now: Happy, Tired, Worried, Sad) and number of intensity rows (now 5).
- Status cards (now: Break, Help, Switch).

## Optional 3D models (only if you want nicer props)
- Small desk lamp or desk organizer (GLB, under 2 MB)
- Real-looking marker and eraser
- Bracelet beads / string bowl (start tray)

## Not needed
Textures, fonts, HDRI: all generated in code.
