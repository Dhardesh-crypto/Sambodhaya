"""Build the site from its code and its content.

    python3 src/build.py      (needs Node for npx esbuild)

content/ holds what the temple says, edited through /admin: the lessons (content/lessons/U01.json ...), the source
identifiers (sources.json), the Library's notes (library.json), and the 3D temple's hall names, signs, boards, info
cards and story paintings (content/world/*.json).
This script
  - writes content/site.json for the 3D world (content/world/, plus the eight stories: each lesson's title with the
    description of its painting), and
  - builds index.html: the lessons and sources put in front of src/content.js, then src/app.jsx, compiled with
    esbuild and inlined into src/shell.html.
It stops with a plain message if a content file is broken, so a bad edit never reaches the site.
"""
import json, pathlib, shutil, subprocess, sys

src = pathlib.Path(__file__).resolve().parent
root = src.parent
content = root / "content"

def load(path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        sys.exit(f"content error in {path.relative_to(root)}: {e}")

def bilingual(obj):
    return isinstance(obj, dict) and obj and set(obj) <= {"th", "en"}

def need_texts(where, obj):
    """every {th, en} text has both languages"""
    if isinstance(obj, dict):
        if bilingual(obj):
            for k in ("th", "en"):
                if not isinstance(obj.get(k), str) or not obj[k].strip():
                    sys.exit(f"content error in {where}: the {'Thai' if k == 'th' else 'English'} text is empty")
        for k, v in obj.items():
            need_texts(where, v)
    elif isinstance(obj, list):
        for v in obj:
            need_texts(where, v)

# what a lesson may leave out (the admin writes such a field as empty, or leaves it out)
OPTIONAL = ("question", "life", "uncertainty", "safety", "boundary", "evidenceNote", "translationNote", "phrase", "media")

def tidy_lesson(u):
    """empty optional fields count as absent; a lesson without a question keeps question: null, as the site expects"""
    for k in OPTIONAL:
        v = u.get(k)
        if v in (None, "", {}, False) or (isinstance(v, dict) and not any(str(x).strip() for x in v.values())):
            if k == "question":
                u[k] = None  # (in its place: the site shows no question)
            elif k in u:
                del u[k]
    u.setdefault("question", None)
    for e in u.get("exercises", []):
        for k in [k for k, v in e.items() if v in (None, "", [])]:
            del e[k]
    return u

lessons = sorted((tidy_lesson(load(p)) for p in (content / "lessons").glob("U*.json")), key=lambda u: u["code"])
sources = {s["key"]: {k: v for k, v in s.items() if k != "key"} for s in load(content / "sources.json")["sources"]}
library = load(content / "library.json")
w = content / "world"
signs = load(w / "signs.json")
world = {"places": load(w / "places.json"), "signs": {k: v for k, v in signs.items() if k != "garden_stones"},
         "garden_stones": signs["garden_stones"], "boards": load(w / "boards.json"), "cards": load(w / "cards.json")}
pictures = load(w / "stories.json")["pictures"]
for u in lessons:
    need_texts(f"lessons/{u.get('code', '?')}.json", u)
    for s in u.get("sources", []):
        if s.get("key") not in sources:
            sys.exit(f"content error in lessons/{u['code']}.json: unknown source key {s.get('key')!r}")
for name in ("places", "signs", "boards", "cards"):
    need_texts(f"world/{name}.json", world[name])
if not str(signs.get("community", {}).get("url", "")).startswith("https://line.me/"):
    sys.exit("content error in world/signs.json: the LINE OpenChat link (community.url) must start with https://line.me/")
need_texts("world/stories.json", pictures)
if len(pictures) != len(lessons):
    sys.exit(f"content error: {len(lessons)} lessons but {len(pictures)} story paintings in world/stories.json")

# the 3D world
site = dict(world)
site["journey"] = [{"code": u["code"], "title": u["title"], "picture": pictures[i]} for i, u in enumerate(lessons)]
(content / "site.json").write_text(json.dumps(site, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

# the 2D site
data = "".join(f"const {name} = {json.dumps(value, ensure_ascii=False)};\n" for name, value in
               (("SOURCES", sources), ("UNITS", lessons), ("AMBER", library["amber"]), ("WHEEL_IMAGE", library["wheel"]),
                ("COMMUNITY", signs["community"])))
combined = data + (src / "content.js").read_text(encoding="utf-8") + "\n" + (src / "app.jsx").read_text(encoding="utf-8")
js = subprocess.run(["npx", "--yes", "esbuild", "--loader=jsx", "--minify", "--target=es2019"],
                    input=combined, check=True, capture_output=True, text=True).stdout
shell = (src / "shell.html").read_text(encoding="utf-8")
(root / "index.html").write_text(shell.replace("/*APP*/", js), encoding="utf-8")
print(f"wrote content/site.json and index.html ({len(lessons)} lessons)")

# what the site serves, and nothing else
PUBLIC = ["index.html", "world.html", "records.html", "admin", "content", "src/world.js", "src/sound.js", "img", "assets", "audio"]
dist = root / "dist"
shutil.rmtree(dist, ignore_errors=True)
for name in PUBLIC:
    a, b = root / name, dist / name
    b.parent.mkdir(parents=True, exist_ok=True)
    (shutil.copytree if a.is_dir() else shutil.copy2)(a, b)
print("copied the site into dist/")
