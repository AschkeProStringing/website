# Aschke Besaitungsservice – Website

Statische Website (HTML/CSS/JS, kein Build-Schritt) für GitHub Pages. Das Angebots-PDF wird bei jedem Push automatisch aus den Produktdaten erzeugt.

## Produkte pflegen

### Neue Produkte / Bilder melden (Vorlage)

Formlos reicht – am einfachsten eine Zeile pro Produkt, Bilder dazu hochladen (Dateiname = Produktname):

```
Kategorie | Unterkategorie | Marke | Name inkl. Stärke | Farbe | Material | Form | Preis | Besonderheiten
Saitenrolle | Polyester | Yonex | Poly Tour Pro 1.30 | gelb | Polyester | pentagonal | 23 | Kontrolle, Haltbarkeit
```

* Pflicht: Kategorie, Marke, Name, Preis. Alles andere (Farbe, Material, Form, Tags, Bestand) ist optional.
* Fehlende Bilder: nur hochladen und dazusagen, zu welchem Produkt sie gehören (Produktbild bzw. Strukturbild).
* Nicht mehr verfügbar: einfach den Produktnamen nennen (wird auf Bestand 0 gesetzt und ausgeblendet) oder „entfernen“ (wird gelöscht).
* Preisänderungen: Produktname + neuer Preis.

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
* `material`: `Polyester`, `Polyamid` oder `Naturdarm`. `shape` (optional): `rund`, `pentagonal`, `hexagonal`, `heptagonal`, `octagonal`, `quadratisch`, `stern`, `strukturiert` – wird als Querschnitts-Symbol angezeigt. `structureImage` (optional): Bild des Saitenaufbaus (v. a. Multifilament).
* `stock` optional (`0` = ausverkauft: standardmäßig auf der Seite ausgeblendet, per Filter "Ausverkauftes anzeigen" sichtbar; nicht im PDF). `tags`, `comment`, `weight`, `deposit`, `image` optional.
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

## Vorschau ansehen (ohne Veröffentlichung)

* **Schnell:** Repo → *Code → Download ZIP*, entpacken, `index.html` doppelklicken (Daten sind in `data/data.js` eingebettet; das PDF liegt nur im Actions-Paket).
* **Komplett inkl. PDF:** Tab *Actions* → letzter Lauf → *Artifacts* → `website-vorschau` herunterladen, entpacken, `index.html` öffnen.

`data/data.js` wird von `python scripts/products.py check` automatisch erzeugt – nicht von Hand bearbeiten.

## Hosting

In einem öffentlichen Repo (z. B. `website`): *Settings → Pages → Source: GitHub Actions*; der Workflow veröffentlicht dann automatisch. In privaten Repos läuft nur der Vorschau-Teil. Eigene Domain optional unter *Custom domain*.
