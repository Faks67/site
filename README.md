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
4. **Adresse du site** : *Authentication > URL Configuration*, mettre `https://scoutbaytulmahdi.github.io/` dans *Site URL* et dans *Redirect URLs*.
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

## Mise à jour 5 : réclamations (remboursement des achats)

1. **Base de données** : dans *SQL Editor > New query*, coller `supabase/05-reclamations.sql` et cliquer sur *Run*.
2. **Autorisations** : dans *Administration > Autorisations*, cocher *Réclamations* pour les chefs qui peuvent demander un remboursement, et *Remboursements* pour la personne qui rembourse (elle voit toutes les demandes et valide les remboursements). Les administrateurs ont les deux.
3. Les tickets de caisse sont rangés dans un espace privé à part (`justificatifs`) : seuls l'auteur de la demande et la personne chargée des remboursements peuvent les voir.

## Mise à jour 6 : présences, notifications par canal et messages non lus

1. **Base de données** : dans *SQL Editor > New query*, coller `supabase/06-presences-notifications.sql` et cliquer sur *Run*.
2. **Fonction d'envoi des notifications** : *Edge Functions > notify > Code*, remplacer tout le code par le nouveau contenu de `supabase/functions/notify/index.ts` et cliquer sur *Deploy*. Elle envoie maintenant les messages de chaque canal aux chefs qui l'ont choisi.
3. **Présences** : chaque chef est présent par défaut. Il indique son absence depuis l'accueil (prochain rendez-vous) ou en ouvrant l'événement dans le calendrier. Les personnes autorisées sur le calendrier peuvent marquer n'importe quel chef absent.
4. **Notifications** : chacun choisit ses canaux avec la cloche en haut de l'écran (par défaut : les annonces).

## Mise à jour 7 : réponses et GIF dans la discussion

1. **Base de données** : dans *SQL Editor > New query*, coller `supabase/07-reponses-gif.sql` et cliquer sur *Run*.
2. **Clé GIPHY** (gratuite) : sur [developers.giphy.com](https://developers.giphy.com/), *Create an App* > *API*, puis copier la clé dans `GIPHY_KEY` du fichier `js/config.js`.
3. Dans la discussion : appui long sur un message pour réagir, répondre, copier ou supprimer ; glisser un message vers la droite pour y répondre.

## Mise à jour 8 : heures de prière

Les horaires (méthode Jafari) sont calculés dans le téléphone par `js/prieres.js` : rien n'est stocké.

1. **Base de données** : dans *SQL Editor > New query*, coller `supabase/08-prieres.sql` et cliquer sur *Run*. Si Supabase signale que `pg_cron` ou `pg_net` n'est pas disponible, les activer dans *Database > Extensions*, puis relancer le script.
2. **Fonction d'envoi des notifications** : *Edge Functions > notify > Code*, remplacer tout le code par le nouveau `supabase/functions/notify/index.ts` et cliquer sur *Deploy*.
3. **Lieu de l'unité** : un administrateur ouvre la carte « Prochaine prière » de l'accueil et cherche l'adresse de référence (Paris par défaut).
4. **Notifications** : chacun coche « Heures de prière » avec la cloche pour être prévenu 10 minutes avant Fajr, Dhuhr et Maghrib.

## Mise à jour 9 : discussions des pôles, sondages, « vu par » et mentions

1. **Base de données** : dans *SQL Editor > New query*, coller `supabase/09-sondages-vu-mentions.sql` et cliquer sur *Run*.
2. **Fonction d'envoi des notifications** : *Edge Functions > notify > Code*, remplacer tout le code par le nouveau `supabase/functions/notify/index.ts` et cliquer sur *Deploy*. Elle n'envoie plus les messages d'un pôle qu'aux chefs qui y ont accès, et prévient les chefs mentionnés.
3. **Pôle de chaque chef** : dans *Administration > Chefs et cheftaines*, vérifier la colonne *Pôle*. Un chef voit *Annonces*, *Général* et le canal de son pôle seulement (un chef sans pôle ne voit aucun canal de pôle). Les administrateurs voient tout.
4. **Accès à d'autres pôles** : dans *Administration > Discussions des pôles*, cocher les canaux supplémentaires qu'un chef peut voir. Seuls les administrateurs peuvent le faire.
5. Dans la discussion :
   - **Sondage** : bouton 📊 à gauche de la zone d'écriture (une ou plusieurs réponses) ; toucher un choix pour voter, « Voir les votes » pour savoir qui a voté quoi.
   - **Vu par** : sous mes messages, ✓ = envoyé, ✓✓ = vu par certains, ✓✓ bleues = vu par tout le monde. Toucher les coches (ou appui long > *Infos*) pour voir qui l'a vu.
   - **Mentionner un chef** : taper `@` puis le début du prénom et choisir dans la liste. Le chef mentionné reçoit une notification même s'il ne suit pas ce canal.

## Mise à jour 10 : retrait du groupe Nour-Khaadimates

1. **Base de données** : dans *SQL Editor > New query*, coller `supabase/10-retrait-nour-khaadimates.sql` et cliquer sur *Run*.
2. Les cheftaines de ce groupe restent dans l'application sans groupe : les rattacher à un autre groupe depuis *Administration > Chefs et cheftaines* si besoin.

## Mise à jour 11 : nouvelle adresse du site

Le site est passé de `https://faks67.github.io/site/` à **https://scoutbaytulmahdi.github.io/** (organisation GitHub `scoutbaytulmahdi`, dépôt `scoutbaytulmahdi.github.io`).

1. **GitHub** : dans le dépôt `scoutbaytulmahdi/scoutbaytulmahdi.github.io`, *Settings > Pages*, *Deploy from a branch*, branche `main`, dossier `/ (root)`.
2. **Supabase, adresse du site** : *Authentication > URL Configuration*, remplacer l'ancienne adresse par `https://scoutbaytulmahdi.github.io/` dans *Site URL* et dans *Redirect URLs*.
3. **Supabase, notifications** : *Edge Functions > notify > Code*, remplacer tout le code par le nouveau `supabase/functions/notify/index.ts` et cliquer sur *Deploy*.
4. **Redirection de l'ancienne adresse** : sur le compte personnel `Faks67`, créer un nouveau dépôt public nommé `site`, y déposer le fichier `redirection/index.html` de ce dépôt (sous le nom `index.html`), puis activer *Settings > Pages* (branche `main`, dossier `/ (root)`). L'ancienne adresse renvoie alors vers la nouvelle.
5. **Chaque chef** : ouvrir la nouvelle adresse, remettre l'appli sur l'écran d'accueil (et supprimer l'ancienne icône), se reconnecter et réactiver les notifications avec la cloche.

## Mise à jour 12 : plusieurs pôles par chef et réunions de pôle

1. **Base de données** : dans *SQL Editor > New query*, coller `supabase/12-poles-multiples.sql` et cliquer sur *Run*. Le pôle actuel de chaque chef est conservé.
2. **Fonction d'envoi des notifications** (après l'étape 1) : *Edge Functions > notify > Code*, remplacer tout le code par le nouveau `supabase/functions/notify/index.ts` et cliquer sur *Deploy*. Un chef reçoit alors les messages de tous ses pôles.
3. **Pôles de chaque chef** : dans *Administration > Chefs et cheftaines*, toucher les pôles d'un chef pour les cocher ou décocher, puis *Enregistrer*. Il voit la discussion de chacun de ses pôles et apparaît dans chacun dans l'organigramme.
4. **Réunion de pôle** : dans le calendrier, en ajoutant un événement, cocher le ou les *Pôles concernés*. Seuls les membres de ces pôles sont attendus (présences, accueil). Sans pôle coché, rien ne change : tous les chefs sont concernés.

## Mise à jour 13 : pôle Voyages

1. **Base de données** : dans *SQL Editor > New query*, coller `supabase/13-pole-voyages.sql` et cliquer sur *Run*. Le pôle apparaît dans l'organigramme, la page Pôles, l'administration, le calendrier et a son canal de discussion « Voyages ».
2. **Fonction d'envoi des notifications** : *Edge Functions > notify > Code*, remplacer tout le code par le nouveau `supabase/functions/notify/index.ts` et cliquer sur *Deploy*. Les messages du canal Voyages ne sont envoyés qu'aux membres du pôle. La fonction lit désormais la liste des pôles dans la base : un futur pôle ne demandera plus de la redéployer.
3. **Membres** : dans *Administration > Chefs et cheftaines*, cocher *Voyages* pour les chefs du pôle, puis *Enregistrer*.

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
| `supabase/05-reclamations.sql` | Réclamations, justificatifs et autorisations de remboursement |
| `supabase/09-sondages-vu-mentions.sql` | Canaux des pôles réservés, sondages, « vu par » et mentions |
| `supabase/functions/notify/index.ts` | Envoi des notifications d'annonces |
| `sw.js`, `manifest.webmanifest` | Réception des notifications et installation sur l'écran d'accueil |
| `redirection/index.html` | Page à mettre sur l'ancienne adresse (`Faks67/site`) pour renvoyer vers la nouvelle |
| `.github/workflows/keepalive.yml` | Appel automatique tous les 3 jours pour éviter la mise en veille de Supabase |

## Sécurité

- La clé de `js/config.js` est une clé publique, prévue pour être visible. Les données sont protégées par les règles d'accès définies dans `supabase/schema.sql` : seules les personnes ajoutées par un administrateur peuvent créer un compte et voir le contenu.
- Ne jamais mettre la clé *secret / service_role* ni le mot de passe de la base dans ce dépôt.
- Seuls les noms des adultes (chefs et cheftaines) sont enregistrés, jamais ceux des enfants.
