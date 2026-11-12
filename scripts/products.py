#!/usr/bin/env python3
"""Pflege-Werkzeug für data/products.json.

  python scripts/products.py check            prüfen, Farben auflösen, sortieren, speichern
  python scripts/products.py remove ID [ID…]  Produkt(e) entfernen (inkl. nicht mehr genutzter Bilder)
  python scripts/products.py prune            nicht verwendete Bilder in assets/img/ löschen

`check` wird auch vom Deploy-Workflow ausgeführt (Fehler => kein Deploy).
"""
import json
import re
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PRODUCTS = ROOT / "data/products.json"
COLORS = ROOT / "data/colors.json"
IMG_DIRS = [ROOT / "assets/img/products", ROOT / "assets/img/structure"]


def natural_key(s):
    return [int(t) if t.isdigit() else t for t in re.split(r"(\d+)", s.casefold())]


def load():
    return json.loads(PRODUCTS.read_text(encoding="utf-8"))


def save(data):
    PRODUCTS.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


def resolve_color(name, cmap):
    if not name:
        return None
    n = name.strip().lower()
    n = cmap["aliases"].get(n, n)
    table = cmap["colors"]
    if n in table:
        return [table[n]]
    parts = [cmap["aliases"].get(x.strip(), x.strip()) for x in n.split("-")]
    if len(parts) > 1 and all(x in table for x in parts):
        return [table[x] for x in parts]
    return None


def image_refs(data):
    refs = set()
    for p in data["products"]:
        for k in ("image", "structureImage"):
            if p.get(k):
                refs.add(p[k])
    return refs


def check(save_changes=True):
    data = load()
    cmap = json.loads(COLORS.read_text(encoding="utf-8"))
    cats = {c["id"]: c for c in data["categories"]}
    materials = {m["id"] for m in data["materials"]}
    shapes = {s["id"] for s in data["shapes"]}
    errors, warnings, seen = [], [], set()
    for p in data["products"]:
        pid = p.get("id", "?")
        if pid in seen:
            errors.append(f"{pid}: ID doppelt")
        seen.add(pid)
        for f in ("id", "category", "brand", "name", "price"):
            if f not in p:
                errors.append(f"{pid}: Pflichtfeld '{f}' fehlt")
        cat = cats.get(p.get("category"))
        if not cat:
            errors.append(f"{pid}: unbekannte Kategorie '{p.get('category')}'")
            continue
        subs = {s["id"] for s in cat.get("subcategories", [])}
        if subs and p.get("sub") not in subs:
            errors.append(f"{pid}: 'sub' muss eines von {sorted(subs)} sein (ist: {p.get('sub')!r})")
        if not subs and p.get("sub"):
            errors.append(f"{pid}: Kategorie {cat['id']} hat keine Unterkategorien")
        if p.get("material") and p["material"] not in materials:
            errors.append(f"{pid}: unbekanntes Material '{p['material']}'")
        if p.get("shape") and p["shape"] not in shapes:
            errors.append(f"{pid}: unbekannte Form '{p['shape']}'")
        for k in ("image", "structureImage"):
            if p.get(k) and not (ROOT / p[k]).exists():
                errors.append(f"{pid}: Datei fehlt: {p[k]}")
        custom = p.get("colorCustom")
        hx = [custom] if isinstance(custom, str) else custom or resolve_color(p.get("color"), cmap)
        if hx:
            p["colorHex"] = hx
        else:
            p.pop("colorHex", None)
            if p.get("color"):
                warnings.append(f"{pid}: Farbe '{p['color']}' unbekannt – in data/colors.json ergänzen oder colorCustom setzen")
        if cat.get("kind") == "string" and not p.get("image"):
            warnings.append(f"{pid}: kein Produktbild")
    order = {c["id"]: i for i, c in enumerate(data["categories"])}
    sub_order = {c["id"]: {s["id"]: i for i, s in enumerate(c.get("subcategories", []))} for c in data["categories"]}
    data["products"].sort(key=lambda p: (order.get(p["category"], 99), sub_order.get(p["category"], {}).get(p.get("sub"), 0),
                                         natural_key(p["name"])))
    for w in warnings:
        print("Hinweis:", w)
    for e in errors:
        print("FEHLER:", e)
    if errors:
        sys.exit(1)
    if save_changes:
        before = json.loads(PRODUCTS.read_text(encoding="utf-8"))
        if before != data:
            data["updated"] = date.today().isoformat()
            save(data)
    print(f"OK – {len(data['products'])} Produkte, {len(warnings)} Hinweise")
    return data


def unused_images(data):
    refs = image_refs(data)
    out = []
    for d in IMG_DIRS:
        for f in sorted(d.glob("*")):
            if f.is_file() and f.name != ".gitkeep" and str(f.relative_to(ROOT)) not in refs:
                out.append(f)
    return out


def prune(data):
    for f in unused_images(data):
        f.unlink()
        print("Bild gelöscht:", f.relative_to(ROOT))


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else "check"
    if cmd == "check":
        data = check()
        for f in unused_images(data):
            print("Hinweis: ungenutztes Bild", f.relative_to(ROOT))
    elif cmd == "remove":
        ids = set(sys.argv[2:])
        data = load()
        missing = ids - {p["id"] for p in data["products"]}
        if missing:
            sys.exit(f"Unbekannte ID(s): {', '.join(sorted(missing))}")
        data["products"] = [p for p in data["products"] if p["id"] not in ids]
        data["updated"] = date.today().isoformat()
        save(data)
        prune(data)
        check()
    elif cmd == "prune":
        prune(load())
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
