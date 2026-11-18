#!/usr/bin/env python3
"""Erzeugt das Angebots-PDF (AschkeBesaitungsserviceAngebot.pdf) aus data/products.json und data/site.json.

Aufruf:  python scripts/build_pdf.py [ausgabe.pdf]
Benötigt: pip install -r scripts/requirements.txt
"""
import io
import json
import math
import re
import sys
from datetime import date
from pathlib import Path

from PIL import Image
from reportlab.lib import colors
from reportlab.lib.enums import TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from reportlab.graphics import renderPDF
from reportlab.platypus.flowables import Flowable
from svglib.svglib import svg2rlg
from reportlab.platypus import (BaseDocTemplate, Frame, Image as RLImage, KeepTogether, NextPageTemplate,
                                CondPageBreak, PageBreak, PageTemplate, Paragraph, Spacer, Table, TableStyle)

ROOT = Path(__file__).resolve().parent.parent
pdfmetrics.registerFont(TTFont("Sansation", str(ROOT / "assets/fonts/Sansation.ttf")))
registerFontFamily("Sansation", normal="Sansation", bold="Sansation", italic="Sansation", boldItalic="Sansation")
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "AschkeBesaitungsserviceAngebot.pdf"

NAVY = colors.HexColor("#151a30")
NAVY2 = colors.HexColor("#1f2646")
ORANGE = colors.HexColor("#f59b42")
SILVER = colors.HexColor("#adb0c1")
LIGHT = colors.HexColor("#eef0f8")
INK = colors.HexColor("#e8eaf5")
MUTED = colors.HexColor("#adb0c1")
ROW = colors.HexColor("#1f2646")
ROW2 = colors.HexColor("#1b2140")
LINE = colors.HexColor("#323b68")

data = json.loads((ROOT / "data/products.json").read_text(encoding="utf-8"))
site = json.loads((ROOT / "data/site.json").read_text(encoding="utf-8"))
updated = date.fromisoformat(data["updated"]).strftime("%d.%m.%Y")
SHAPES = {x["id"]: x for x in data["shapes"]}


def natural_key(s):
    return [int(t) if t.isdigit() else t for t in re.split(r"(\d+)", s.casefold())]


def draw_svg(canvas, path, x, y, width):
    d = svg2rlg(str(path))
    k = width / d.width
    d.scale(k, k)
    renderPDF.draw(d, canvas, x, y)
    return d.height * k


class ColorCell(Flowable):
    """Farbpunkt(e) in echter Farbe plus Farbname."""

    def __init__(self, hexes, name, width=24 * mm):
        super().__init__()
        self.hexes, self.name, self.w = hexes, name, width

    def wrap(self, aw, ah):
        return self.w, 7 * mm

    def draw(self):
        c, r = self.canv, 2.1 * mm
        cx, cy = r, 3.5 * mm
        c.saveState()
        c.setLineWidth(0.5)
        c.setStrokeColor(MUTED)
        for i, hx in enumerate(self.hexes[:2]):
            c.setFillColor(colors.HexColor(hx))
            if len(self.hexes) == 1:
                c.circle(cx, cy, r, stroke=1, fill=1)
            else:
                p = c.beginPath()
                a0 = 90 if i == 0 else 270
                p.moveTo(cx, cy)
                p.arcTo(cx - r, cy - r, cx + r, cy + r, a0, 180)
                p.close()
                c.drawPath(p, stroke=0, fill=1)
        if len(self.hexes) > 1:
            c.setFillColor(colors.transparent)
            c.circle(cx, cy, r, stroke=1, fill=0)
        c.setFillColor(INK)
        c.setFont("Helvetica", 7.5)
        c.drawString(2 * r + 1.6 * mm, cy - 2.6, self.name)
        c.restoreState()


class ShapeCell(Flowable):
    """Saitenquerschnitt als Symbol plus Bezeichnung."""

    def __init__(self, shape, width=24 * mm):
        super().__init__()
        self.shape, self.w = shape, width

    def wrap(self, aw, ah):
        return self.w, 7 * mm

    def draw(self):
        sh = self.shape
        sides, icon = sh["sides"], sh.get("icon")
        c, r = self.canv, 2.3 * mm
        cx, cy = r, 3.5 * mm
        c.saveState()
        c.setStrokeColor(ORANGE)
        c.setFillColor(colors.HexColor("#3a3350"))
        c.setLineWidth(0.9)
        if icon == "star":
            p = c.beginPath()
            n = sides or 6
            for i in range(2 * n):
                k = r * (1.1 if i % 2 == 0 else 0.5)
                a = math.pi / 2 + i * math.pi / n
                x, y = cx + k * math.cos(a), cy + k * math.sin(a)
                p.moveTo(x, y) if i == 0 else p.lineTo(x, y)
            p.close()
            c.drawPath(p, stroke=1, fill=1)
        elif icon == "rough":
            c.circle(cx, cy, r * 0.7, stroke=1, fill=1)
            c.setFillColor(ORANGE)
            for i in range(14):
                a = i * 2.4
                d = (0.18 if i % 3 else 0.25) * mm
                c.circle(cx + (r * 0.7 + d * 0.8) * math.cos(a), cy + (r * 0.7 + d * 0.8) * math.sin(a), d, stroke=0, fill=1)
        elif not sides:
            c.circle(cx, cy, r, stroke=1, fill=1)
        else:
            p = c.beginPath()
            off = math.pi / 4 if sides == 4 else math.pi / 2
            rr = r * 0.95 if sides == 4 else r
            for i in range(sides):
                a = off + i * 2 * math.pi / sides
                x, y = cx + rr * math.cos(a), cy + rr * math.sin(a)
                p.moveTo(x, y) if i == 0 else p.lineTo(x, y)
            p.close()
            c.drawPath(p, stroke=1, fill=1)
        c.setFillColor(INK)
        c.setFont("Helvetica", 7.5)
        c.drawString(2 * r + 1.6 * mm, cy - 2.6, sh["title"])
        c.restoreState()


S = {
    "body": ParagraphStyle("body", fontName="Helvetica", fontSize=9.5, leading=13.5, textColor=INK),
    "small": ParagraphStyle("small", fontName="Helvetica", fontSize=7.5, leading=9.5, textColor=MUTED),
    "h1": ParagraphStyle("h1", fontName="Sansation", fontSize=20, leading=24, textColor=colors.white, spaceBefore=4, spaceAfter=6),
    "h2": ParagraphStyle("h2", fontName="Sansation", fontSize=14, leading=18, textColor=ORANGE, spaceBefore=10, spaceAfter=2),
    "sub": ParagraphStyle("sub", fontName="Helvetica", fontSize=8.5, leading=11, textColor=MUTED, spaceAfter=5),
    "name": ParagraphStyle("name", fontName="Helvetica-Bold", fontSize=8.8, leading=10.5, textColor=INK),
    "price": ParagraphStyle("price", fontName="Helvetica-Bold", fontSize=10, leading=12, textColor=ORANGE, alignment=TA_RIGHT),
    "th": ParagraphStyle("th", fontName="Sansation", fontSize=7.5, leading=9, textColor=colors.white),
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
    bg = Image.new("RGBA", im.size, (31, 38, 70, 255))
    bg.alpha_composite(im)
    # Auf quadratische Fläche zentrieren, damit schmale Bilder nicht linksbündig sitzen
    side = max(bg.size)
    sq = Image.new("RGBA", (side, side), (31, 38, 70, 255))
    sq.paste(bg, ((side - bg.width) // 2, (side - bg.height) // 2))
    buf = io.BytesIO()
    sq.convert("RGB").save(buf, "JPEG", quality=85)
    buf.seek(0)
    return RLImage(buf, width=size, height=size)


def esc(s):
    return str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def stock_text(p):
    if "stock" not in p:
        return ""
    return "ausverkauft" if p["stock"] <= 0 else f"{p['stock']} verfügbar"


def category_table(all_items, items, image_size=13 * mm):
    """Spalten richten sich nach der ganzen Kategorie, damit alle Unterkategorien gleich aussehen."""
    show_color = any(p.get("colorHex") for p in all_items)
    show_shape = any(p.get("shape") for p in all_items)
    show_struct = any(p.get("structureImage") for p in all_items)
    head = ["", "Produkt"] + (["Farbe"] if show_color else []) + (["Form"] if show_shape else []) + \
           (["Aufbau"] if show_struct else []) + ["Preis"]
    widths = [16 * mm, None] + [24 * mm] * show_color + [24 * mm] * show_shape + [15 * mm] * show_struct + [22 * mm]
    widths[1] = 180 * mm - sum(w for w in widths if w)
    rows = [[Paragraph(h, S["th"]) for h in head]]
    for p in items:
        extra = ", ".join(esc(t) for t in p.get("tags", []))
        if p.get("comment"):
            extra = (extra + " – " if extra else "") + esc(p["comment"])
        if p.get("deposit"):
            extra = (extra + " – " if extra else "") + f"Kaution {eur(p['deposit'])}"
        if p.get("weight"):
            extra = (extra + " – " if extra else "") + esc(p["weight"])
        name = f"<b>{esc(p['name'])}</b>" + (f"<br/><font size=7 color='#adb0c1'>{extra}</font>" if extra else "")
        row = [thumb(p.get("image"), image_size), Paragraph(name, S["name"])]
        if show_color:
            row.append(ColorCell(p["colorHex"], p["color"]) if p.get("colorHex") else Paragraph(esc(p.get("color", "")), S["small"]))
        if show_shape:
            sh = SHAPES.get(p.get("shape"))
            row.append(ShapeCell(sh) if sh else "")
        if show_struct:
            row.append(thumb(p.get("structureImage"), 11 * mm) if p.get("structureImage") else "")
        row.append(Paragraph(eur(p["price"]), S["price"]))
        rows.append(row)
    t = Table(rows, colWidths=widths, repeatRows=1)
    st = [
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f1325")), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LINEBELOW", (0, 1), (-1, -1), 0.3, LINE),
        ("TOPPADDING", (0, 0), (-1, -1), 2.5), ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5),
        ("LEFTPADDING", (0, 0), (-1, -1), 3), ("RIGHTPADDING", (0, 0), (-1, -1), 3),
    ]
    for i, p in enumerate(items, start=1):
        st.append(("BACKGROUND", (0, i), (-1, i), ROW if i % 2 else ROW2))
    t.setStyle(TableStyle(st))
    return t


def cover(canvas, doc):
    w, h = A4
    canvas.saveState()
    canvas.setFillColor(NAVY)
    canvas.rect(0, 0, w, h, stroke=0, fill=1)
    canvas.setFillColor(ORANGE)
    canvas.rect(0, h - 4 * mm, w, 4 * mm, stroke=0, fill=1)
    lw = 120 * mm
    draw_svg(canvas, ROOT / "assets/img/site/logo.svg", (w - lw) / 2, h - 12 * mm - lw * 314 / 534, lw)
    canvas.restoreState()


def page(canvas, doc):
    w, h = A4
    canvas.saveState()
    canvas.setFillColor(NAVY)
    canvas.rect(0, 0, w, h, stroke=0, fill=1)
    canvas.setFillColor(colors.HexColor("#0f1325"))
    canvas.rect(0, h - 12 * mm, w, 12 * mm, stroke=0, fill=1)
    canvas.setFillColor(ORANGE)
    canvas.rect(0, h - 12.8 * mm, w, 0.8 * mm, stroke=0, fill=1)
    canvas.setFillColor(colors.white)
    canvas.setFont("Sansation", 10)
    draw_svg(canvas, ROOT / "assets/img/site/icon.svg", 15 * mm, h - 10.6 * mm, 9.2 * mm)
    canvas.drawString(26.5 * mm, h - 8 * mm, site["name"])
    canvas.setFont("Sansation", 8)
    canvas.drawRightString(w - 15 * mm, h - 8 * mm, f"Aktuelles Angebot · Stand {updated}")
    canvas.setFillColor(MUTED)
    canvas.drawString(15 * mm, 8 * mm, f"{site['email']} · {site['phoneDisplay']}")
    canvas.drawRightString(w - 15 * mm, 8 * mm, f"Seite {doc.page}")
    canvas.restoreState()


doc = BaseDocTemplate(str(OUT), pagesize=A4, title=f"{site['name']} – Angebot", author=site["owner"],
                      leftMargin=15 * mm, rightMargin=15 * mm, topMargin=20 * mm, bottomMargin=16 * mm)
fr = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="f")
heading_break = 0.25 * A4[1] - doc.bottomMargin
cover_fr = Frame(25 * mm, 25 * mm, A4[0] - 50 * mm, A4[1] - 135 * mm, id="c")
doc.addPageTemplates([PageTemplate("cover", [cover_fr], onPage=cover), PageTemplate("page", [fr], onPage=page)])

story = [Spacer(1, 4 * mm),
         Paragraph("<b>Aktuelles Angebot</b>", ParagraphStyle("ct", parent=S["cover"], fontName="Sansation", fontSize=24, leading=30, textColor=ORANGE)),
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
svc = Table([[Paragraph(f"<b>{esc(s['title'])}</b><br/><font size=7.5 color='#adb0c1'>{esc(s['note'])}</font>", S["body"]),
              Paragraph(esc(s["price"]), S["price"])] for s in site["services"]], colWidths=[130 * mm, 50 * mm])
svc.setStyle(TableStyle([("LINEBELOW", (0, 0), (-1, -1), 0.3, LINE), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                         ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]))
story.append(svc)
story.append(Paragraph("Kulanz", S["h2"]))
story.append(Paragraph(esc(site["kulanz"]["intro"]), S["body"]))
kt = Table([[Paragraph("Grund", S["th"]), Paragraph("Kulanz", S["th"])]] +
           [[Paragraph(esc(r["reason"]), S["body"]), Paragraph(esc(r["result"]), S["body"])] for r in site["kulanz"]["rows"]],
          colWidths=[90 * mm, 90 * mm])
kt.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f1325")), ("LINEBELOW", (0, 1), (-1, -1), 0.3, LINE),
                        ("VALIGN", (0, 0), (-1, -1), "TOP"), ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]))
story += [Spacer(1, 2 * mm), kt, Spacer(1, 2 * mm), Paragraph(esc(site["kulanz"]["grip"]), S["body"])]
story.append(Paragraph("Übergabe", S["h2"]))
for h in site["handover"]:
    story.append(Paragraph(f"<b>{esc(h['title'])}:</b> {esc(h['text'])}", S["body"]))
story.append(Paragraph("Diadem-Produkte", S["h2"]))
story.append(Paragraph(esc(site["diademNote"]), S["body"]))
story.append(Paragraph('<link href="https://diademsports.eu/" color="#f59b42"><u>https://diademsports.eu/</u></link>', S["body"]))
story.append(Spacer(1, 4 * mm))
story.append(PageBreak())

SUB = ParagraphStyle("sub2", fontName="Sansation", fontSize=10.5, leading=13, textColor=ORANGE, spaceBefore=7, spaceAfter=3)
for c in data["categories"]:
    items = [p for p in data["products"] if p["category"] == c["id"] and p.get("stock") != 0]
    if not items:
        continue
    story.append(CondPageBreak(heading_break))
    head = [Paragraph(esc(c["title"]), S["h2"])]
    if c["subtitle"]:
        head.append(Paragraph(esc(c["subtitle"]), S["sub"]))
    story.append(KeepTogether(head + [Spacer(1, 1 * mm)]))
    subs = c.get("subcategories") or [{"id": None, "title": ""}]
    tabs = []
    for sc in subs:
        group = sorted((p for p in items if p.get("sub") == sc["id"]), key=lambda p: natural_key(p["name"]))
        if group:
            tabs.append((sc, group))
    for sc, group in tabs:
        if sc["title"]:
            story.append(CondPageBreak(heading_break))
            story.append(Paragraph(f"{esc(sc['title'])} <font size=8 color='#adb0c1'>· {len(group)}</font>", SUB))
        image_size = 10 * mm if c["id"] == "griffbaender" else 13 * mm
        story.append(category_table(items, group, image_size))
        story.append(Spacer(1, 4 * mm))
    story.append(Spacer(1, 4 * mm))

story.append(Paragraph("Änderungen und Irrtümer vorbehalten. Produkte nur solange der Vorrat reicht.", S["small"]))
doc.build(story)
print(f"{OUT} geschrieben ({OUT.stat().st_size // 1024} KB)")
