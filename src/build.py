"""Build index.html: content.js + app.jsx compiled with esbuild, inlined into shell.html.

    python3 src/build.py      (needs Node for npx esbuild)
"""
import pathlib, subprocess

src = pathlib.Path(__file__).resolve().parent
root = src.parent
combined = (src / "content.js").read_text(encoding="utf-8") + "\n" + (src / "app.jsx").read_text(encoding="utf-8")
js = subprocess.run(["npx", "--yes", "esbuild", "--loader=jsx", "--minify", "--target=es2019"],
                    input=combined, check=True, capture_output=True, text=True).stdout
shell = (src / "shell.html").read_text(encoding="utf-8")
(root / "index.html").write_text(shell.replace("/*APP*/", js), encoding="utf-8")
print("wrote index.html")
