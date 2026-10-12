# วัดสัมโพธายะ · Sambodhaya Online Temple (prototype)

Child-facing (10+) prototype of the Sambodhaya Online Temple, in the visual style of Dhamma Land.
**Not authorised for public release** (Library: "Public release: NOT PASSED / NOT AUTHORIZED"). The page carries `noindex` and a visible prototype banner. Do not deploy publicly until the release gate passes.

## What's in it
- **Entrance:** the illustrated temple (`img/entrance.jpg`, used unchanged) as a full-width hero with clickable areas for each hall, the gates and the temple dog. On phones the picture is a banner and the hubs become large cards.
- **Hubs:** Central Courtyard, Learning Hall (U01–U08 stories in the five-minute pattern), Evidence Library, Practice Garden (body • feelings • mind • Dhamma), My Journey (U01–U08 path), Media Hall (includes the wheel diagram), Universal Hall (language and access settings), Rest Area, Caretaker, Exit.
- Practice Garden and My Journey sit inside the existing Learning–Practice–Observation hall; they are entrances, not new halls.

## 3D temple (`world.html`, trial)
A solo, Roblox-style low-poly walk through the same temple, built with Three.js (loaded from jsDelivr; no build step). Halls, the great tree, ponds, the Practice Garden's four stones and the eight My Journey stepping stones follow the entrance artwork. Walking up to a place and pressing E (or tapping) opens a panel that links to the matching page of the 2D site, so the 3D world never holds teaching content of its own.

**Showcase upgrade (Oct 2026):** sunset-sky lighting, real materials, soft shadows and a gentle glow, plus a walk-in **Learning Hall** (open Thai sala) with eight U01–U08 story boards along its side walls that open the matching lesson. A ✨/⚡ button switches between detailed and light graphics (light is picked automatically on weaker phones and remembered on that device only).

**Every hall is now a walk-in sala (Oct 2026):** the Evidence Library (manuscript shelves, reading tables), the Media Hall (the Sambodhaya wheel image, unchanged, on the back wall, with benches), the Universal Hall, the Caretaker's kuti (with the temple dog's bed) and an open Rest pavilion by the pond. Also new: a Practice Garden with a rock cliff, boulders and bamboo; a white temple wall with lotus-bud posts; Thai trees (frangipani, sugar palm, banana) and bougainvillea. A moat surrounds the temple wall; visitors start beyond it, cross an arched bridge (you walk over its arch), enter through a gateway in the wall, and follow one continuous path to the Bodhi tree.

**Learning Hall and Universal Hall seating follow temple custom:** visitors and students sit on the floor; teachers and monks sit on a raised platform along the back wall (not walkable for visitors); the Buddha image sits on a stepped altar on that platform, always the highest, with candles, phan phum offerings and flower vases.

**The Sambodhaya boy (default avatar):** the boy from the Sambodhaya film as a rigged 3D character (Higgsfield: a clean picture made from the film's frames, then Meshy image-to-3D with a 24-bone skeleton). He has idle, casual-walk and run animations (`boy.glb` holds the model and walk; `boy-idle.glb` and `boy-run.glb` hold only an animation for the same skeleton). Each clip's stride is measured when it loads and the clip plays at the speed that keeps his feet planted; footstep sounds follow his steps. Normal movement is a calm walk, Shift (or the touch stick pushed to its edge) runs. The block builder, picture-face and 3D-file avatars remain under "My avatar". **The wai (🙏 button, Q, or the 🙏 touch button):** palms pressed flat together in front of the chest, fingers together and upright, fingertips meeting at the chin, head facing forward with a modest bow; it holds briefly and rises again. The hands are placed from the boy's real hand mesh (the palm side is the hand's thinnest direction that faces the body at rest), so the fingertips meet exactly; where the thick cartoon palms would pass the middle they are pressed flat against each other in the shader, as real palms flatten, so the hands never pass through each other. No ready-made wai animation exists, so it is posed on the boy's own skeleton (a two-bone reach solver places the arms; the bow is spread over the spine, neck and head) on top of whatever he is doing; walking away ends it gently. The block avatar does a simpler block-style wai.

**Movement:** the temple dog trots (diagonal legs swing together, paws lift, head bobs) and wags its tail; the model has no skeleton, so the walk is done in its vertex shader, shadow included. The Practice Garden waterfall runs: streaks flow down a curved sheet of water in two layers, foam turns where it lands, ripples spread across the pool, droplets splash and a soft mist hangs. Calm motion slows the water and the tail rather than stopping them.

**Sound (`src/sound.js`):** made in the browser with Web Audio, nothing is downloaded. Following the charter, nothing plays until the visitor presses something: the 🔈 button (off every time the page opens) starts the ambience, and the temple bell rings only when struck (walk to it, press E). The site-wide "turn off all sound" setting is respected: the button and the bell ask first. Sounds are placed in 3D:
- breeze and rustling leaves that follow slow gusts, and small roof bells (kradueng) at the hall eaves that tinkle in the gusts
- birds in the trees: bulbul-like twitters and, now and then, the Asian koel's rising "ko-el"
- the Practice Garden waterfall
- footsteps: stone on paths and the plaza, soft on grass, hollow wood inside halls
- inside a hall the outside world is muffled and quieter
- the bronze temple bell: a deep strike with a long, beating ring

Asset credits:
- `assets/tex/`: textures (paving, roof tiles, plaster, wood, grass, mossy rock) and the `belfast_sunset_puresky` sky from [Poly Haven](https://polyhaven.com) (CC0).
- `assets/models/`: the Bodhi tree, frangipani trees, lamp posts, lanterns, bell, lotus bowls, jars, altar candles, reading table, Buddha image, phan phum, flower vases, bookshelves, benches, plants, rocks and the temple dog were generated for this project with Higgsfield (Tripo 3D). The dog was made from the temple dog in the entrance artwork. All models were simplified and their textures converted to WebP with gltf-transform; every model falls back to simple shapes if it can't load.
- Avatars: build a blocky character (saved on the device), use a picture as the face (kept only if the player ticks "remember"; drawings recommended for children), or upload a `.glb`/`.vrm` model (never stored; VRMs get a relaxed pose and a procedural walk, glTF clips named idle/walk are used when present, and a turn-around button fixes models that face backwards).
- The temple dog follows the player and opens a "where would you like to go?" list (scripted, not an AI). A plain places list, a calm-motion toggle and a link back to the 2D map are always available. No points, collectibles, streaks or automatic sound.
- Solo only: nothing a player does leaves the device. Multiplayer would need a real-time server and its own child-safety design.

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
