#!/usr/bin/env python3
"""Génère les pages HTML du site à partir des gabarits.

Chaque fichier de tools/pages/ commence par une ligne de métadonnées :
    <!--{"title": "...", "desc": "...", "page": "produits"}-->
suivie du contenu de la page. L'en-tête, le menu et le pied de page
communs viennent de tools/partials/.

Utilisation (depuis la racine du dépôt) :
    python3 tools/build.py
"""
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TOOLS = ROOT / "tools"


ONEPAGE_LINKS = [
    ("contact.html#quote", "#contact"), ("index.html", "#accueil"), ("entreprise.html", "#entreprise"),
    ("produits.html", "#produits"), ("production.html", "#production"), ("galerie.html", "#galerie"),
    ("faq.html", "#faq"), ("contact.html", "#contact"),
]


def read(path):
    return (TOOLS / path).read_text(encoding="utf-8")


def main():
    head, header, footer = read("partials/head.html"), read("partials/header.html"), read("partials/footer.html")
    for src in sorted((TOOLS / "pages").glob("*.html")):
        text = src.read_text(encoding="utf-8")
        m = re.match(r"<!--(\{.*?\})-->\n", text, re.S)
        if not m:
            raise SystemExit(f"{src.name} : ligne de métadonnées manquante")
        meta, body = json.loads(m.group(1)), text[m.end():]
        page = (head.replace("{{title}}", html.escape(meta["title"]))
                    .replace("{{desc}}", html.escape(meta["desc"]))
                    .replace("{{page}}", meta["page"])
                    .replace("{{extra_head}}", meta.get("extra_head", "")))
        hdr, ftr = header, footer
        if meta["page"] == "onepage":
            # version une page (téléphone) : les liens du menu deviennent des ancres
            for href, anchor in ONEPAGE_LINKS:
                hdr, ftr = hdr.replace(f'href="{href}"', f'href="{anchor}"'), ftr.replace(f'href="{href}"', f'href="{anchor}"')
        out = page + hdr + body + ftr
        (ROOT / src.name).write_text(out, encoding="utf-8")
        print("✓", src.name)


if __name__ == "__main__":
    main()
