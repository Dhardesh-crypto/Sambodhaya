# วัดสัมโพธายะ · Sambodhaya Online Temple (prototype)

Child-facing (10+) prototype of the Sambodhaya Online Temple, in the visual style of Dhamma Land.
**Not authorised for public release** (Library: "Public release: NOT PASSED / NOT AUTHORIZED"). The page carries `noindex` and a visible prototype banner. Do not deploy publicly until the release gate passes.

## What's in it
- **Entrance:** the illustrated temple (`img/entrance.jpg`, used unchanged) as a full-width hero with clickable areas for each hall, the gates and the temple dog. On phones the picture is a banner and the hubs become large cards.
- **Hubs:** Central Courtyard, Learning Hall (U01–U08 stories in the five-minute pattern), Evidence Library, Practice Garden (body • feelings • mind • Dhamma), My Journey (U01–U08 path), Media Hall (includes the wheel diagram), Universal Hall (language and access settings), Rest Area, Caretaker, Exit.
- Practice Garden and My Journey sit inside the existing Learning–Practice–Observation hall; they are entrances, not new halls.

## Where the content comes from
All teaching text is copied verbatim from the Sambodhaya Notion pages; nothing is AI-authored teaching:
- `APP CONTENT v1 — U01–U08 Child Output Records`: story text, child questions, life line, sources, boundaries, uncertainty, safety, status
- `U01–U08 EXERCISE SET v1 — Publication Draft`: exercises (shown as draft, no score)
- `ภาษาหน้าบ้านเด็ก 10+`, `ENTRANCE`, `CENTRAL COURTYARD`, `LEARN • PRACTICE • OBSERVE`, `QUIET REST AREA`, `TEMPLE CARETAKER`, `หอพระไตรปิฎก`: zone wording

Interface wording (buttons, notices) was written for this prototype. English is an unreviewed AI draft and is labelled as such.
`img/sambodhaya-wheel.png` (wheel diagram) and `img/entrance.jpg` (entrance artwork) are the project's own images, used unchanged; `img/temple-dog.jpg` is cropped from the entrance artwork. `img/temple-bg.webp` comes from Dhamma Land. The wheel is shown in the Media Hall as explanatory media, status under review.

## Not yet connected (shown honestly as 🕯️ in the UI)
Full Source Record texts, speakers, controlled translations (e.g. U08's final words), the caretaker reporting system, and the AI temple dog / General AI Genesis (the dog here is scripted directions only).

## Build
```bash
python3 src/build.py      # content.js + app.jsx -> index.html (needs Node for npx esbuild)
```

Deployed as-is (no build step on Netlify; see `netlify.toml`) to https://sambodhaya.netlify.app.
