# Travailleurs de l'Imam · Espace des chefs

Site privé des chefs et cheftaines scouts de Bayt ul Mahdi : organigramme, pôles, groupes, bibliothèque de documents et photos, calendrier et discussion.

- Hébergement : GitHub Pages (gratuit)
- Données, comptes, fichiers et discussion : Supabase (offre gratuite)
- Aucun outil à installer : le site est fait de fichiers HTML, CSS et JavaScript.

## Mise en place (une seule fois)

1. **Base de données** : dans Supabase, ouvrir *SQL Editor > New query*, coller le contenu de `supabase/schema.sql` et cliquer sur *Run*.
2. **Premier administrateur** : dans une nouvelle requête, remplacer l'adresse puis lancer :
   ```sql
   update public.members set is_admin = true where first_name = 'Fakhar';
   insert into public.invitations (email, member_id)
   select lower('votre.adresse@exemple.fr'), id from public.members where first_name = 'Fakhar';
   ```
3. **Connexion par mot de passe** : *Authentication > Sign In / Providers > Email*, désactiver *Confirm email*.
4. **Adresse du site** : *Authentication > URL Configuration*, mettre `https://faks67.github.io/site/` dans *Site URL*.
5. **Mise en ligne** : sur GitHub, *Settings > Pages*, *Source : Deploy from a branch*, branche `main`, dossier `/ (root)`.

## Mise à jour 2 : réactions et annonces avec notifications

1. **Base de données** : dans *SQL Editor > New query*, coller `supabase/02-reactions-annonces.sql` et cliquer sur *Run*.
2. **Fonction d'envoi des notifications** : *Edge Functions > Deploy a new function > Via Editor*, nommer la fonction `notify`, coller le contenu de `supabase/functions/notify/index.ts` et cliquer sur *Deploy*. Dans les réglages de la fonction, désactiver *Verify JWT* (la fonction vérifie elle-même que l'utilisateur est un chef connecté).
3. **Sur chaque téléphone** : ouvrir *Discussion > Annonces* et toucher *Activer les notifications*. Sur iPhone, ajouter d'abord le site à l'écran d'accueil (Partager > Sur l'écran d'accueil) et l'ouvrir depuis l'icône.

## Mise à jour 3 : autorisations et calendrier complet

1. **Base de données** : dans *SQL Editor > New query*, coller `supabase/03-autorisations-calendrier.sql` et cliquer sur *Run*.
2. **Autorisations** : dans *Administration > Autorisations*, cocher pour chaque chef ce qu'il peut faire en plus (calendrier, bibliothèque, discussion, chefs et groupes). Seuls les administrateurs peuvent donner des autorisations ou nommer un autre administrateur.

## Mise à jour 4 : adresses, groupes et carte

1. **Base de données** : dans *SQL Editor > New query*, coller `supabase/04-adresses-groupes.sql` et cliquer sur *Run*.
2. Les adresses viennent de la Base Adresse Nationale (service gratuit de l'IGN) et la carte d'OpenFreeMap (gratuit, sans clé). Rien d'autre à configurer.

## Organisation des fichiers

| Fichier | Rôle |
| --- | --- |
| `index.html` | Page unique du site |
| `js/app.js` | Fonctionnement (connexion, pages, envoi de fichiers, discussion) |
| `js/data.js` | Textes des pôles (issus de la restructuration 2026/2027) |
| `js/config.js` | Adresse et clé publique du projet Supabase |
| `assets/` | Logo et styles |
| `supabase/schema.sql` | Tables, règles d'accès et données de départ |
| `supabase/02-reactions-annonces.sql` | Réactions et abonnements aux notifications |
| `supabase/03-autorisations-calendrier.sql` | Autorisations par type d'action et champs du calendrier |
| `supabase/04-adresses-groupes.sql` | Adresse, coordonnées et groupes des événements |
| `supabase/functions/notify/index.ts` | Envoi des notifications d'annonces |
| `sw.js`, `manifest.webmanifest` | Réception des notifications et installation sur l'écran d'accueil |
| `.github/workflows/keepalive.yml` | Appel automatique tous les 3 jours pour éviter la mise en veille de Supabase |

## Sécurité

- La clé de `js/config.js` est une clé publique, prévue pour être visible. Les données sont protégées par les règles d'accès définies dans `supabase/schema.sql` : seules les personnes ajoutées par un administrateur peuvent créer un compte et voir le contenu.
- Ne jamais mettre la clé *secret / service_role* ni le mot de passe de la base dans ce dépôt.
- Seuls les noms des adultes (chefs et cheftaines) sont enregistrés, jamais ceux des enfants.
