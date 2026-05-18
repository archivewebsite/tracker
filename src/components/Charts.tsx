import { useEffect, useRef } from "react";
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  RadarController,
  RadialLinearScale,
  Tooltip,
} from "chart.js";
import { SCORE_KEYS, SCORE_LABELS } from "../data/snbt";
import type { SnbtResult, ThemeSettings, TryoutEntry } from "../types/domain";

Chart.register(
  BarController,
  BarElement,
  CategoryScale,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  RadarController,
  RadialLinearScale,
  Tooltip,
);

type TryoutChartProps = {
  entries: TryoutEntry[];
  theme: ThemeSettings;
};

type ScoreChartProps = {
  results: SnbtResult[];
  chartType: "bar" | "radar" | "line";
  theme: ThemeSettings;
};

export function TryoutChart({ entries, theme }: TryoutChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }

    const completeRows = entries.filter((entry) => entry.average !== null);
    const labels = completeRows.map((entry) => entry.platform || `Tryout ${entry.entryNo}`);
    const averages = completeRows.map((entry) => entry.average ?? 0);

    const chart = new Chart(canvas, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Rata-rata",
            data: averages,
            borderColor: theme.graphA,
            backgroundColor: withAlpha(theme.graphA, 0.18),
            tension: 0.36,
            fill: true,
            pointRadius: 4,
          },
          {
            label: "PU",
            data: completeRows.map((entry) => entry.scores.pu ?? null),
            borderColor: theme.graphB,
            backgroundColor: withAlpha(theme.graphB, 0.14),
            tension: 0.28,
          },
          {
            label: "PM",
            data: completeRows.map((entry) => entry.scores.pm ?? null),
            borderColor: theme.graphC,
            backgroundColor: withAlpha(theme.graphC, 0.14),
            tension: 0.28,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom", labels: { color: theme.text, boxWidth: 12 } },
          tooltip: { intersect: false, mode: "index" },
        },
        scales: {
          x: { ticks: { color: theme.muted }, grid: { display: false } },
          y: {
            min: 0,
            max: 1200,
            ticks: { color: theme.muted },
            grid: { color: withAlpha(theme.muted, 0.16) },
          },
        },
      },
    });

    return () => chart.destroy();
  }, [entries, theme]);

  return <canvas aria-label="Grafik tryout" ref={canvasRef} />;
}

export function ScoreChart({ results, chartType, theme }: ScoreChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !results.length) {
      return undefined;
    }

    const labels = results.map((result) => result.shortLabel);
    const userScores = results.map((result) => result.score);
    const maxScores = results.map((result) => result.maxScore);

    const chart = new Chart(canvas, {
      type: chartType,
      data: {
        labels,
        datasets: [
          {
            label: "Skor",
            data: userScores,
            borderColor: theme.graphA,
            backgroundColor: withAlpha(theme.graphA, chartType === "radar" ? 0.2 : 0.42),
            fill: chartType !== "bar",
            tension: 0.32,
          },
          {
            label: "Maksimum",
            data: maxScores,
            borderColor: theme.graphC,
            backgroundColor: withAlpha(theme.graphC, chartType === "radar" ? 0.12 : 0.24),
            fill: false,
            tension: 0.24,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom", labels: { color: theme.text, boxWidth: 12 } },
          tooltip: { intersect: false, mode: "index" },
        },
        scales:
          chartType === "radar"
            ? {
                r: {
                  min: 0,
                  max: 1000,
                  pointLabels: { color: theme.text },
                  grid: { color: withAlpha(theme.muted, 0.16) },
                  angleLines: { color: withAlpha(theme.muted, 0.16) },
                  ticks: { color: theme.muted, backdropColor: "transparent" },
                },
              }
            : {
                x: { ticks: { color: theme.muted }, grid: { display: false } },
                y: {
                  min: 0,
                  max: 1000,
                  ticks: { color: theme.muted },
                  grid: { color: withAlpha(theme.muted, 0.16) },
                },
              },
      },
    });

    return () => chart.destroy();
  }, [results, chartType, theme]);

  return <canvas aria-label="Grafik skor SNBT" ref={canvasRef} />;
}

export function scoreSummaryText(entry: TryoutEntry): string {
  return SCORE_KEYS.map((key) => `${SCORE_LABELS[key]} ${entry.scores[key] ?? "-"}`).join(" · ");
}

function withAlpha(hex: string, alpha: number): string {
  const normalized = hex.replace("#", "");
  const value = normalized.length === 3
    ? normalized.split("").map((char) => char + char).join("")
    : normalized;
  const bigint = Number.parseInt(value, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
