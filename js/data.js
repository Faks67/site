// Contenu des pôles, tiré du document « Restructuration des Travailleurs de l'Imam 2026/2027 ».
export const POLE_CONTENT = {
  peda: {
    tag: 'Faire grandir les jeunes', lead: 'Responsable pédagogique',
    mission: "Garantir la qualité éducative des activités proposées aux jeunes. Ce pôle veille à ce que chaque groupe vive une expérience cohérente avec les valeurs de bienveillance, d'amour, d'écoute et de service.",
    missions: ['Accompagner les 8 référentes', 'Suivre la progression des 8 stagiaires', 'Être présente ponctuellement dans les groupes', 'Organiser les évaluations et bilans de trimestre'],
    objectif: "Réaliser un suivi individuel de chaque cheffe et stagiaire au moins une fois par trimestre, créer une banque de données et garantir la cohérence éducative.",
    compo: ['1 doyenne responsable', '2 cheffes expérimentées', '1 ou 2 stagiaires'], total: '4 à 5 personnes',
    blocks: [
      ['Projet pédagogique annuel', ["Déterminer le thème de l'année", 'Définir les objectifs éducatifs selon les besoins observés des enfants', 'Choisir les compétences à développer : confiance en soi, empathie, écoute, entraide, autonomie, responsabilité, spiritualité, leadership positif']],
      ['Soutien aux groupes', ['Proposer des jeux', "Construire des fiches d'activités", 'Adapter une activité à un âge précis', 'Trouver des outils pédagogiques (livres, films…)']],
      ["Bibliothèque d'activités", ['Banque de jeux', 'Banque de veillées', 'Activités autour des valeurs', 'Ateliers de réflexion']]
    ]
  },
  formation: {
    tag: 'Faire grandir les cheffes', lead: 'Responsable relève et formation',
    mission: "Le pôle qui prépare l'avenir : accompagner les stagiaires, encadrer les grandes qui veulent devenir cheffes et transmettre les valeurs.",
    missions: ['Accompagner les 8 stagiaires', 'Encadrer les grandes qui veulent devenir cheffes', 'Organiser des mini-formations', 'Mettre en place un mentorat stagiaires / référentes', "Préparer les équipes de l'année prochaine", 'Transmettre les valeurs'],
    objectif: "Former les 8 stagiaires et préparer 4 futures cheffes, avec 3 à 4 temps de formation dans l'année.",
    compo: ['1 doyenne responsable', '2 cheffes expérimentées', '2 stagiaires', '1 ou 2 grandes motivées'], total: '6 à 7 personnes',
    blocks: [
      ['Parcours des stagiaires', ['Observer', 'Conseiller', 'Fixer des objectifs', 'Organiser des retours constructifs']],
      ["Mini-formations de l'année", ['Animer un jeu', 'Prendre la parole', 'Gérer un groupe', 'Gérer un conflit', 'Organiser un week-end', 'Sécurité et responsabilités']]
    ]
  },
  event: {
    tag: "Faire vivre l'unité", lead: "Responsable projets d'unité et événementiel",
    motto: "« Créer des moments qui rapprochent les cœurs dans l'amour des Ahlul Bayt »",
    mission: "Coordonner les événements communs, créer des souvenirs, renforcer les liens et faire vivre l'identité des Travailleurs de l'Imam (ajf).",
    missions: ['Coordonner les événements communs', "Suivre l'avancement des projets", 'Valider les grandes décisions'],
    objectif: "Préparer 3 à 4 grands événements d'unité, former les stagiaires à la gestion de projet et impliquer les grandes qui souhaitent devenir cheffes.",
    compo: ['1 doyenne responsable', '2 à 3 cheffes responsables de projets', '2 stagiaires', '1 ou 2 grandes motivées (équipe relève)'], total: '6 à 8 personnes',
    blocks: [
      ['Projets possibles', ["Fête d'unité, iftar de l'unité", 'Journée familles', 'Veillées spirituelles adaptées aux âges', 'Action solidaire', 'Sortie réunissant les groupes', 'Camp', 'Activités parents / enfants', "Le restaurant de l'Imam (ajf)", 'Concours de Coran', 'Ziyarat, séjours ou gîtes', 'Les Scouts pâtissiers', 'Parc Astérix']]
    ]
  },
  voyage: {
    tag: 'Faire découvrir le monde', lead: 'Responsable voyages',
    mission: "Organiser les voyages des scouts : voyages humanitaires, séjours en gîte, ziyarat et sorties de plusieurs jours, pour vivre ensemble le service, la découverte et la fraternité.",
    missions: ['Proposer et préparer les voyages de l\'année', 'Trouver les hébergements (gîtes, centres, auberges)', 'Monter les voyages humanitaires avec des associations partenaires', 'Établir le budget avec la trésorerie et chercher des financements', 'Gérer les autorisations parentales et les documents de voyage', 'Préparer la sécurité, les transports et l\'encadrement'],
    objectif: "Organiser 1 à 2 voyages ou séjours par an, dont un projet humanitaire, en impliquant les jeunes dans la préparation.",
    compo: ['1 doyenne responsable', '2 cheffes responsables de séjours', '1 ou 2 stagiaires', '1 ou 2 grandes motivées'], total: '5 à 7 personnes',
    blocks: [
      ['Types de voyages', ['Voyage humanitaire', 'Séjour en gîte', 'Ziyarat', 'Camp et week-end nature', 'Sortie culturelle de plusieurs jours']],
      ['Préparation', ['Choix de la destination et des dates', 'Réservation hébergement et transport', 'Budget et participation des familles', 'Autorisations parentales, fiches sanitaires, assurances', 'Programme des activités et des temps spirituels']],
      ['Sur place et au retour', ["Répartition de l'encadrement", 'Gestion des imprévus', 'Bilan avec les chefs', 'Souvenirs à partager avec les familles']]
    ]
  },
  support: {
    tag: 'Indispensables au bon fonctionnement', lead: 'Responsables à désigner',
    mission: 'Les fonctions qui permettent aux groupes et aux pôles de fonctionner : budget, matériel, calendrier et communication.',
    missions: [], objectif: '', compo: [], total: '',
    blocks: [
      ['Trésorerie', ['Budget', 'Cotisations', 'Suivi des dépenses', 'Financement des projets']],
      ['Matériel & Logistique', ['Inventaire', 'Achats', 'Stockage', 'Préparation des activités et gîtes']],
      ['Planification', ['Calendrier annuel des sorties, buffets et gestion de la Salat', 'Réservations des activités, sorties et jeux', 'Coordination entre groupes']],
      ['Communication', ['Flyers', 'Lien avec les parents', 'Inscriptions']]
    ]
  }
};

export const CATS = [
  { id: 'officiel', name: 'Documents officiels', k: 'var(--c-blue)' },
  { id: 'cr', name: 'Comptes rendus', k: 'var(--c-purple)' },
  { id: 'activite', name: 'Fiches activités', k: 'var(--c-red)' },
  { id: 'peda', name: 'Pédagogie', k: 'var(--c-lime)' },
  { id: 'photo', name: 'Photos', k: 'var(--c-pink)' }
];

// Canaux des pôles (pole: true) : réservés aux chefs du pôle, sauf accès ouvert par un administrateur
export const CHANNELS = [
  { id: 'annonces', name: 'Annonces', h: "Toute l'unité", announce: true },
  { id: 'general', name: 'Général', h: "Toute l'unité" },
  { id: 'peda', pole: true, name: 'Pédagogie', h: 'Pôles' },
  { id: 'formation', pole: true, name: 'Formation & Relève', h: 'Pôles' },
  { id: 'event', pole: true, name: 'Événementiel', h: 'Pôles' },
  { id: 'voyage', pole: true, name: 'Voyages', h: 'Pôles' },
  { id: 'support', pole: true, name: 'Logistique & trésorerie', h: 'Pôles' }
];

export const VALUES = ['Bienveillance', 'Amour', 'Écoute', 'Service', 'Entraide', 'Spiritualité', 'Responsabilité', 'Confiance en soi'];

// Réactions rapides sous les messages
export const QUICK_REACTIONS = ['👍', '❤️', '😂', '🤲', '🙏', '✅'];

// Emojis proposés dans la zone d'écriture
export const EMOJIS = ['😀', '😁', '😂', '🥰', '😍', '😊', '😉', '😎', '🤔', '😅', '😢', '😮', '👍', '👏', '🙌', '🤲', '🙏', '💪', '👋', '✌️',
  '❤️', '💚', '💙', '💜', '✨', '⭐', '🔥', '🎉', '✅', '❌', '⚠️', '📣', '📅', '📍', '⏰', '📎', '📸', '🏕️', '⛺', '🌙', '🕌', '📖', '🎨', '⚽', '🍰', '🎁'];
