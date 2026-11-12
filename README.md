# Aschke Besaitungsservice – Website

Statische Website (HTML/CSS/JS, kein Build-Schritt) für GitHub Pages. Das Angebots-PDF wird bei jedem Push automatisch aus den Produktdaten erzeugt.

## Produkte pflegen

Alle Produkte stehen in `data/products.json` (Website **und** PDF lesen dieselbe Datei). Alphabetisch sortiert wird automatisch – Reihenfolge in der Datei ist egal.

**Neues Produkt:** Bild(er) nach `assets/img/products/` (Strukturbild einer Saite nach `assets/img/structure/`), Eintrag in `products` ergänzen, dann `python scripts/products.py check` (löst Farben auf, sortiert, prüft Pflichtfelder und Bilder).

```json
{
  "id": "yonex-poly-tour-pro-1-30",
  "category": "saitenrollen-tennis",
  "sub": "Polyester",
  "brand": "Yonex",
  "name": "Yonex Poly Tour Pro 1.30",
  "color": "gelb",
  "material": "Polyester",
  "shape": "pentagonal",
  "price": 23,
  "tags": ["Kontrolle", "Haltbarkeit"],
  "image": "assets/img/products/yonex-poly-tour-pro-1-30.webp",
  "structureImage": "assets/img/structure/beispiel.webp"
}
```

* `category`: `id` aus `categories`. `sub`: Unterkategorie dieser Kategorie (Saiten: `Polyester`, `Polyamid`, `Naturdarm`; Griffbänder: `Basisgriffbänder`, `Overgrips`). Neue Unterkategorien unter `subcategories` der Kategorie anlegen.
* `color`: deutscher Farbname. Die echte Farbe (`colorHex`) wird aus `data/colors.json` ergänzt – unbekannte Farben dort eintragen oder einmalig `"colorCustom": "#aabbcc"` am Produkt setzen. Zweifarbig: `schwarz-gelb`.
* `material`: `Polyester`, `Polyamid` oder `Naturdarm`. `shape` (optional): `rund`, `pentagonal`, `hexagonal`, `heptagonal`, `octagonal` – wird als Querschnitts-Symbol angezeigt. `structureImage` (optional): Bild des Saitenaufbaus (v. a. Multifilament).
* `stock` optional (`0` = ausverkauft). `tags`, `comment`, `weight`, `deposit`, `image` optional.
* Preise ändern = `price` anpassen.

**Produkt entfällt:** `python scripts/products.py remove ID [ID …]` – entfernt es aus Website und Angebot und löscht nicht mehr genutzte Bilder.

Commit auf `main` → Website **und** `Angebot.pdf` werden automatisch neu veröffentlicht (Tab *Actions*); der Stand im PDF wird beim `check` aktualisiert.

## Weitere Inhalte

| Datei | Inhalt |
|---|---|
| `data/colors.json` | Farbnamen → Hex-Farben |
| `assets/img/site/logo.svg`, `icon.svg` | Logo/Icon (Schrift in Pfade umgewandelt) |
| `data/site.json` | Kontaktdaten, Dienstleistungspreise, Kulanz, Übergabearten (Website **und** PDF) |
| `index.html` | Startseite mit Texten |
| `anfrage.html` | Fragebogen für Neuaufträge (Versand per E-Mail/WhatsApp, kein Server nötig) |
| `impressum.html`, `datenschutz.html` | Rechtstexte |
| `assets/css/styles.css` | Design (Farben oben in `:root`, passend zum Logo) |

## Lokal ansehen / PDF bauen

```bash
python -m http.server 8000          # http://localhost:8000
pip install -r scripts/requirements.txt
python scripts/build_pdf.py         # erzeugt Angebot.pdf
```

## Hosting

GitHub → *Settings → Pages → Source: GitHub Actions*. Eigene Domain optional unter *Custom domain*.
