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

export const CHANNELS = [
  { id: 'general', name: 'Général', h: "Toute l'unité" },
  { id: 'peda', name: 'Pédagogie', h: 'Pôles' },
  { id: 'formation', name: 'Formation & Relève', h: 'Pôles' },
  { id: 'event', name: 'Événementiel', h: 'Pôles' },
  { id: 'support', name: 'Logistique & trésorerie', h: 'Pôles' }
];

export const VALUES = ['Bienveillance', 'Amour', 'Écoute', 'Service', 'Entraide', 'Spiritualité', 'Responsabilité', 'Confiance en soi'];
