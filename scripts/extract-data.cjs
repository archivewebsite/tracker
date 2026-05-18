const fs = require("node:fs");
const path = require("node:path");

const sourceDir = process.env.TRACKER_SOURCE_DIR;
const outputPath = path.join(process.cwd(), "src", "data", "checklists.ts");

if (!sourceDir) {
  console.error("Set TRACKER_SOURCE_DIR to the exported spreadsheet HTML folder.");
  process.exit(1);
}

const subjectFiles = [
  { file: "PU.html", page: "Penalaran Umum" },
  { file: "PBM PPU.html", page: "PBM/PPU" },
  { file: "PK PM.html", page: "PK/PM" },
  { file: "LBInd.html", page: "Literasi Bahasa Indonesia" },
  { file: "LBEng.html", page: "Literasi Bahasa Inggris" },
];

const fundamentalSections = [
  { start: 14, end: 72, name: "Fundamental Logika" },
  { start: 75, end: 157, name: "Fundamental Matematika" },
  { start: 160, end: 226, name: "Fundamental Literasi Bahasa Indonesia" },
  { start: 229, end: 327, name: "Fundamental Literasi Bahasa Inggris", idSlug: "english-fundamentals" },
];

function decode(value) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

function strip(html) {
  return decode(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function valueFromCell(html) {
  if (/#checked-checkbox-id/.test(html) && !/#unchecked-checkbox-id/.test(html)) {
    return true;
  }
  if (/#unchecked-checkbox-id/.test(html)) {
    return false;
  }
  return strip(html);
}

function parseMatrix(file) {
  const html = fs.readFileSync(path.join(sourceDir, file), "utf8");
  const rows = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((m) => m[1]);
  const grid = [];
  const spans = [];

  rows.forEach((rowHtml, rowIndex) => {
    grid[rowIndex] = [];
    let colIndex = 0;
    const fillSpans = () => {
      while (spans[colIndex]) {
        grid[rowIndex][colIndex] = spans[colIndex].value;
        spans[colIndex].remaining -= 1;
        if (spans[colIndex].remaining <= 0) {
          spans[colIndex] = null;
        }
        colIndex += 1;
      }
    };

    fillSpans();
    for (const match of rowHtml.matchAll(/<(td|th)\b([^>]*)>([\s\S]*?)<\/\1>/gi)) {
      const attrs = match[2];
      const value = valueFromCell(match[3]);
      const colspan = Number(attrs.match(/colspan=["']?(\d+)/i)?.[1] ?? 1);
      const rowspan = Number(attrs.match(/rowspan=["']?(\d+)/i)?.[1] ?? 1);

      for (let span = 0; span < colspan; span += 1) {
        fillSpans();
        grid[rowIndex][colIndex] = value;
        if (rowspan > 1) {
          spans[colIndex] = { value, remaining: rowspan - 1 };
        }
        colIndex += 1;
      }
    }
  });

  return grid;
}

function slug(value) {
  return String(value)
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

function extractFundamental() {
  const grid = parseMatrix("Fundamental Tables.html");
  const rows = [];
  let ordinal = 1;

  for (const section of fundamentalSections) {
    for (let rowNumber = section.start; rowNumber <= section.end; rowNumber += 1) {
      const row = grid[rowNumber - 1] || [];
      if (typeof row[4] !== "boolean" || typeof row[5] !== "boolean") {
        continue;
      }
      const level = String(row[2] || "").trim();
      const topic = String(row[3] || "").trim();
      if (!level || !topic) {
        continue;
      }
      const sectionSlug = section.idSlug || slug(section.name);
      rows.push({
        id: `fundamental-${ordinal}-${sectionSlug}-${slug(level)}-${slug(topic)}`,
        kind: "fundamental",
        section: section.name,
        level,
        topic,
        columns: ["belajar", "latsol"],
      });
      ordinal += 1;
    }
  }

  return rows;
}

function extractSubjectRows() {
  const rows = [];
  let ordinal = 1;

  for (const { file, page } of subjectFiles) {
    const grid = parseMatrix(file);
    for (const row of grid) {
      const firstBoolIndex = row.findIndex((value) => typeof value === "boolean");
      const bools = row.filter((value) => typeof value === "boolean");
      if (!bools.length) {
        continue;
      }
      const hasReview = bools.length === 3;
      const textCells = row
        .slice(1, firstBoolIndex)
        .map((value) => String(value || "").trim())
        .filter(Boolean);
      const subtest = textCells[0] || page;
      const materi = textCells.length >= 3 ? textCells[1] : "";
      const topic = textCells.length >= 3 ? textCells[2] : textCells[1] || "";
      if (!topic) {
        continue;
      }
      rows.push({
        id: `subject-${ordinal}-${slug(page)}-${slug(subtest)}-${slug(materi)}-${slug(topic)}`,
        kind: "subject",
        section: page,
        subtest,
        materi,
        topic,
        columns: hasReview ? ["belajar", "latsol", "review"] : ["belajar", "latsol"],
      });
      ordinal += 1;
    }
  }

  return rows;
}

const data = [...extractFundamental(), ...extractSubjectRows()];

const content = `import type { ChecklistItem } from "../types/domain";

export const CHECKLIST_ITEMS = ${JSON.stringify(data, null, 2)} satisfies ChecklistItem[];
`;

fs.writeFileSync(outputPath, content, "utf8");
console.log(`Wrote ${data.length} checklist items to ${outputPath}`);
