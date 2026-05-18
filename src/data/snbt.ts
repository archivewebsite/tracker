import type { SnbtSubtest } from "../types/domain";

export const SNBT_SUBTESTS = [
  {
    id: "ppu",
    shortLabel: "PPU",
    label: "Pengetahuan dan Pemahaman Umum",
    questions: 20,
    minScore: 159.87,
    maxScore: 875.92,
    icon: "solar:book-2-linear",
  },
  {
    id: "pu",
    shortLabel: "PU",
    label: "Penalaran Umum",
    questions: 30,
    minScore: 131.21,
    maxScore: 886.12,
    icon: "solar:brain-linear",
  },
  {
    id: "pbm",
    shortLabel: "PBM",
    label: "Pemahaman Bacaan dan Menulis",
    questions: 20,
    minScore: 160.53,
    maxScore: 857.13,
    icon: "solar:pen-new-square-linear",
  },
  {
    id: "pk",
    shortLabel: "PK",
    label: "Pengetahuan Kuantitatif",
    questions: 20,
    minScore: 192,
    maxScore: 1000,
    icon: "solar:calculator-linear",
  },
  {
    id: "lbi",
    shortLabel: "LBI",
    label: "Literasi Bahasa Indonesia",
    questions: 30,
    minScore: 126.31,
    maxScore: 870.76,
    icon: "solar:text-field-focus-linear",
  },
  {
    id: "pm",
    shortLabel: "PM",
    label: "Penalaran Matematika",
    questions: 20,
    minScore: 242.38,
    maxScore: 1000,
    icon: "solar:functions-linear",
  },
  {
    id: "lbe",
    shortLabel: "LBE",
    label: "Literasi Bahasa Inggris",
    questions: 20,
    minScore: 233.76,
    maxScore: 885.75,
    icon: "solar:translation-2-linear",
  },
] satisfies SnbtSubtest[];

export const SCORE_KEYS = ["pu", "pbm", "ppu", "pk", "lbi", "lbe", "pm"] as const;

export const SCORE_LABELS = {
  pu: "PU",
  pbm: "PBM",
  ppu: "PPU",
  pk: "PK",
  lbi: "LBI",
  lbe: "LBE",
  pm: "PM",
} as const;
