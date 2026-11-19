export interface ExperienceItem {
  period: string;
  role: string;
  company: string;
  location: string;
  highlights: string[];
}

export interface EducationItem {
  period: string;
  title: string;
  institution: string;
  details: string;
}

export interface LanguageSkill {
  language: string;
  level: string;
  description: string;
  code: "fr" | "en" | "es";
}

export interface SuggestedPrompt {
  id: string;
  language: "fr" | "en" | "es";
  label: string;
  prompt: string;
}

export const CV_PDF_URL =
  "/assets/aistudio/CV_Marion_Server_-_Alternance__20261119_094150_0000_db35a37c.pdf";

export const PROFILE = {
  fullName: "Marion Server",
  assistantName: "Maud",
  targetRole: "Alternance · Commercial Événementiel",
  rhythm: "Rythme 1 jour école / 4 jours entreprise · 2026 – 2028",
  location: "94100, Île-de-France",
  phone: "06 20 23 66 43",
  email: "marionsb3126@gmail.com",
  summary:
    "Candidate en MBA Production événementielle à l'ISEFAC Paris, formée dans l'hôtellerie de luxe et la gestion de groupes et séminaires chez Hilton, Crowne Plaza et Marriott.",
};

export const LANGUAGES: LanguageSkill[] = [
  {
    language: "Français",
    level: "Langue native",
    description: "Expression fluide, soignée et adaptée à la relation client haut de gamme.",
    code: "fr",
  },
  {
    language: "Anglais",
    level: "Courant · Niveau B2",
    description: "Pratique professionnelle fluide pour l'accueil, la négociation et l'événementiel international.",
    code: "en",
  },
  {
    language: "Espagnol",
    level: "Intermédiaire · Niveau B1",
    description: "Échanges conversationnels simples et compréhension des demandes courantes.",
    code: "es",
  },
];

export const EXPERIENCES: ExperienceItem[] = [
  {
    period: "Fév. – Mai 2026",
    role: "Attachée commerciale",
    company: "Hilton Garden Inn Paris La Villette",
    location: "Paris",
    highlights: [
      "Gestion autonome du service commercial événements.",
      "Développement et suivi des dossiers clients, de la demande à la réalisation de l'événement.",
      "Organisation et coordination d'événements sur mesure et animation des réunions interservices.",
      "Gestion des dossiers de remboursement avec le service finance et amélioration des procédures.",
    ],
  },
  {
    period: "Mars – Sept. 2025",
    role: "Stage Groups & Conferences Event Planner",
    company: "Crowne Plaza République",
    location: "Paris",
    highlights: [
      "Gestion des demandes clients, élaboration des propositions commerciales et optimisation tarifaire.",
      "Suivi commercial complet : relances, négociation et contractualisation.",
      "Coordination des événements avec les clients et les équipes opérationnelles, visites clients.",
      "Gestion administrative des dossiers, acomptes et rooming lists.",
    ],
  },
  {
    period: "Juin – Sept. 2024",
    role: "Réceptionniste",
    company: "Grand Hôtel",
    location: "Perros-Guirec",
    highlights: [
      "Accueil clientèle, gestion des arrivées et départs, suivi de la satisfaction client.",
    ],
  },
  {
    period: "Fév. – Juin 2024",
    role: "Stage à la réception",
    company: "L'Agapa",
    location: "Perros-Guirec",
    highlights: [
      "Réception en hôtellerie de charme, conciergerie et coordination de séjour.",
    ],
  },
  {
    period: "Janv. – Juil. 2023",
    role: "Réceptionniste (Stage puis CDD)",
    company: "Hôtel Marriott des Champs-Élysées",
    location: "Paris",
    highlights: [
      "Accueil international en hôtellerie cinq étoiles sur les Champs-Élysées.",
    ],
  },
  {
    period: "Juin – Juil. 2022",
    role: "Serveuse en extra",
    company: "Traiteur La Toque Vendômoise",
    location: "Vendôme",
    highlights: [
      "Service événementiel et mise en place lors de réceptions.",
    ],
  },
];

export const EDUCATION: EducationItem[] = [
  {
    period: "2026 – 2028",
    title: "MBA Production événementielle en alternance",
    institution: "ISEFAC · Paris 10e",
    details: "Rythme 1 jour à l'école / 4 jours en entreprise",
  },
  {
    period: "2025",
    title: "Bachelor in Luxury and Sustainable Hotel Management",
    institution: "ICARE · Paris 20e",
    details: "Management hôtelier haut de gamme et durable",
  },
  {
    period: "2022",
    title: "Baccalauréat STHR",
    institution: "Lycée Hôtelier de Blois",
    details: "Mention Assez Bien",
  },
];

export const SKILLS_GROUPS = [
  {
    title: "Commercial & relation client",
    items: "Devis · Négociation · Fidélisation · Suivi clients · Optimisation tarifaire",
  },
  {
    title: "Gestion événementielle",
    items: "Coordination d'événements sur mesure · Visites clients · Réunions interservices · Suivi opérationnel",
  },
  {
    title: "Administration & dossiers",
    items: "Contrats · Acomptes · Relances · Rooming lists · Suivi financier",
  },
  {
    title: "Outils & logiciels",
    items: "Opera · Salesforce · OnQ · Mews · Pack Office",
  },
  {
    title: "Qualités & compléments",
    items: "Autonomie · Organisation · Rigueur · Esprit d'équipe · Permis B · Agrément employé de jeu",
  },
];

export const INTERESTS = [
  "Musculation (bodybuilding)",
  "Voyages : Royaume-Uni, Espagne, Corse, Italie, Crète, Île de la Réunion",
  "Cinéma",
  "Création d'ongles en gel et nail art",
];

export const SUGGESTED_PROMPTS: SuggestedPrompt[] = [
  {
    id: "intro-fr",
    language: "fr",
    label: "Présenter le profil de Marion",
    prompt: "Bonjour Maud, peux-tu me présenter brièvement le profil de Marion Server et ce qu'elle recherche pour son alternance ?",
  },
  {
    id: "hilton-fr",
    language: "fr",
    label: "Son rôle chez Hilton Garden Inn",
    prompt: "Quelles étaient ses missions en tant qu'attachée commerciale au Hilton Garden Inn Paris La Villette ?",
  },
  {
    id: "english-en",
    language: "en",
    label: "Interview in English",
    prompt: "Hello Maud, could you tell me in English about Marion's experience at Crowne Plaza and Marriott?",
  },
  {
    id: "spanish-es",
    language: "es",
    label: "Un poco en español",
    prompt: "Hola Maud, ¿puedes hablarme un poco en español de la formación de Marion y de los programas que domina?",
  },
];
