import type { AppData } from "../types/domain";
import { createInitialData, ensureTryoutRows, PUBLIC_THEME } from "./calculations";

const DEMO_STORAGE_KEY = "tracker-demo-v1";
const DEMO_PROFILE = {
  displayName: "Pengguna Demo",
  university: "Universitas Tujuan",
  studyProgram: "Program Studi Tujuan",
  logoUrl: "",
  theme: PUBLIC_THEME,
};

export function loadDemoData(): AppData {
  const fallback = {
    ...createInitialData(),
    profile: DEMO_PROFILE,
  };

  try {
    const raw = localStorage.getItem(DEMO_STORAGE_KEY);
    if (!raw) {
      return fallback;
    }
    const parsed = { ...fallback, ...JSON.parse(raw) } as AppData;
    return {
      ...parsed,
      profile: { ...fallback.profile, ...parsed.profile },
      tryouts: ensureTryoutRows(parsed.tryouts ?? []),
    };
  } catch {
    return fallback;
  }
}

export function saveDemoData(data: AppData): void {
  localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(data));
}
