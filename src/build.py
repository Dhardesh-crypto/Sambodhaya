"""Build the site from its code and its content.

    python3 src/build.py      (needs Node for npx esbuild)

content/ holds what the temple says, edited through /admin: the lessons (content/lessons/U01.json ...), the source
identifiers, the Library's notes, and the 3D temple's hall names, signs, boards and info cards (content/world.json).
This script
  - writes content/site.json for the 3D world (world.json, plus the eight stories: each lesson's title with the
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

def need_texts(where, obj):
    """every {th, en} text present and not empty"""
    if isinstance(obj, dict):
        if set(obj) == {"th", "en"}:
            for k in ("th", "en"):
                if not isinstance(obj[k], str) or not obj[k].strip():
                    sys.exit(f"content error in {where}: an empty {k} text")
        for k, v in obj.items():
            need_texts(where, v)
    elif isinstance(obj, list):
        for v in obj:
            need_texts(where, v)

lessons = sorted((load(p) for p in (content / "lessons").glob("U*.json")), key=lambda u: u["code"])
sources = load(content / "sources.json")
library = load(content / "library.json")
world = load(content / "world.json")
for u in lessons:
    need_texts(f"lessons/{u.get('code', '?')}.json", u)
    for s in u.get("sources", []):
        if s.get("key") not in sources:
            sys.exit(f"content error in lessons/{u['code']}.json: unknown source key {s.get('key')!r}")
need_texts("world.json", world)
pictures = world.get("journey_pictures", [])
if len(pictures) != len(lessons):
    sys.exit(f"content error: {len(lessons)} lessons but {len(pictures)} journey pictures in world.json")

# the 3D world
site = {k: v for k, v in world.items() if k not in ("_about", "journey_pictures")}
site["journey"] = [{"code": u["code"], "title": u["title"], "picture": pictures[i]} for i, u in enumerate(lessons)]
(content / "site.json").write_text(json.dumps(site, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

# the 2D site
data = "".join(f"const {name} = {json.dumps(value, ensure_ascii=False)};\n" for name, value in
               (("SOURCES", sources), ("UNITS", lessons), ("AMBER", library["amber"]), ("WHEEL_IMAGE", library["wheel"])))
combined = data + (src / "content.js").read_text(encoding="utf-8") + "\n" + (src / "app.jsx").read_text(encoding="utf-8")
js = subprocess.run(["npx", "--yes", "esbuild", "--loader=jsx", "--minify", "--target=es2019"],
                    input=combined, check=True, capture_output=True, text=True).stdout
shell = (src / "shell.html").read_text(encoding="utf-8")
(root / "index.html").write_text(shell.replace("/*APP*/", js), encoding="utf-8")
print(f"wrote content/site.json and index.html ({len(lessons)} lessons)")

# what the site serves, and nothing else
PUBLIC = ["index.html", "world.html", "records.html", "content", "src/world.js", "src/sound.js", "img", "assets", "audio"]
dist = root / "dist"
shutil.rmtree(dist, ignore_errors=True)
for name in PUBLIC:
    a, b = root / name, dist / name
    b.parent.mkdir(parents=True, exist_ok=True)
    (shutil.copytree if a.is_dir() else shutil.copy2)(a, b)
print("copied the site into dist/")
