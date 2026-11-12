#!/usr/bin/env python3
"""Erzeugt das Angebots-PDF (Angebot.pdf) aus data/products.json und data/site.json.

Aufruf:  python scripts/build_pdf.py [ausgabe.pdf]
Benötigt: pip install -r scripts/requirements.txt
"""
import io
import json
import sys
from datetime import date
from pathlib import Path

from PIL import Image
from reportlab.lib import colors
from reportlab.lib.enums import TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (BaseDocTemplate, Frame, Image as RLImage, KeepTogether, NextPageTemplate,
                                PageBreak, PageTemplate, Paragraph, Spacer, Table, TableStyle)

ROOT = Path(__file__).resolve().parent.parent
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "Angebot.pdf"

NAVY = colors.HexColor("#151a30")
NAVY2 = colors.HexColor("#1f2646")
ORANGE = colors.HexColor("#f59b42")
SILVER = colors.HexColor("#adb0c1")
LIGHT = colors.HexColor("#eef0f8")
INK = colors.HexColor("#1a1f36")

data = json.loads((ROOT / "data/products.json").read_text(encoding="utf-8"))
site = json.loads((ROOT / "data/site.json").read_text(encoding="utf-8"))
updated = date.fromisoformat(data["updated"]).strftime("%d.%m.%Y")

S = {
    "body": ParagraphStyle("body", fontName="Helvetica", fontSize=9.5, leading=13.5, textColor=INK),
    "small": ParagraphStyle("small", fontName="Helvetica", fontSize=7.5, leading=9.5, textColor=colors.HexColor("#555b78")),
    "h1": ParagraphStyle("h1", fontName="Helvetica-Bold", fontSize=20, leading=24, textColor=NAVY, spaceBefore=4, spaceAfter=6),
    "h2": ParagraphStyle("h2", fontName="Helvetica-Bold", fontSize=14, leading=18, textColor=NAVY, spaceBefore=10, spaceAfter=2),
    "sub": ParagraphStyle("sub", fontName="Helvetica", fontSize=8.5, leading=11, textColor=colors.HexColor("#555b78"), spaceAfter=5),
    "name": ParagraphStyle("name", fontName="Helvetica-Bold", fontSize=8.8, leading=10.5, textColor=INK),
    "price": ParagraphStyle("price", fontName="Helvetica-Bold", fontSize=10, leading=12, textColor=NAVY, alignment=TA_RIGHT),
    "th": ParagraphStyle("th", fontName="Helvetica-Bold", fontSize=7.5, leading=9, textColor=colors.white),
    "cover": ParagraphStyle("cover", fontName="Helvetica", fontSize=10.5, leading=15, textColor=colors.white),
}


def eur(n):
    s = f"{n:.2f}".replace(".", ",")
    return s.replace(",00", "") + " €"


def thumb(path, size=13 * mm):
    if not path:
        return ""
    im = Image.open(ROOT / path).convert("RGBA")
    im.thumbnail((180, 180))
    bg = Image.new("RGBA", im.size, (238, 240, 248, 255))
    bg.alpha_composite(im)
    buf = io.BytesIO()
    bg.convert("RGB").save(buf, "JPEG", quality=85)
    buf.seek(0)
    w, h = im.size
    k = min(size / w, size / h)
    return RLImage(buf, width=w * k, height=h * k)


def esc(s):
    return str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def stock_text(p):
    if "stock" not in p:
        return ""
    return "ausverkauft" if p["stock"] <= 0 else f"{p['stock']} verfügbar"


def category_table(cat, items):
    rows = [[Paragraph(h, S["th"]) for h in ("", "Produkt", "Eigenschaften", "Preis", "")]]
    has_stock = any("stock" in p for p in items)
    rows[0][4] = Paragraph("Bestand" if has_stock else "", S["th"])
    for p in items:
        detail = [p.get("type"), p.get("color"), p.get("weight")]
        detail = " · ".join(esc(x) for x in detail if x)
        extra = ", ".join(esc(t) for t in p.get("tags", []))
        if p.get("comment"):
            extra = (extra + " – " if extra else "") + esc(p["comment"])
        if p.get("deposit"):
            extra = (extra + " – " if extra else "") + f"Kaution {eur(p['deposit'])}"
        name = f"<b>{esc(p['name'])}</b>" + (f"<br/><font size=7.5 color='#555b78'>{detail}</font>" if detail else "")
        price = eur(p["price"])
        rows.append([thumb(p.get("image")), Paragraph(name, S["name"]), Paragraph(extra, S["small"]),
                     Paragraph(price, S["price"]), Paragraph(esc(stock_text(p)), S["small"])])
    t = Table(rows, colWidths=[16 * mm, 54 * mm, 56 * mm, 20 * mm, 24 * mm], repeatRows=1)
    st = [
        ("BACKGROUND", (0, 0), (-1, 0), NAVY), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LINEBELOW", (0, 1), (-1, -1), 0.3, colors.HexColor("#d5d8e6")),
        ("TOPPADDING", (0, 0), (-1, -1), 2.5), ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5),
        ("LEFTPADDING", (0, 0), (-1, -1), 3), ("RIGHTPADDING", (0, 0), (-1, -1), 3),
    ]
    for i, p in enumerate(items, start=1):
        if i % 2 == 0:
            st.append(("BACKGROUND", (0, i), (-1, i), colors.HexColor("#f7f8fc")))
        if p.get("stock") == 0:
            st.append(("TEXTCOLOR", (0, i), (-1, i), colors.HexColor("#999999")))
    t.setStyle(TableStyle(st))
    return t


def cover(canvas, doc):
    w, h = A4
    canvas.saveState()
    canvas.setFillColor(NAVY)
    canvas.rect(0, 0, w, h, stroke=0, fill=1)
    canvas.setFillColor(ORANGE)
    canvas.rect(0, h - 4 * mm, w, 4 * mm, stroke=0, fill=1)
    logo = ROOT / "assets/img/site/logo.jpg"
    if logo.exists():
        canvas.drawImage(str(logo), (w - 110 * mm) / 2, h - 120 * mm, width=110 * mm, height=110 * mm * 271 / 500)
    canvas.restoreState()


def page(canvas, doc):
    w, h = A4
    canvas.saveState()
    canvas.setFillColor(NAVY)
    canvas.rect(0, h - 12 * mm, w, 12 * mm, stroke=0, fill=1)
    canvas.setFillColor(ORANGE)
    canvas.rect(0, h - 12.8 * mm, w, 0.8 * mm, stroke=0, fill=1)
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 9)
    canvas.drawString(15 * mm, h - 8 * mm, site["name"])
    canvas.setFont("Helvetica", 8)
    canvas.drawRightString(w - 15 * mm, h - 8 * mm, f"Aktuelles Angebot · Stand {updated}")
    canvas.setFillColor(colors.HexColor("#555b78"))
    canvas.drawString(15 * mm, 8 * mm, f"{site['email']} · {site['phoneDisplay']}")
    canvas.drawRightString(w - 15 * mm, 8 * mm, f"Seite {doc.page}")
    canvas.restoreState()


doc = BaseDocTemplate(str(OUT), pagesize=A4, title=f"{site['name']} – Angebot", author=site["owner"],
                      leftMargin=15 * mm, rightMargin=15 * mm, topMargin=20 * mm, bottomMargin=16 * mm)
fr = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="f")
cover_fr = Frame(25 * mm, 25 * mm, A4[0] - 50 * mm, A4[1] - 150 * mm, id="c")
doc.addPageTemplates([PageTemplate("cover", [cover_fr], onPage=cover), PageTemplate("page", [fr], onPage=page)])

story = [Spacer(1, 4 * mm),
         Paragraph("<b>Aktuelles Angebot</b>", ParagraphStyle("ct", parent=S["cover"], fontName="Helvetica-Bold", fontSize=24, leading=30, textColor=ORANGE)),
         Spacer(1, 3 * mm),
         Paragraph(esc(site["pdfIntro"]), S["cover"]), Spacer(1, 6 * mm),
         Paragraph(f"<b>{esc(site['name'])}</b><br/>z. Hd. {esc(site['owner'])}, {esc(site['address'])}<br/>"
                   f"{esc(site['email'])} · {esc(site['phoneDisplay'])}<br/>{esc(site['website'])}", S["cover"]),
         Spacer(1, 6 * mm),
         Paragraph(f"<font color='#adb0c1'>Stand: {updated} · {esc(site['slogan'])}</font>", S["cover"]),
         NextPageTemplate("page"), PageBreak()]

# Allgemeine Informationen
story.append(Paragraph("Allgemeine Informationen", S["h1"]))
story.append(Paragraph(esc(site["priceNote"]), S["body"]))
story.append(Paragraph("Dienstleistungen", S["h2"]))
svc = Table([[Paragraph(f"<b>{esc(s['title'])}</b><br/><font size=7.5 color='#555b78'>{esc(s['note'])}</font>", S["body"]),
              Paragraph(esc(s["price"]), S["price"])] for s in site["services"]], colWidths=[130 * mm, 50 * mm])
svc.setStyle(TableStyle([("LINEBELOW", (0, 0), (-1, -1), 0.3, colors.HexColor("#d5d8e6")), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                         ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]))
story.append(svc)
story.append(Paragraph("Kulanz", S["h2"]))
story.append(Paragraph(esc(site["kulanz"]["intro"]), S["body"]))
kt = Table([[Paragraph("Grund", S["th"]), Paragraph("Kulanz", S["th"])]] +
           [[Paragraph(esc(r["reason"]), S["body"]), Paragraph(esc(r["result"]), S["body"])] for r in site["kulanz"]["rows"]],
          colWidths=[90 * mm, 90 * mm])
kt.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), NAVY), ("LINEBELOW", (0, 1), (-1, -1), 0.3, colors.HexColor("#d5d8e6")),
                        ("VALIGN", (0, 0), (-1, -1), "TOP"), ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]))
story += [Spacer(1, 2 * mm), kt, Spacer(1, 2 * mm), Paragraph(esc(site["kulanz"]["grip"]), S["body"])]
story.append(Paragraph("Übergabe", S["h2"]))
for h in site["handover"]:
    story.append(Paragraph(f"<b>{esc(h['title'])}:</b> {esc(h['text'])}", S["body"]))
story.append(Paragraph("Diadem-Produkte", S["h2"]))
story.append(Paragraph(esc(site["diademNote"]), S["body"]))
story.append(PageBreak())

cats = {c["id"]: c for c in data["categories"]}
for c in data["categories"]:
    items = sorted((p for p in data["products"] if p["category"] == c["id"]), key=lambda p: p["name"].lower())
    if not items:
        continue
    head = [Paragraph(esc(c["title"]), S["h2"])]
    if c["subtitle"]:
        head.append(Paragraph(esc(c["subtitle"]), S["sub"]))
    story.append(KeepTogether(head + [Spacer(1, 1 * mm)]))
    story.append(category_table(c, items))
    story.append(Spacer(1, 6 * mm))

story.append(Paragraph("Änderungen und Irrtümer vorbehalten. Bestände nur solange der Vorrat reicht.", S["small"]))
doc.build(story)
print(f"{OUT} geschrieben ({OUT.stat().st_size // 1024} KB)")
