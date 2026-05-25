import { CHECKLIST_ITEMS } from "../data/checklists";
import { SCORE_KEYS, SNBT_SUBTESTS } from "../data/snbt";
import type {
  AppData,
  ChecklistColumn,
  ChecklistState,
  ScoreKey,
  SnbtResult,
  ThemeSettings,
  TryoutEntry,
  TryoutScores,
  UserProfile,
} from "../types/domain";

export const MAX_TRYOUT_ROWS = 100;
export const DEFAULT_TRYOUT_ROWS = 30;
export const SCORE_MIN = 0;
export const SCORE_MAX = 1200;
const REMOVED_DEFAULT_PLATFORM = "Team Tanpa Les Indonesia";

export const PUBLIC_THEME: ThemeSettings = {
  name: "Minimal",
  background: "#f7f7f4",
  surface: "#ffffff",
  surfaceStrong: "#eef0ec",
  text: "#20231f",
  muted: "#6e746c",
  primary: "#466653",
  accent: "#71796f",
  success: "#47765c",
  warning: "#8a6d3b",
  graphA: "#466653",
  graphB: "#68798a",
  graphC: "#9a8054",
};

export const PERSONAL_THEME: ThemeSettings = {
  name: "Bandung Institute of Technology",
  background: "#f4f8ff",
  surface: "#ffffff",
  surfaceStrong: "#e8f1ff",
  text: "#162033",
  muted: "#687186",
  primary: "#3f7fc4",
  accent: "#f0b66d",
  success: "#55a783",
  warning: "#d79a4a",
  graphA: "#3f7fc4",
  graphB: "#55a783",
  graphC: "#f0b66d",
};

export const EMPTY_PROFILE: UserProfile = {
  displayName: "",
  university: "",
  studyProgram: "",
  logoUrl: "",
  theme: PUBLIC_THEME,
};

export function createEmptyScores(): TryoutScores {
  return {
    pu: null,
    pbm: null,
    ppu: null,
    pk: null,
    lbi: null,
    lbe: null,
    pm: null,
  };
}

export function calculateTryoutAverage(scores: TryoutScores): number | null {
  const values = SCORE_KEYS.map((key) => scores[key]);
  if (values.some((value) => typeof value !== "number" || !Number.isFinite(value))) {
    return null;
  }

  const numericValues = values.map((value) => Number(value));
  const total = numericValues.reduce((sum, value) => sum + value, 0);
  return roundScore(total / values.length);
}

export function normalizeScoreInput(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") {
    return null;
  }

  const score = Number(trimmed);
  if (!isScoreInRange(score)) {
    return null;
  }

  return roundScore(score);
}

export function createDefaultTryouts(count = DEFAULT_TRYOUT_ROWS): TryoutEntry[] {
  return Array.from({ length: count }, (_, index) => ({
    id: cryptoSafeId(`tryout-${index + 1}`),
    entryNo: index + 1,
    date: "",
    platform: "",
    scores: createEmptyScores(),
    average: null,
  }));
}

export function ensureTryoutRows(rows: TryoutEntry[]): TryoutEntry[] {
  const sorted = [...rows].sort((a, b) => a.entryNo - b.entryNo);
  const required = Math.max(DEFAULT_TRYOUT_ROWS, sorted.length);
  const byEntry = new Map(sorted.map((entry) => [entry.entryNo, entry]));

  return Array.from({ length: required }, (_, index) => {
    const entryNo = index + 1;
    const existing = byEntry.get(entryNo);
    if (existing) {
      return {
        ...existing,
        platform: existing.platform === REMOVED_DEFAULT_PLATFORM ? "" : existing.platform,
        scores: { ...createEmptyScores(), ...existing.scores },
        average: calculateTryoutAverage({ ...createEmptyScores(), ...existing.scores }),
      };
    }
    return {
      id: cryptoSafeId(`tryout-${entryNo}`),
      entryNo,
      date: "",
      platform: "",
      scores: createEmptyScores(),
      average: null,
    };
  });
}

export function addTryoutRow(rows: TryoutEntry[]): TryoutEntry[] {
  if (rows.length >= MAX_TRYOUT_ROWS) {
    return rows;
  }

  const nextNo = rows.length + 1;
  return [
    ...rows,
    {
      id: cryptoSafeId(`tryout-${nextNo}`),
      entryNo: nextNo,
      date: "",
      platform: "",
      scores: createEmptyScores(),
      average: null,
    },
  ];
}

export function calculateSnbtScores(answers: Record<ScoreKey, number>): {
  results: SnbtResult[];
  average: number;
} {
  const results = SNBT_SUBTESTS.map((subtest) => {
    const correctAnswers = answers[subtest.id] ?? 0;
    if (!isValidAnswerCount(correctAnswers, subtest.questions)) {
      throw new RangeError(`${subtest.shortLabel} harus 0 sampai ${subtest.questions}.`);
    }
    const score = subtest.minScore + (correctAnswers / subtest.questions) * (subtest.maxScore - subtest.minScore);
    return { ...subtest, correctAnswers, score: roundScore(score) };
  });

  const average = roundScore(results.reduce((sum, result) => sum + result.score, 0) / results.length);
  return { results, average };
}

export function snbtResultsToTryoutScores(results: SnbtResult[]): TryoutScores {
  const scores = createEmptyScores();
  for (const result of results) {
    scores[result.id] = result.score;
  }
  return scores;
}

export function summarizeChecklist(state: ChecklistState) {
  const totals = {
    belajar: { done: 0, total: 0 },
    latsol: { done: 0, total: 0 },
    review: { done: 0, total: 0 },
  } satisfies Record<ChecklistColumn, { done: number; total: number }>;

  const bySection = new Map<string, { done: number; total: number }>();

  for (const item of CHECKLIST_ITEMS) {
    const section = bySection.get(item.section) ?? { done: 0, total: 0 };
    for (const column of item.columns) {
      totals[column].total += 1;
      section.total += 1;
      if (state[item.id]?.[column]) {
        totals[column].done += 1;
        section.done += 1;
      }
    }
    bySection.set(item.section, section);
  }

  const allDone = Object.values(totals).reduce((sum, item) => sum + item.done, 0);
  const allTotal = Object.values(totals).reduce((sum, item) => sum + item.total, 0);

  return {
    totals,
    overall: {
      done: allDone,
      total: allTotal,
      percent: percentage(allDone, allTotal),
    },
    sections: [...bySection.entries()].map(([section, values]) => ({
      section,
      ...values,
      percent: percentage(values.done, values.total),
    })),
  };
}

export function createInitialData(): AppData {
  return {
    profile: EMPTY_PROFILE,
    checklist: {},
    tryouts: createDefaultTryouts(),
  };
}

export function applyThemeToRoot(theme: ThemeSettings): void {
  const root = document.documentElement;
  const entries: Record<string, string> = {
    "--bg": theme.background,
    "--surface": theme.surface,
    "--surface-strong": theme.surfaceStrong,
    "--text": theme.text,
    "--muted": theme.muted,
    "--primary": theme.primary,
    "--accent": theme.accent,
    "--success": theme.success,
    "--warning": theme.warning,
    "--graph-a": theme.graphA,
    "--graph-b": theme.graphB,
    "--graph-c": theme.graphC,
  };

  for (const [key, value] of Object.entries(entries)) {
    root.style.setProperty(key, value);
  }
}

export function percentage(done: number, total: number): number {
  if (total <= 0) {
    return 0;
  }
  return Math.round((done / total) * 1000) / 10;
}

export function roundScore(value: number): number {
  return Math.round(value * 100) / 100;
}

function cryptoSafeId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2)}`;
}

function isScoreInRange(score: number): boolean {
  return Number.isFinite(score) && score >= SCORE_MIN && score <= SCORE_MAX;
}

function isValidAnswerCount(value: number, maxQuestions: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= maxQuestions;
}
