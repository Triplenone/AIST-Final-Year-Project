from pathlib import Path
import re

static = Path(__file__).resolve().parents[1] / "backend" / "backend" / "static"
html = (static / "index.html").read_text(encoding="utf-8")
refs = re.findall(r"/(assets/[^\"']+)", html)
missing = [r for r in refs if not (static / r).is_file()]
print("asset refs:", len(refs))
print("missing:", missing or "none")
