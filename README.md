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

## Organisation des fichiers

| Fichier | Rôle |
| --- | --- |
| `index.html` | Page unique du site |
| `js/app.js` | Fonctionnement (connexion, pages, envoi de fichiers, discussion) |
| `js/data.js` | Textes des pôles (issus de la restructuration 2026/2027) |
| `js/config.js` | Adresse et clé publique du projet Supabase |
| `assets/` | Logo et styles |
| `supabase/schema.sql` | Tables, règles d'accès et données de départ |
| `.github/workflows/keepalive.yml` | Appel automatique tous les 3 jours pour éviter la mise en veille de Supabase |

## Sécurité

- La clé de `js/config.js` est une clé publique, prévue pour être visible. Les données sont protégées par les règles d'accès définies dans `supabase/schema.sql` : seules les personnes ajoutées par un administrateur peuvent créer un compte et voir le contenu.
- Ne jamais mettre la clé *secret / service_role* ni le mot de passe de la base dans ce dépôt.
- Seuls les noms des adultes (chefs et cheftaines) sont enregistrés, jamais ceux des enfants.
