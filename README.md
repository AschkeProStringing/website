# Aschke Besaitungsservice – Website

Statische Website (HTML/CSS/JS, kein Build-Schritt) für GitHub Pages. Das Angebots-PDF wird bei jedem Push automatisch aus den Produktdaten erzeugt.

## Neues Produkt hinzufügen

1. Bild (idealerweise quadratisch, WebP/PNG/JPG, ca. 400 px) nach `assets/img/products/` legen.
2. In `data/products.json` unter `products` einen Eintrag ergänzen (am einfachsten einen ähnlichen kopieren):

```json
{
  "id": "yonex-poly-tour-pro-1-30",
  "category": "saitenrollen-tennis",
  "brand": "Yonex",
  "name": "Yonex Poly Tour Pro 1.30",
  "color": "gelb",
  "price": 23,
  "tags": ["Kontrolle", "Haltbarkeit"],
  "comment": "optionaler Hinweistext",
  "stock": 3,
  "image": "assets/img/products/yonex-poly-tour-pro-1-30.webp"
}
```

* `category`: eine `id` aus `categories` (z. B. `saitenrollen-tennis`, `saitensets`, `griffbaender`, `daempfer`, `saitenschoner`, `tennisbaelle`, `testschlaeger`, `saitenrollen-badminton`, `saiten-squash`). Neue Kategorien einfach unter `categories` anlegen.
* `stock` ist optional (Bestand; `0` = ausverkauft). Bei Saitenrollen weglassen.
* `tags`, `comment`, `type`, `weight`, `deposit`, `image` sind optional.
* Preise ändern = `price` anpassen. Nach Preis-/Bestandsänderungen `updated` oben in der Datei aktualisieren.

Commit auf `main` → Website **und** `Angebot.pdf` werden automatisch neu veröffentlicht (Tab *Actions*). Direkt im Browser möglich: Datei auf GitHub öffnen → Stift-Symbol → *Commit changes*.

## Weitere Inhalte

| Datei | Inhalt |
|---|---|
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
