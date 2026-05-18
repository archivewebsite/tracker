export type ChecklistColumn = "belajar" | "latsol" | "review";

export type ChecklistItem = {
  id: string;
  kind: "fundamental" | "subject";
  section: string;
  level?: string;
  subtest?: string;
  materi?: string;
  topic: string;
  columns: ChecklistColumn[];
};

export type ChecklistState = Record<string, Partial<Record<ChecklistColumn, boolean>>>;

export type ScoreKey = "pu" | "pbm" | "ppu" | "pk" | "lbi" | "lbe" | "pm";

export type TryoutScores = Record<ScoreKey, number | null>;

export type TryoutEntry = {
  id: string;
  entryNo: number;
  date: string;
  platform: string;
  scores: TryoutScores;
  average: number | null;
};

export type ThemeSettings = {
  name: string;
  background: string;
  surface: string;
  surfaceStrong: string;
  text: string;
  muted: string;
  primary: string;
  accent: string;
  success: string;
  warning: string;
  graphA: string;
  graphB: string;
  graphC: string;
};

export type UserProfile = {
  displayName: string;
  university: string;
  studyProgram: string;
  logoUrl: string;
  theme: ThemeSettings;
};

export type AppData = {
  profile: UserProfile;
  checklist: ChecklistState;
  tryouts: TryoutEntry[];
};

export type SnbtSubtest = {
  id: ScoreKey;
  shortLabel: string;
  label: string;
  questions: number;
  minScore: number;
  maxScore: number;
  icon: string;
};

export type SnbtResult = SnbtSubtest & {
  correctAnswers: number;
  score: number;
};
