import { describe, expect, it } from "vitest";
import {
  addTryoutRow,
  calculateSnbtScores,
  calculateTryoutAverage,
  createDefaultTryouts,
  ensureTryoutRows,
  MAX_TRYOUT_ROWS,
  normalizeScoreInput,
  summarizeChecklist,
} from "../src/lib/calculations";
import { CHECKLIST_ITEMS } from "../src/data/checklists";
import type { ChecklistState, ScoreKey } from "../src/types/domain";

describe("tryout calculations", () => {
  it("creates 30 default rows", () => {
    const rows = createDefaultTryouts();
    expect(rows).toHaveLength(30);
    expect(rows.every((row) => row.platform === "")).toBe(true);
  });

  it("removes the old seeded platform from existing default rows", () => {
    const rows = createDefaultTryouts();
    rows[2] = { ...rows[2], platform: "Team Tanpa Les Indonesia" };
    expect(ensureTryoutRows(rows)[2].platform).toBe("");
  });

  it("does not add rows beyond 100", () => {
    let rows = createDefaultTryouts();
    while (rows.length < MAX_TRYOUT_ROWS) {
      rows = addTryoutRow(rows);
    }
    expect(addTryoutRow(rows)).toHaveLength(MAX_TRYOUT_ROWS);
  });

  it("calculates average only when all subtests are present", () => {
    expect(
      calculateTryoutAverage({
        pu: 600,
        pbm: 700,
        ppu: 800,
        pk: 900,
        lbi: 1000,
        lbe: 500,
        pm: 400,
      }),
    ).toBe(700);
    expect(
      calculateTryoutAverage({
        pu: 600,
        pbm: null,
        ppu: 800,
        pk: 900,
        lbi: 1000,
        lbe: 500,
        pm: 400,
      }),
    ).toBeNull();
  });

  it("accepts valid score range and rejects unsafe values", () => {
    expect(normalizeScoreInput("1200")).toBe(1200);
    expect(normalizeScoreInput("-1")).toBeNull();
    expect(normalizeScoreInput("1201")).toBeNull();
    expect(normalizeScoreInput("abc")).toBeNull();
  });
});

describe("SNBT calculator", () => {
  it("maps correct answers into min-max score ranges", () => {
    const answers: Record<ScoreKey, number> = {
      pu: 30,
      pbm: 20,
      ppu: 20,
      pk: 20,
      lbi: 30,
      lbe: 20,
      pm: 20,
    };
    const { average, results } = calculateSnbtScores(answers);
    expect(results.find((item) => item.id === "pk")?.score).toBe(1000);
    expect(results.find((item) => item.id === "pu")?.score).toBe(886.12);
    expect(average).toBeGreaterThan(900);
  });

  it("rejects answer counts outside each subtest total", () => {
    expect(() =>
      calculateSnbtScores({
        pu: 31,
        pbm: 0,
        ppu: 0,
        pk: 0,
        lbi: 0,
        lbe: 0,
        pm: 0,
      }),
    ).toThrow("PU");
  });
});

describe("checklist summary", () => {
  it("uses the full extracted source item count", () => {
    expect(CHECKLIST_ITEMS).toHaveLength(418);
    expect(new Set(CHECKLIST_ITEMS.map((item) => item.id)).size).toBe(CHECKLIST_ITEMS.length);
  });

  it("uses the public English fundamentals label without changing saved-state ids", () => {
    const legacyEnglishLabel = ["English", "Fundamentals"].join(" ");
    const englishFundamentals = CHECKLIST_ITEMS.filter(
      (item) => item.section === "Fundamental Literasi Bahasa Inggris",
    );

    expect(englishFundamentals.length).toBeGreaterThan(0);
    expect(CHECKLIST_ITEMS.every((item) => item.section !== legacyEnglishLabel)).toBe(true);
    expect(englishFundamentals.some((item) => item.id.includes("english-fundamentals"))).toBe(true);
  });

  it("summarizes checked fields", () => {
    const first = CHECKLIST_ITEMS[0];
    const state: ChecklistState = {
      [first.id]: { belajar: true },
    };
    const summary = summarizeChecklist(state);
    expect(summary.totals.belajar.done).toBe(1);
    expect(summary.overall.total).toBeGreaterThan(800);
  });
});
