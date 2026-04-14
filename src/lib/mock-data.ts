export interface Cohort {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  capacity: number;
  enrolled: number;
  status: "active" | "upcoming" | "archived";
  description: string;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  cohortId: string;
  enrolledAt: string;
  progress: number;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  cohortId: string;
  createdAt: string;
  author: string;
}

export interface Resource {
  id: string;
  title: string;
  type: "pdf" | "video" | "link";
  url: string;
  cohortId: string;
  createdAt: string;
}

export const cohorts: Cohort[] = [
  {
    id: "1",
    name: "Janvier 2026",
    startDate: "2026-01-05",
    endDate: "2026-03-27",
    capacity: 25,
    enrolled: 22,
    status: "active",
    description: "Maîtrisez les fondamentaux du design graphique : typographie, composition et couleur.",
  },
  {
    id: "2",
    name: "Genius",
    startDate: "2026-05-04",
    endDate: "2026-07-24",
    capacity: 25,
    enrolled: 8,
    status: "upcoming",
    description: "Perfectionnez vos compétences en identité visuelle, branding et direction artistique.",
  },
  {
    id: "3",
    name: "Visionnaire",
    startDate: "2026-09-07",
    endDate: "2026-11-27",
    capacity: 25,
    enrolled: 0,
    status: "upcoming",
    description: "Explorez le design digital, le motion design et les tendances créatives de demain.",
  },
];

export const students: Student[] = [
  { id: "1", name: "Aminata Diallo", email: "aminata@email.com", cohortId: "1", enrolledAt: "2025-12-15", progress: 75 },
  { id: "2", name: "Jean-Pierre Kouassi", email: "jp.kouassi@email.com", cohortId: "1", enrolledAt: "2025-12-18", progress: 68 },
  { id: "3", name: "Fatou Ndiaye", email: "fatou.n@email.com", cohortId: "1", enrolledAt: "2025-12-20", progress: 82 },
  { id: "4", name: "Oumar Traoré", email: "oumar.t@email.com", cohortId: "1", enrolledAt: "2025-12-22", progress: 55 },
  { id: "5", name: "Marie-Claire Bamba", email: "mc.bamba@email.com", cohortId: "1", enrolledAt: "2026-01-02", progress: 90 },
  { id: "6", name: "Ibrahima Sow", email: "ibrahima.s@email.com", cohortId: "2", enrolledAt: "2026-02-10", progress: 0 },
  { id: "7", name: "Aïssatou Barry", email: "aissatou.b@email.com", cohortId: "2", enrolledAt: "2026-02-12", progress: 0 },
];

export const announcements: Announcement[] = [
  {
    id: "1",
    title: "Bienvenue dans la cohorte Janvier 2026 !",
    content: "Nous sommes ravis de vous accueillir. Les cours commencent le 5 janvier.",
    cohortId: "1",
    createdAt: "2026-01-03",
    author: "Staff Formation",
  },
  {
    id: "2",
    title: "Nouveau module disponible",
    content: "Le module sur la typographie avancée est maintenant accessible.",
    cohortId: "1",
    createdAt: "2026-02-01",
    author: "Staff Formation",
  },
];

export const resources: Resource[] = [
  { id: "1", title: "Guide typographie", type: "pdf", url: "#", cohortId: "1", createdAt: "2026-01-05" },
  { id: "2", title: "Intro au branding", type: "video", url: "#", cohortId: "1", createdAt: "2026-01-12" },
  { id: "3", title: "Ressources Figma", type: "link", url: "#", cohortId: "1", createdAt: "2026-01-20" },
];
