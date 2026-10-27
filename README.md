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

## Mise à jour 14 : documents sur Backblaze B2 (10 Go gratuits)

Les nouveaux documents de la bibliothèque sont rangés sur Backblaze B2 (bucket privé, 10 Go gratuits sans carte bancaire) au lieu du stockage Supabase (1 Go). Les anciens documents restent sur Supabase et s'ouvrent comme avant. Tant que la fonction n'est pas installée, le site continue d'utiliser Supabase.

1. **Backblaze** : un bucket **privé** et une clé d'application limitée à ce bucket (lecture et écriture). Aucun réglage CORS n'est nécessaire.
2. **Secrets** : *Edge Functions > Secrets*, ajouter `B2_KEY_ID`, `B2_APPLICATION_KEY`, `B2_BUCKET`, `B2_ENDPOINT` (ex. `s3.eu-central-003.backblazeb2.com`) et `B2_REGION` (ex. `eu-central-003`).
3. **Fonction** : *Edge Functions > Deploy a new function > Via Editor*, nommer la fonction `files`, coller `supabase/functions/files/index.ts` et cliquer sur *Deploy*. Dans ses réglages, désactiver *Verify JWT* (la fonction vérifie elle-même que l'utilisateur est un chef connecté).
4. **Vérifier** : déposer un petit document dans la Bibliothèque, puis l'ouvrir. Dans *Administration > Espace de stockage*, il est compté dans « Backblaze (nouveaux documents) ».

## Mise à jour 15 : pièces jointes dans la discussion

Le bouton 📎 de la discussion envoie une photo, une vidéo (25 Mo maximum), un PDF ou un document. Les fichiers sont rangés sur Backblaze B2 par la fonction `files`, les photos sont compressées avant l'envoi, et tout est **effacé automatiquement au bout de 30 jours** : le message reste avec la mention « Fichier expiré ». Ce qui doit être gardé va dans la Bibliothèque.

1. **Base de données** : dans *SQL Editor > New query*, coller `supabase/15-pieces-jointes.sql` et cliquer sur *Run*. Il ajoute les colonnes des pièces jointes et la tâche programmée qui fait le ménage chaque nuit.
2. **Fonction** : *Edge Functions > files > Code*, remplacer tout le code par le nouveau `supabase/functions/files/index.ts` et cliquer sur *Deploy* (*Verify JWT* reste désactivé).
3. Une pièce jointe n'est lisible que par les chefs qui voient le canal où elle a été envoyée.

## Mise à jour 16 : réunions de pôle privées

1. **Base de données** : dans *SQL Editor > New query*, coller `supabase/16-reunions-poles-privees.sql` et cliquer sur *Run*.
2. Une réunion de pôle (événement avec des *Pôles concernés* cochés) n'est plus visible que par les membres de ces pôles, les administrateurs, la personne qui l'a créée et les chefs qui ont l'autorisation **Réunions de pôle** (à cocher dans *Administration*, fiche du chef > *Autorisations*). Les autres chefs ne la reçoivent pas du tout : ni calendrier, ni carte, ni accueil.
3. L'autorisation **Calendrier** sert seulement à ajouter, modifier et supprimer des événements : elle ne permet plus de voir les réunions des autres pôles.

## Mise à jour 17 : nouvelle Discussion (messages privés, vocaux, liste des conversations)

1. **Base de données** : dans *SQL Editor > New query*, coller `supabase/17-discussion-messages-prives.sql` et cliquer sur *Run*.
2. **Fonction `notify`** : *Edge Functions > notify > Code*, remplacer tout le code par le nouveau `supabase/functions/notify/index.ts`, puis *Deploy*. Un message privé prévient toujours l'autre chef.
3. **Fonction `files`** : *Edge Functions > files > Code*, remplacer tout le code par le nouveau `supabase/functions/files/index.ts`, puis *Deploy* (*Verify JWT* reste désactivé). Les photos et vocaux d'une conversation privée ne sont lisibles que par les deux chefs.
4. Dans le site :
   - **Liste des conversations** : canaux et messages privés triés par dernier message, avec l'auteur, l'heure (5 min, 1 h, Hier…) et les non-lus ; recherche et filtres *Tout / Non lus / Canaux / Privés*.
   - **Nouveau** : écrire en privé à n'importe quel chef. La conversation n'est visible que par les deux chefs, pas même par les administrateurs.
   - **Barre d'écriture** : « + » (photo/vidéo, appareil photo, document, sondage, position, événement), GIF dans le champ, micro à droite (la flèche d'envoi apparaît dès qu'on écrit).
   - **Message vocal** : maintenir le micro, relâcher pour envoyer ; glisser à gauche pour annuler, vers le haut pour verrouiller. Comme les autres pièces jointes, les vocaux sont effacés au bout de 30 jours.
   - **En ligne / vu il y a…** : affiché dans les conversations privées.

## Mise à jour 18 : conversations épinglées

1. **Base de données** : dans *SQL Editor > New query*, coller `supabase/18-conversations-epinglees.sql` et cliquer sur *Run*.
2. Dans la Discussion : **appui long** (ou clic droit sur ordinateur) sur une conversation > *Épingler en haut*, ou bouton *Épingler* dans la fiche de la conversation (toucher l'en-tête). Jusqu'à 5 conversations épinglées, gardées sur tous les appareils de chaque chef.

## Mise à jour 19 : pas de notification dans l'appli, « … écrit », appli plus fluide

1. **Base de données** : dans *SQL Editor > New query*, coller `supabase/19-presence-active.sql` et cliquer sur *Run*.
2. **Fonction `notify`** : *Edge Functions > notify > Code*, remplacer tout le code par le nouveau `supabase/functions/notify/index.ts`, puis *Deploy*. Elle n'envoie plus de notification aux chefs qui ont l'appli ouverte (ils voient une bannière en haut de l'écran à la place).
3. Dans le site :
   - **« … écrit » / « … enregistre un vocal »** dans l'en-tête de la conversation et dans la liste (signal éphémère, rien n'est enregistré).
   - **Envoi instantané** : le message, la photo ou le vocal s'affiche tout de suite (🕓), puis ✓ quand le serveur l'a reçu.
   - **Ouverture instantanée** : les conversations restent en mémoire et celles du haut de la liste sont préchargées ; au lancement, l'appli s'affiche aussitôt avec la dernière session (copie locale effacée à la déconnexion), puis se met à jour.
   - **Vocaux** : la barre d'enregistrement apparaît dès l'appui, et ▶ joue tout de suite (liens préparés à l'avance).

## Mise à jour 20 : le Défi du jour

1. **Base de données** : dans *SQL Editor > New query*, coller `supabase/20-defi-du-jour.sql` et cliquer sur *Run*, puis faire de même avec `supabase/21-defi-questions.sql` (les 100 questions). Ce second script peut être relancé après une correction des questions (`supabase/defi-questions.json` en est la source).
2. Dans le site :
   - **Question du jour** : une question à 4 choix par jour, disponible à minuit (heure de Paris). Au premier lancement de la journée, une fenêtre s'ouvre ; « Commencer » lance le chrono, « Plus tard » la referme (la carte violette de l'accueil reste là).
   - **Points** : 30 secondes, 100 points pour une réponse immédiate, −5 points toutes les 2 secondes ; mauvaise réponse ou temps écoulé : 0. Le chrono et la correction sont faits par le serveur : la bonne réponse n'arrive sur le téléphone qu'après avoir répondu, et une seule réponse compte.
   - **Manches de 2 semaines** (lundi → dimanche suivant, la première commence le lundi 26 octobre 2026) : semaine 1 sur l'islam de base, semaine 2 sur les Ahlul Bayt et le fiqh ja'farite.
   - **Onglet « Défi »** : classement en direct (podium, points, bonnes réponses), gagnant de la manche précédente et règles.

## Mise à jour 22 : l'assistant (Gemini)

1. **Clé Gemini** (gratuite, sans carte) : sur [aistudio.google.com](https://aistudio.google.com), *Dashboard > API keys > Create API key*. Dans Supabase, *Edge Functions > Secrets* : ajouter `GEMINI_API_KEY` avec cette clé. Ne jamais activer la facturation (« billing ») chez Google.
2. **Base de données** : dans *SQL Editor > New query*, coller `supabase/22-assistant.sql` et cliquer sur *Run*. Limites : 15 questions par chef et par jour, 400 pour tout le monde (à changer dans `ai_limits()` puis relancer le script).
3. **Fonction `assistant`** : *Edge Functions > Deploy a new function > Via Editor*, nom **`assistant`**, coller `supabase/functions/assistant/index.ts`, *Deploy*, puis laisser **Verify JWT désactivé** (la fonction vérifie elle-même). Modèle : `gemini-3.8-flash` (secret facultatif `GEMINI_MODEL` pour en changer).
4. Dans le site :
   - **Onglet « Assistant »** (menu Plus sur téléphone) et carte sur l'accueil : suggestions prêtes (grand jeu, sortie, veillée, annonce aux parents, programme du mois), réponses mises en forme.
   - Sous chaque réponse : **Envoyer dans une discussion** (le texte est placé dans le champ, à relire avant d'envoyer), **Copier**, **Autre idée**.
   - L'assistant connaît le calendrier des 60 prochains jours, les groupes et les pôles, seulement ce que le chef voit déjà. Il ne donne pas d'avis de fiqh et renvoie vers le responsable religieux.
   - Les conversations restent sur le téléphone (rien n'est enregistré dans la base). Avec la formule gratuite, Google peut utiliser les questions pour améliorer ses modèles : ne pas y mettre d'informations personnelles sur les enfants.

## Mise à jour 23 : appels audio et vidéo

1. **Base de données** : dans *SQL Editor > New query*, coller `supabase/23-appels.sql` et cliquer sur *Run*.
2. **Fonction `notify`** : *Edge Functions > notify > Code*, remplacer tout le code par le nouveau `supabase/functions/notify/index.ts`, puis *Deploy* (notification « 📹 Appel de… » qui reste affichée).
3. **Relais Cloudflare (facultatif, conseillé)** : sans lui, environ 1 appel sur 10 peut ne pas se connecter sur certains réseaux (4G, box, entreprise).
   - Créer un compte gratuit sur [dash.cloudflare.com](https://dash.cloudflare.com) (sans carte), puis *Realtime > TURN Server > Create* : noter le **Turn Token ID** et l'**API Token**.
   - Supabase, *Edge Functions > Secrets* : `CF_TURN_KEY_ID` (Turn Token ID) et `CF_TURN_API_TOKEN` (API Token).
   - *Edge Functions > Deploy a new function > Via Editor*, nom **`turn`**, coller `supabase/functions/turn/index.ts`, *Deploy*, **Verify JWT désactivé**.
4. Dans le site :
   - Boutons 📞 et 🎥 en haut de chaque conversation (sauf Annonces). En privé, l'autre chef voit un écran d'appel avec sonnerie (ou reçoit une notification si l'appli est fermée) : Refuser, Audio seul, Répondre.
   - Dans un canal : appel de groupe, bandeau « Appel en cours · Rejoindre » et bouton dans l'historique ; jusqu'à 8 personnes en vidéo (au-delà, on rejoint caméra coupée).
   - Pendant l'appel : micro, caméra (activable en cours d'appel), retourner la caméra (téléphone), partage d'écran avec le son (ordinateur, Chrome ou Edge), réactions, main levée, liste des membres, réduire l'appel pour continuer à utiliser l'appli, contour vert sur celui qui parle.
   - Historique dans la conversation : appel vidéo/audio et durée, « Appel manqué · Rappeler », « Sans réponse ».
   - Les images et le son passent directement d'un appareil à l'autre (WebRTC, chiffré) : rien n'est enregistré, la base ne garde que l'heure et la durée.

## Mise à jour 24 : calendrier plus fluide et réunions en ligne

1. **Base de données** : dans *SQL Editor > New query*, coller `supabase/24-reunions-en-ligne.sql` et cliquer sur *Run*.
2. Dans le site :
   - **Vue Mois réparée** : les jours sont de nouveau bien alignés sous leur jour de la semaine (une règle de l'administration écrasait la grille).
   - **Navigation fluide** : seul le calendrier se redessine (avec un léger glissement), glisser à gauche / à droite sur téléphone pour changer de période, flèches ← → et touche T sur ordinateur ; l'affichage choisi est retenu.
   - **Nouvelle vue « Planning »** : les 30 prochains jours en liste (lieu ou visio, nombre d'absents), idéale sur téléphone.
   - **Barre compacte** sur téléphone, bouton rond « + » pour ajouter un événement ; en Mois, toucher deux fois un jour ouvre la vue Jour ; en Jour / Semaine, le calendrier s'ouvre sur l'heure actuelle.
   - **Réunion en ligne** : dans un événement, « Où ? » → *Sur place* (lieu et adresse) ou *En ligne* : appel vidéo dans une conversation de l'appli, ou lien Zoom / Google Meet / Teams. Un bouton « Rejoindre » apparaît sur l'événement et sur l'accueil.
   - Formulaire : la date et l'heure de fin suivent automatiquement le début.

## Mise à jour 25 : notifications d'appel et micro

1. **Fonction `notify`** : *Edge Functions > notify > Code*, remplacer tout le code par le nouveau `supabase/functions/notify/index.ts`, puis *Deploy*. Pas de nouveau script SQL.
2. Dans le site :
   - **Appels dans les notifications** : réglage « 📞 Appels » dans la cloche (activé par défaut). La notification d'appel part vers tous les chefs de la conversation, même si l'appli vient d'être fermée ou si le canal est en sourdine ; elle vibre longtemps, reste affichée, et a les boutons Répondre / Refuser (Android, ordinateur).
   - Toucher la notification ouvre directement l'écran d'appel (Répondre / Rejoindre) tant que l'appel continue.
   - Appel privé sans réponse : la notification devient « 📵 Appel manqué ».
   - **Micro** : sur iPhone, le micro reste ouvert tant que la conversation est ouverte (plus de demande d'autorisation à chaque vocal), et l'appel réutilise ce micro. Il se ferme en quittant la conversation ou l'appli.

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
| `supabase/functions/files/index.ts` | Envoi, lecture et suppression des documents et pièces jointes sur Backblaze B2, ménage des pièces jointes de plus de 30 jours |
| `supabase/functions/notify/index.ts` | Envoi des notifications d'annonces |
| `sw.js`, `manifest.webmanifest` | Réception des notifications et installation sur l'écran d'accueil |
| `redirection/index.html` | Page à mettre sur l'ancienne adresse (`Faks67/site`) pour renvoyer vers la nouvelle |
| `.github/workflows/keepalive.yml` | Appel automatique tous les 3 jours pour éviter la mise en veille de Supabase |

## Sécurité

- La clé de `js/config.js` est une clé publique, prévue pour être visible. Les données sont protégées par les règles d'accès définies dans `supabase/schema.sql` : seules les personnes ajoutées par un administrateur peuvent créer un compte et voir le contenu.
- Ne jamais mettre la clé *secret / service_role* ni le mot de passe de la base dans ce dépôt.
- Seuls les noms des adultes (chefs et cheftaines) sont enregistrés, jamais ceux des enfants.
