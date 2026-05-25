import { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import Collapse from "antd/es/collapse";
import { Tab, Tabs } from "baseui/tabs-motion";
import type { Session } from "@supabase/supabase-js";
import { AuthPanel } from "./components/AuthPanel";
import { ScoreChart, TryoutChart } from "./components/Charts";
import { CHECKLIST_ITEMS } from "./data/checklists";
import { SCORE_KEYS, SCORE_LABELS, SNBT_SUBTESTS } from "./data/snbt";
import {
  addTryoutRow,
  applyThemeToRoot,
  calculateSnbtScores,
  calculateTryoutAverage,
  createInitialData,
  MAX_TRYOUT_ROWS,
  normalizeScoreInput,
  snbtResultsToTryoutScores,
  summarizeChecklist,
} from "./lib/calculations";
import { loadDemoData, saveDemoData } from "./lib/localData";
import {
  getInitialAuth,
  loadCloudData,
  onAuthChange,
  saveChecklistField,
  saveProfile,
  saveTryout,
  signOut,
} from "./lib/supabase";
import type {
  AppData,
  ChecklistColumn,
  ChecklistItem,
  ScoreKey,
  SnbtResult,
  ThemeSettings,
  TryoutEntry,
  TryoutScores,
  UserProfile,
} from "./types/domain";

type ViewKey = "dashboard" | "checklist" | "tryout" | "kalkulator" | "profil";
type TryoutPatch = Omit<Partial<TryoutEntry>, "scores"> & { scores?: Partial<TryoutScores> };
const CALCULATOR_CHART_SCORE_KEYS = new Set<ScoreKey>(["pbm", "ppu", "pk", "lbi", "lbe"]);

const VIEWS: Array<{ id: ViewKey; label: string; icon: string }> = [
  { id: "dashboard", label: "Dashboard", icon: "solar:home-smile-linear" },
  { id: "checklist", label: "Checklist", icon: "solar:checklist-minimalistic-linear" },
  { id: "tryout", label: "Tryout", icon: "solar:chart-2-linear" },
  { id: "kalkulator", label: "Kalkulator", icon: "solar:calculator-linear" },
  { id: "profil", label: "Profil", icon: "solar:palette-linear" },
];

const CHECKLIST_SECTION_STORAGE_KEY = "tracker-checklist-sections-v1";

function ViewTabs({
  activeView,
  className,
  idPrefix,
  onChange,
}: {
  activeView: ViewKey;
  className: string;
  idPrefix: string;
  onChange: (view: ViewKey) => void;
}) {
  return (
    <nav className={className} aria-label="Navigasi" role="tablist">
      {VIEWS.map((item) => (
        <button
          aria-controls={`view-panel-${item.id}`}
          aria-selected={activeView === item.id}
          className={activeView === item.id ? "is-active" : ""}
          id={`${idPrefix}-${item.id}`}
          key={item.id}
          onClick={() => onChange(item.id)}
          role="tab"
          type="button"
        >
          <Icon icon={item.icon} />
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

function App() {
  const [authConfigured, setAuthConfigured] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [data, setData] = useState<AppData>(() => createInitialData());
  const [view, setView] = useState<ViewKey>("dashboard");
  const [authMode, setAuthMode] = useState<"masuk" | "daftar">("masuk");
  const [status, setStatus] = useState("Mode demo");
  const [isLoading, setIsLoading] = useState(true);

  const userId = session?.user.id ?? null;
  const email = session?.user.email ?? "";

  useEffect(() => {
    let isMounted = true;
    getInitialAuth().then((auth) => {
      if (!isMounted) {
        return;
      }
      setAuthConfigured(auth.isConfigured);
      setSession(auth.session);
      if (!auth.session) {
        const demo = loadDemoData();
        setData(demo);
        setStatus(auth.isConfigured ? "Mode demo" : "Mode demo · Supabase belum aktif");
        setIsLoading(false);
      }
    });

    const unsubscribe = onAuthChange((nextSession) => {
      setSession(nextSession);
      if (!nextSession) {
        setData(loadDemoData());
        setStatus("Mode demo");
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!userId) {
      return;
    }

    setIsLoading(true);
    loadCloudData({ userId })
      .then((cloudData) => {
        setData(cloudData);
        setStatus("Tersimpan di cloud");
      })
      .catch((error) => {
        setData(createInitialData());
        setStatus(error instanceof Error ? error.message : "Gagal memuat cloud");
      })
      .finally(() => setIsLoading(false));
  }, [userId]);

  useEffect(() => {
    applyThemeToRoot(data.profile.theme);
    if (!userId && !isLoading) {
      saveDemoData(data);
    }
  }, [data, isLoading, userId]);

  function commitData(nextData: AppData) {
    setData(nextData);
  }

  function updateChecklist(itemId: string, field: ChecklistColumn, completed: boolean) {
    const nextData = {
      ...data,
      checklist: {
        ...data.checklist,
        [itemId]: {
          ...data.checklist[itemId],
          [field]: completed,
        },
      },
    };
    commitData(nextData);
    if (userId) {
      saveChecklistField({ userId, itemId, field, completed }).catch((error) =>
        setStatus(error instanceof Error ? error.message : "Gagal menyimpan checklist"),
      );
    }
  }

  function updateTryout(entryNo: number, patch: TryoutPatch) {
    const nextTryouts = data.tryouts.map((entry) => {
      if (entry.entryNo !== entryNo) {
        return entry;
      }
      const scores = patch.scores ? { ...entry.scores, ...patch.scores } : entry.scores;
      return {
        ...entry,
        ...patch,
        scores,
        average: calculateTryoutAverage(scores),
      };
    });
    const nextData = { ...data, tryouts: nextTryouts };
    commitData(nextData);
    const changed = nextTryouts.find((entry) => entry.entryNo === entryNo);
    if (userId && changed) {
      saveTryout({ userId, entry: changed }).catch((error) =>
        setStatus(error instanceof Error ? error.message : "Gagal menyimpan tryout"),
      );
    }
  }

  function updateProfile(profile: UserProfile) {
    const nextData = { ...data, profile };
    commitData(nextData);
    if (userId) {
      saveProfile({ userId, profile }).catch((error) =>
        setStatus(error instanceof Error ? error.message : "Gagal menyimpan profil"),
      );
    }
  }

  function addRow() {
    const nextTryouts = addTryoutRow(data.tryouts);
    if (nextTryouts.length === data.tryouts.length) {
      setStatus("Maksimal 100 baris");
      return;
    }
    commitData({ ...data, tryouts: nextTryouts });
  }

  async function handleSignOut() {
    await signOut();
    setSession(null);
    setData(loadDemoData());
    setStatus("Mode demo");
  }

  const activeViewLabel = VIEWS.find((item) => item.id === view)?.label;

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand-block">
          <Icon className="brand-mark" icon="solar:chart-2-bold-duotone" />
          <div>
            <span className="eyebrow">{userId ? "Cloud" : "Demo"}</span>
            <strong>Tracker</strong>
          </div>
        </div>
        <ViewTabs activeView={view} className="nav-list" idPrefix="main-tab" onChange={setView} />
        <div className="topbar-actions">
          {userId ? (
            <button className="ghost-button" onClick={handleSignOut} type="button">
              <Icon icon="solar:logout-2-linear" />
              Keluar
            </button>
          ) : (
            <button className="primary-button" onClick={() => setView("profil")} type="button">
              <Icon icon="solar:user-rounded-linear" />
              Masuk
            </button>
          )}
        </div>
      </header>

      <section
        aria-label={activeViewLabel}
        className="workspace"
        id={`view-panel-${view}`}
        role="tabpanel"
      >
        <header className="topbar">
          <div>
            <span className="eyebrow">{userId ? email : status}</span>
            <h1>{activeViewLabel}</h1>
          </div>
        </header>

        {view === "dashboard" && <Dashboard data={data} />}
        {view === "checklist" && <ChecklistView data={data} onToggle={updateChecklist} />}
        {view === "tryout" && <TryoutView data={data} onAddRow={addRow} onUpdate={updateTryout} />}
        {view === "kalkulator" && (
          <CalculatorView data={data} onSaveToTryout={updateTryout} />
        )}
        {view === "profil" && (
          <ProfileView
            authConfigured={authConfigured}
            authMode={authMode}
            data={data}
            isLoggedIn={Boolean(userId)}
            onAuthMode={setAuthMode}
            onAuthSuccess={() => setStatus("Tersimpan di cloud")}
            onProfile={updateProfile}
          />
        )}
      </section>

      <ViewTabs activeView={view} className="bottom-tabs" idPrefix="bottom-tab" onChange={setView} />
    </main>
  );
}

function Dashboard({ data }: { data: AppData }) {
  const summary = useMemo(() => summarizeChecklist(data.checklist), [data.checklist]);
  const completedTryouts = data.tryouts.filter((entry) => entry.average !== null);
  const latestTryout = completedTryouts.at(-1);

  return (
    <div className="view-stack">
      <section className="hero-panel">
        <div>
          <span className="eyebrow">Ringkasan</span>
          <h2>{summary.overall.percent}%</h2>
          <span>{summary.overall.done}/{summary.overall.total}</span>
        </div>
      </section>

      <section className="metric-grid">
        <MetricCard icon="solar:notebook-bookmark-linear" label="Belajar" value={summary.totals.belajar.done} total={summary.totals.belajar.total} />
        <MetricCard icon="solar:pen-new-square-linear" label="Latihan Soal" value={summary.totals.latsol.done} total={summary.totals.latsol.total} />
        <MetricCard icon="solar:refresh-circle-linear" label="Review" value={summary.totals.review.done} total={summary.totals.review.total} />
        <MetricCard icon="solar:chart-square-linear" label="Tryout" value={completedTryouts.length} total={MAX_TRYOUT_ROWS} />
      </section>

      <section className="split-grid">
        <div className="panel">
          <div className="panel-heading">
            <span>Rata-Rata Skor Tryout</span>
            <strong>{latestTryout?.average?.toFixed(2) ?? "0.00"}</strong>
          </div>
          <div className="chart-box">
            <TryoutChart entries={data.tryouts} theme={data.profile.theme} />
          </div>
        </div>
        <div className="panel">
          <div className="panel-heading">
            <span>Capaian Belajar</span>
            <strong>{summary.sections.length}</strong>
          </div>
          <div className="section-list">
            {summary.sections.map((section) => (
              <div className="section-row" key={section.section}>
                <span>{section.section}</span>
                <strong>{section.percent}%</strong>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function MetricCard({ icon, label, value, total }: { icon: string; label: string; value: number; total: number }) {
  return (
    <article className="metric-card">
      <Icon icon={icon} />
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{total}</small>
    </article>
  );
}

function ChecklistView({
  data,
  onToggle,
}: {
  data: AppData;
  onToggle: (itemId: string, field: ChecklistColumn, completed: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const [section, setSection] = useState("Semua");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => loadExpandedChecklistSections());
  const sections = useMemo(() => ["Semua", ...new Set(CHECKLIST_ITEMS.map((item) => item.section))], []);
  const items = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return CHECKLIST_ITEMS.filter((item) => {
      const sectionMatch = section === "Semua" || item.section === section;
      const text = `${item.section} ${item.level ?? ""} ${item.subtest ?? ""} ${item.materi ?? ""} ${item.topic}`.toLowerCase();
      return sectionMatch && (!normalized || text.includes(normalized));
    });
  }, [query, section]);
  const groups = useMemo(() => groupChecklistItems(items), [items]);

  useEffect(() => {
    saveExpandedChecklistSections(expandedSections);
  }, [expandedSections]);

  function toggleSection(name: string) {
    setExpandedSections((current) => {
      const next = new Set(current);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }

  return (
    <div className="view-stack">
      <section className="toolbar-panel">
        <label>
          Cari
          <input onChange={(event) => setQuery(event.target.value)} placeholder="Topik" value={query} />
        </label>
        <label>
          Bagian
          <select onChange={(event) => setSection(event.target.value)} value={section}>
            {sections.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
      </section>
      {groups.length === 0 ? (
        <section className="panel empty-state">Tidak ada checklist yang cocok.</section>
      ) : (
        <section className="checklist-section-list">
          {groups.map(({ name, rows }) => {
            const isExpanded = expandedSections.has(name);
            const panelId = `checklist-section-${sectionId(name)}`;
            return (
              <div className="checklist-section" key={name}>
                <button
                  aria-controls={panelId}
                  aria-expanded={isExpanded}
                  className="checklist-section-toggle"
                  onClick={() => toggleSection(name)}
                  type="button"
                >
                  <Icon
                    className="section-chevron"
                    icon={isExpanded ? "solar:alt-arrow-down-linear" : "solar:alt-arrow-right-linear"}
                  />
                  <span>{name}</span>
                  <strong>{rows.length}</strong>
                </button>
                {isExpanded && (
                  <div className="table-panel checklist-section-table" id={panelId}>
                    <table className="data-table checklist-table">
                      <thead>
                        <tr>
                          <th>Bagian</th>
                          <th>Materi</th>
                          <th>Topik</th>
                          <th>Belajar</th>
                          <th>Latihan Soal</th>
                          <th>Review</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((item) => (
                          <ChecklistRow
                            item={item}
                            key={item.id}
                            onToggle={onToggle}
                            state={data.checklist[item.id] ?? {}}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}

function groupChecklistItems(items: ChecklistItem[]) {
  const groups = new Map<string, ChecklistItem[]>();
  for (const item of items) {
    groups.set(item.section, [...(groups.get(item.section) ?? []), item]);
  }
  return [...groups.entries()].map(([name, rows]) => ({ name, rows }));
}

function loadExpandedChecklistSections() {
  try {
    const raw = localStorage.getItem(CHECKLIST_SECTION_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : []);
  } catch {
    return new Set<string>();
  }
}

function saveExpandedChecklistSections(sections: Set<string>) {
  try {
    localStorage.setItem(CHECKLIST_SECTION_STORAGE_KEY, JSON.stringify([...sections]));
  } catch {
    // Storage can be blocked in private or restricted browser contexts.
  }
}

function sectionId(section: string) {
  return section.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function ChecklistRow({
  item,
  onToggle,
  state,
}: {
  item: ChecklistItem;
  onToggle: (itemId: string, field: ChecklistColumn, completed: boolean) => void;
  state: Partial<Record<ChecklistColumn, boolean>>;
}) {
  return (
    <tr>
      <td>{item.section}</td>
      <td>{item.materi || item.level || item.subtest}</td>
      <td>{item.topic}</td>
      {(["belajar", "latsol", "review"] as ChecklistColumn[]).map((field) => (
        <td key={field}>
          {item.columns.includes(field) ? (
            <label className="check-toggle">
              <input
                checked={Boolean(state[field])}
                onChange={(event) => onToggle(item.id, field, event.target.checked)}
                type="checkbox"
              />
              <span>{state[field] ? "TRUE" : "FALSE"}</span>
            </label>
          ) : (
            <span className="muted">-</span>
          )}
        </td>
      ))}
    </tr>
  );
}

function TryoutView({
  data,
  onAddRow,
  onUpdate,
}: {
  data: AppData;
  onAddRow: () => void;
  onUpdate: (entryNo: number, patch: TryoutPatch) => void;
}) {
  return (
    <div className="view-stack">
      <section className="panel">
        <div className="panel-heading">
          <span>Rata-Rata Skor Tryout</span>
          <button className="ghost-button" disabled={data.tryouts.length >= MAX_TRYOUT_ROWS} onClick={onAddRow} type="button">
            <Icon icon="solar:add-circle-linear" />
            Baris
          </button>
        </div>
        <div className="chart-box">
          <TryoutChart entries={data.tryouts} theme={data.profile.theme} />
        </div>
      </section>
      <section className="table-panel">
        <table className="data-table tryout-table">
          <thead>
            <tr>
              <th>No</th>
              <th>Tanggal</th>
              <th>Platform</th>
              {SCORE_KEYS.map((key) => <th key={key}>{SCORE_LABELS[key]}</th>)}
              <th>Rata-rata</th>
            </tr>
          </thead>
          <tbody>
            {data.tryouts.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.entryNo}</td>
                <td>
                  <input
                    onChange={(event) => onUpdate(entry.entryNo, { date: event.target.value })}
                    type="date"
                    value={entry.date}
                  />
                </td>
                <td>
                  <input
                    onChange={(event) => onUpdate(entry.entryNo, { platform: event.target.value })}
                    placeholder="Platform"
                    value={entry.platform}
                  />
                </td>
                {SCORE_KEYS.map((key) => (
                  <td key={key}>
                    <input
                      inputMode="decimal"
                      max={1200}
                      min={0}
                      onChange={(event) =>
                        onUpdate(entry.entryNo, { scores: { [key]: normalizeScoreInput(event.target.value) } })
                      }
                      placeholder="0"
                      type="number"
                      value={entry.scores[key] ?? ""}
                    />
                  </td>
                ))}
                <td>{entry.average?.toFixed(2) ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function CalculatorView({
  data,
  onSaveToTryout,
}: {
  data: AppData;
  onSaveToTryout: (entryNo: number, patch: TryoutPatch) => void;
}) {
  const [answers, setAnswers] = useState<Record<ScoreKey, number>>({
    pu: 0,
    pbm: 0,
    ppu: 0,
    pk: 0,
    lbi: 0,
    lbe: 0,
    pm: 0,
  });
  const [targetRow, setTargetRow] = useState(1);
  const [platform, setPlatform] = useState("Kalkulator SNBT");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const calculation = useMemo(() => calculateSnbtScores(answers), [answers]);
  const chartResults = useMemo(
    () => calculation.results.filter((result) => CALCULATOR_CHART_SCORE_KEYS.has(result.id)),
    [calculation.results],
  );

  function updateAnswer(key: ScoreKey, value: string) {
    const subtest = SNBT_SUBTESTS.find((item) => item.id === key);
    const number = Number(value);
    const safeValue = Number.isInteger(number) && subtest
      ? Math.min(subtest.questions, Math.max(0, number))
      : 0;
    setAnswers((current) => ({ ...current, [key]: safeValue }));
  }

  function saveResult() {
    const scores = snbtResultsToTryoutScores(calculation.results);
    onSaveToTryout(targetRow, {
      date,
      platform,
      scores,
      average: calculateTryoutAverage(scores),
    });
  }

  return (
    <div className="view-stack">
      <section className="split-grid">
        <div className="panel">
          <div className="panel-heading">
            <span>Kalkulator Skor SNBT</span>
            <strong>{calculation.average.toFixed(2)}</strong>
          </div>
          <div className="calculator-grid">
            {SNBT_SUBTESTS.map((subtest) => (
              <label className="score-input" key={subtest.id}>
                <span>
                  <Icon icon={subtest.icon} />
                  {subtest.shortLabel}
                </span>
                <input
                  max={subtest.questions}
                  min={0}
                  onChange={(event) => updateAnswer(subtest.id, event.target.value)}
                  type="number"
                  value={answers[subtest.id]}
                />
                <small>{subtest.questions}</small>
              </label>
            ))}
          </div>
        </div>
        <div className="panel">
          <div className="panel-heading">
            <span>Grafik</span>
          </div>
          <div className="chart-box">
            <ScoreChart results={chartResults} theme={data.profile.theme} />
          </div>
        </div>
      </section>
      <section className="panel save-panel">
        <label>
          Baris
          <select onChange={(event) => setTargetRow(Number(event.target.value))} value={targetRow}>
            {data.tryouts.map((entry) => (
              <option key={entry.entryNo} value={entry.entryNo}>{entry.entryNo}</option>
            ))}
          </select>
        </label>
        <label>
          Tanggal
          <input onChange={(event) => setDate(event.target.value)} type="date" value={date} />
        </label>
        <label>
          Platform
          <input onChange={(event) => setPlatform(event.target.value)} value={platform} />
        </label>
        <button className="primary-button" onClick={saveResult} type="button">
          <Icon icon="solar:archive-up-linear" />
          Simpan ke Tryout
        </button>
      </section>
    </div>
  );
}

function ProfileView({
  authConfigured,
  authMode,
  data,
  isLoggedIn,
  onAuthMode,
  onAuthSuccess,
  onProfile,
}: {
  authConfigured: boolean;
  authMode: "masuk" | "daftar";
  data: AppData;
  isLoggedIn: boolean;
  onAuthMode: (mode: "masuk" | "daftar") => void;
  onAuthSuccess: () => void;
  onProfile: (profile: UserProfile) => void;
}) {
  const profile = data.profile;
  const [activeTab, setActiveTab] = useState<"akun" | "profil" | "tema">("profil");
  const visibleActiveTab = isLoggedIn && activeTab === "akun" ? "profil" : activeTab;

  useEffect(() => {
    if (isLoggedIn && activeTab === "akun") {
      setActiveTab("profil");
    }
  }, [activeTab, isLoggedIn]);

  function patchProfile(patch: Partial<UserProfile>) {
    onProfile({ ...profile, ...patch });
  }

  function patchTheme(key: keyof ThemeSettings, value: string) {
    patchProfile({ theme: { ...profile.theme, [key]: value } });
  }

  const themeFields = ([
    ["primary", "Utama"],
    ["accent", "Aksen"],
    ["graphA", "Grafik A"],
    ["graphB", "Grafik B"],
    ["graphC", "Grafik C"],
    ["background", "Latar"],
    ["surface", "Panel"],
  ] as Array<[keyof ThemeSettings, string]>).map(([key, label]) => (
    <label className="color-field" key={key}>
      {label}
      <input onChange={(event) => patchTheme(key, event.target.value)} type="color" value={profile.theme[key]} />
    </label>
  ));

  return (
    <div className="profile-grid">
      <section className="profile-settings" aria-label="Pengaturan akun">
        <div className="settings-tabs">
          <Tabs
            activeKey={visibleActiveTab}
            onChange={({ activeKey }) => setActiveTab(activeKey as "akun" | "profil" | "tema")}
            renderAll
            uid="profile-settings"
          >
            {!isLoggedIn && (
              <Tab key="akun" title="Akun">
                <div className="settings-tab-panel">
                  <AuthPanel
                    configured={authConfigured}
                    mode={authMode}
                    onModeChange={onAuthMode}
                    onSuccess={onAuthSuccess}
                  />
                </div>
              </Tab>
            )}
            <Tab key="profil" title="Profil">
              <div className="settings-tab-panel profile-form">
                <div className="panel-heading">
                  <span>Profil</span>
                </div>
                <label>
                  Nama
                  <input onChange={(event) => patchProfile({ displayName: event.target.value })} value={profile.displayName} />
                </label>
                <label>
                  Perguruan Tinggi
                  <input onChange={(event) => patchProfile({ university: event.target.value })} value={profile.university} />
                </label>
                <label>
                  Program Studi
                  <input onChange={(event) => patchProfile({ studyProgram: event.target.value })} value={profile.studyProgram} />
                </label>
              </div>
            </Tab>
            <Tab key="tema" title="Tema">
              <div className="settings-tab-panel">
                <div className="panel-heading">
                  <span>Tema</span>
                </div>
                <Collapse
                  bordered={false}
                  className="theme-collapse"
                  defaultActiveKey={[]}
                  expandIconPlacement="end"
                  items={[
                    {
                      children: <div className="theme-form">{themeFields}</div>,
                      key: "warna",
                      label: <span>Warna</span>,
                    },
                  ]}
                  size="small"
                />
              </div>
            </Tab>
          </Tabs>
        </div>
      </section>
    </div>
  );
}

export default App;
