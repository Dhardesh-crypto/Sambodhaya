"""Write admin/config.yml: the forms of the content admin (Sveltia CMS) at /admin.

    python3 src/admin_config.py

Every text has a Thai and an English box side by side. The forms follow the files in content/ (see src/build.py);
fields the forms don't show are kept as they are when an editor saves. Run this again after changing the forms.
(The file is JSON, which is also valid YAML.)
"""
import json, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
content = root / "content"


def th_en(name, label, long=False, required=True, hint=None):
    w = "text" if long else "string"
    f = {"name": name, "label": label, "widget": "object", "required": required, "collapsed": False,
         "fields": [{"name": "th", "label": "ไทย · Thai", "widget": w, "required": required},
                    {"name": "en", "label": "English", "widget": w, "required": required}]}
    if hint:
        f["hint"] = hint
    return f


def text(name, label, required=True, hint=None, long=False):
    f = {"name": name, "label": label, "widget": "text" if long else "string", "required": required}
    if hint:
        f["hint"] = hint
    return f


icon = text("icon", "Icon (one emoji)")

lesson_fields = [
    text("code", "Code", hint="U01–U08. Don't change it: the site and the 3D temple find the lesson by it."),
    text("status", "Status", hint="The Library's checking status, e.g. CHILD COPY v1 READY / HUMAN COMPREHENSION TEST OPEN"),
    th_en("title", "Title"),
    th_en("question", "Question", required=False),
    th_en("simple", "The story, simply told", long=True),
    th_en("life", "In everyday life", long=True, required=False),
    th_en("uncertainty", "What we don't know", long=True, required=False),
    th_en("safety", "Safety note", long=True, required=False),
    th_en("boundary", "Boundary (what the source does not say)", long=True, required=False),
    th_en("evidenceNote", "Note on the evidence", long=True, required=False),
    th_en("translationNote", "Note on the translation", long=True, required=False),
    text("phrase", "Pali phrase", required=False),
    {"name": "media", "label": "Show the wheel image with this lesson", "widget": "boolean", "required": False},
    {"name": "sources", "label": "Sources", "widget": "list", "summary": "{{fields.key}}",
     "fields": [text("key", "Source key", hint="A key from Library → Sources, e.g. MN26"), text("use", "How it is used")]},
    {"name": "exercises", "label": "Exercises", "widget": "list", "summary": "{{fields.q}}",
     "fields": [
         text("q", "Question", long=True),
         {"name": "o", "label": "Answer options", "widget": "list", "required": False, "field": {"name": "option", "label": "Option", "widget": "string"}},
         {"name": "a", "label": "Right answer", "widget": "number", "value_type": "int", "min": 0, "required": False,
          "hint": "Counted from 0: 0 = the first option, 1 = the second, …"},
         text("feedback", "Feedback after answering", required=False, long=True),
         text("evidence", "Evidence", required=False),
         text("note", "Note", required=False, long=True),
         text("rule", "Rule", required=False, long=True),
         text("challenge", "Challenge", required=False, long=True),
     ]},
]

places = json.loads((content / "world/places.json").read_text(encoding="utf-8"))
cards = json.loads((content / "world/cards.json").read_text(encoding="utf-8"))

place_fields = [{"name": pid, "label": p["name"]["en"], "widget": "object", "collapsed": True,
                 "fields": [icon, th_en("name", "Name"), th_en("sub", "Subtitle")]} for pid, p in places.items()]
card_fields = [{"name": cid, "label": c["title"]["en"], "widget": "object", "collapsed": True,
                "fields": [icon, th_en("title", "Title"), th_en("text", "Text", long=True,
                           hint="In the Emerald Buddha card, {season} is filled in with the current season." if cid == "emerald" else None)]}
               for cid, c in cards.items()]
board = lambda name, label, parts: {"name": name, "label": label, "widget": "object", "collapsed": True, "fields": parts}
board_fields = [
    board("learn_story", "Learning Hall: the story boards", [th_en("head", "Heading (the number follows)"), th_en("foot", "Footnote")]),
    board("library", "Evidence Library: the back wall", [icon, th_en("head", "Heading"), th_en("title", "Title"), th_en("foot", "Footnote")]),
    {"name": "media", "label": "Media Hall: the four boards", "widget": "list", "allow_add": False, "summary": "{{fields.icon}} {{fields.title.en}}",
     "fields": [icon, th_en("title", "Title"), th_en("foot", "Footnote", required=False)]},
    board("universal", "Universal Hall: the side wall", [icon, th_en("head", "Heading"), th_en("title", "Title"), th_en("foot", "Footnote")]),
    board("care", "Caretaker's hall: the back wall", [icon, th_en("head", "Heading"), th_en("title", "Title")]),
]
sign_fields = [
    board("gate", "The entrance gate", [th_en("title", "Title"), th_en("sub", "Subtitle")]),
    th_en("welcome", "Left gate post"),
    th_en("leave", "Right gate post"),
    board("tool_rack", "The tool rack", [th_en("title", "Title"), th_en("sub", "Subtitle")]),
    board("donation_box", "The donation box (by the right gate post)", [th_en("title", "Title"), th_en("sub", "Subtitle")]),
    board("community", "LINE OpenChat (gate page footer, support page, left gate post)", [th_en("title", "Button / sign title"), th_en("sub", "Subtitle"),
          text("url", "LINE OpenChat link", hint="The invitation link from LINE, starting https://line.me/ (the part from ? on can be left off)")]),
    {"name": "garden_stones", "label": "Practice Garden: the four stones", "widget": "list", "allow_add": False,
     "summary": "{{fields.icon}} {{fields.name.en}}", "fields": [icon, th_en("name", "Name")]},
]

config = {
    "backend": {"name": "github", "repo": "Dhardesh-crypto/Sambodhaya", "branch": "main", "site_domain": "sambodhaya.netlify.app"},
    "site_url": "https://sambodhaya.netlify.app",
    "display_url": "https://sambodhaya.netlify.app",
    "media_folder": "img/uploads",
    "public_folder": "/img/uploads",
    "output": {"omit_empty_optional_fields": True, "json": {"indent_style": "space", "indent_size": 2}},
    "collections": [
        {"name": "lessons", "label": "Lessons", "label_singular": "Lesson", "folder": "content/lessons",
         "extension": "json", "format": "json", "identifier_field": "code", "summary": "{{code}} · {{title.en}}",
         "create": False, "delete": False, "editor": {"preview": False}, "fields": lesson_fields},
        {"name": "temple", "label": "Temple (3D)", "editor": {"preview": False}, "files": [
            {"name": "places", "label": "Hall names & subtitles", "file": "content/world/places.json", "format": "json", "fields": place_fields},
            {"name": "signs", "label": "Signs", "file": "content/world/signs.json", "format": "json", "fields": sign_fields},
            {"name": "boards", "label": "Hall boards", "file": "content/world/boards.json", "format": "json", "fields": board_fields},
            {"name": "cards", "label": "Info cards", "file": "content/world/cards.json", "format": "json", "fields": card_fields},
            {"name": "stories", "label": "Story paintings (descriptions)", "file": "content/world/stories.json", "format": "json", "fields": [
                {"name": "pictures", "label": "What each painting shows (U01–U08, in order)", "widget": "list", "allow_add": False,
                 "summary": "{{fields.en}}", "fields": [text("th", "ไทย · Thai", long=True), text("en", "English", long=True)]}]},
        ]},
        {"name": "library", "label": "Library", "editor": {"preview": False}, "files": [
            {"name": "sources", "label": "Sources", "file": "content/sources.json", "format": "json", "fields": [
                {"name": "sources", "label": "Source identifiers", "widget": "list", "summary": "{{fields.key}} · {{fields.id}}",
                 "fields": [text("key", "Key", hint="What lessons use to point here, e.g. MN26. Don't rename a key a lesson uses."),
                            text("id", "Reference"), text("pali", "Pali title"), text("th", "Thai title")]}]},
            {"name": "notes", "label": "AMBER notes & wheel image", "file": "content/library.json", "format": "json", "fields": [
                {"name": "amber", "label": "AMBER items (must stay visible)", "widget": "list", "field": {"name": "item", "label": "Item", "widget": "string"}},
                {"name": "wheel", "label": "The Sambodhaya wheel image", "widget": "object", "fields": [
                    th_en("alt", "What the image shows (for those who can't see it)", long=True),
                    {"name": "related", "label": "Related source keys", "widget": "list", "field": {"name": "key", "label": "Key", "widget": "string"}}]}]},
        ]},
    ],
}

(root / "admin" / "config.yml").write_text(json.dumps(config, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("wrote admin/config.yml")
