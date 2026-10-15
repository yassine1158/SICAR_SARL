# SICAR SARL — Site web

Site vitrine de **SICAR SARL – Société Ivoirienne des Carrières** (gravier, sable, moellons) avec un **espace administration** pour gérer les produits, les informations de contact et la galerie photo.

Site 100 % statique : hébergement gratuit sur **GitHub Pages**, aucune base de données ni serveur.

## Mise en ligne (GitHub Pages)

1. Sur GitHub, ouvrir le dépôt → **Settings** → **Pages**.
2. *Source* : **Deploy from a branch** → branche **main**, dossier **/ (root)** → **Save**.
3. Après 1–2 minutes, le site est disponible sur `https://yassine1158.github.io/SICAR_SARL/`.
4. (Optionnel) Nom de domaine personnalisé (ex. `sicar-sarl.ci`) : même page, champ **Custom domain**.

## Administration

Adresse : `https://yassine1158.github.io/SICAR_SARL/admin/` (lien « Administration » en bas du site).

La connexion se fait avec un **jeton GitHub** — seul le propriétaire du dépôt (ou un collaborateur) peut modifier le site.

### Créer le jeton (une seule fois)
1. GitHub → photo de profil → **Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.
2. *Repository access* : **Only select repositories** → `SICAR_SARL`.
3. *Permissions* → *Repository permissions* → **Contents : Read and write**.
4. Générer, copier le jeton (`github_pat_…`) et le coller dans la page d'administration.

### Ce que l'on peut faire
- **Produits** : ajouter / modifier / supprimer / réordonner (nom, catégorie gravier-sable-roche, granulométrie, prix en FCFA ou « sur devis », unité, usages, photo, disponibilité).
- **Informations** : textes d'accueil, à propos, téléphone, WhatsApp, e-mail, adresse, horaires, chiffres clés.
- **Galerie** : ajouter, retirer et réordonner les photos.

Chaque clic sur **Publier** crée un commit dans le dépôt ; GitHub Pages met le site à jour en 1–2 minutes. Les photos envoyées sont automatiquement redimensionnées.

## Structure

```
index.html            page publique
assets/css, assets/js styles et effets (diaporama, particules, apparitions, compteurs, tilt 3D, lightbox)
assets/img            photos et logo
data/products.json    catalogue des produits (modifié par l'admin)
data/site.json        informations du site et galerie (modifié par l'admin)
admin/                espace administration
```

## Aperçu local

```bash
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```
