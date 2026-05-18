import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import type { AppData, ChecklistColumn, ChecklistState, ThemeSettings, TryoutEntry, UserProfile } from "../types/domain";
import { calculateTryoutAverage, createInitialData, ensureTryoutRows, PUBLIC_THEME } from "./calculations";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const supabase =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export type AuthState = {
  session: Session | null;
  isConfigured: boolean;
};

type ProfileRow = {
  display_name: string | null;
  university: string | null;
  study_program: string | null;
  logo_url: string | null;
  theme: ThemeSettings | null;
};

type ChecklistRow = {
  item_id: string;
  field: ChecklistColumn;
  completed: boolean;
};

type TryoutRow = {
  entry_no: number;
  tanggal: string | null;
  platform: string | null;
  pu: number | null;
  pbm: number | null;
  ppu: number | null;
  pk: number | null;
  lbi: number | null;
  lbe: number | null;
  pm: number | null;
};

type AuthCredentials = {
  email: string;
  password: string;
};

type UserRequest = {
  userId: string;
};

type SaveProfileRequest = UserRequest & {
  profile: UserProfile;
};

type SaveChecklistFieldRequest = UserRequest & {
  itemId: string;
  field: ChecklistColumn;
  completed: boolean;
};

type SaveTryoutRequest = UserRequest & {
  entry: TryoutEntry;
};

export async function getInitialAuth(): Promise<AuthState> {
  if (!supabase) {
    return { session: null, isConfigured: false };
  }

  const { data } = await supabase.auth.getSession();
  return { session: data.session, isConfigured: true };
}

export function onAuthChange(callback: (session: Session | null) => void) {
  if (!supabase) {
    return () => undefined;
  }

  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return () => data.subscription.unsubscribe();
}

export async function signIn({ email, password }: AuthCredentials): Promise<void> {
  requireSupabase();
  const { error } = await supabase!.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error(error.message);
  }
}

export async function signUp({ email, password }: AuthCredentials): Promise<void> {
  requireSupabase();
  const { error } = await supabase!.auth.signUp({ email, password });
  if (error) {
    throw new Error(error.message);
  }
}

export async function signOut(): Promise<void> {
  requireSupabase();
  await supabase!.auth.signOut();
}

export async function loadCloudData({ userId }: UserRequest): Promise<AppData> {
  const client = requireSupabase();
  const initial = createInitialData();
  const [profileResult, checklistResult, tryoutResult] = await Promise.all([
    client.from("profiles").select("display_name, university, study_program, logo_url, theme").eq("user_id", userId).maybeSingle(),
    client.from("checklist_states").select("item_id, field, completed").eq("user_id", userId),
    client.from("tryout_entries").select("entry_no, tanggal, platform, pu, pbm, ppu, pk, lbi, lbe, pm").eq("user_id", userId).order("entry_no"),
  ]);

  if (profileResult.error) {
    throw new Error(profileResult.error.message);
  }
  if (checklistResult.error) {
    throw new Error(checklistResult.error.message);
  }
  if (tryoutResult.error) {
    throw new Error(tryoutResult.error.message);
  }

  const profile = profileFromRow(profileResult.data as ProfileRow | null, initial.profile);
  const checklist = checklistFromRows((checklistResult.data ?? []) as ChecklistRow[]);
  const tryouts = ensureTryoutRows(((tryoutResult.data ?? []) as TryoutRow[]).map(tryoutFromRow));

  return { profile, checklist, tryouts };
}

export async function saveProfile({ userId, profile }: SaveProfileRequest): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from("profiles").upsert({
    user_id: userId,
    display_name: profile.displayName || null,
    university: profile.university || null,
    study_program: profile.studyProgram || null,
    logo_url: profile.logoUrl || null,
    theme: profile.theme,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    throw new Error(error.message);
  }
}

export async function saveChecklistField({
  userId,
  itemId,
  field,
  completed,
}: SaveChecklistFieldRequest): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from("checklist_states").upsert({
    user_id: userId,
    item_id: itemId,
    field,
    completed,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    throw new Error(error.message);
  }
}

export async function saveTryout({ userId, entry }: SaveTryoutRequest): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from("tryout_entries").upsert({
    user_id: userId,
    entry_no: entry.entryNo,
    tanggal: entry.date || null,
    platform: entry.platform || null,
    pu: entry.scores.pu,
    pbm: entry.scores.pbm,
    ppu: entry.scores.ppu,
    pk: entry.scores.pk,
    lbi: entry.scores.lbi,
    lbe: entry.scores.lbe,
    pm: entry.scores.pm,
    average_score: entry.average,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    throw new Error(error.message);
  }
}

function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error("Supabase belum dikonfigurasi.");
  }
  return supabase;
}

function profileFromRow(row: ProfileRow | null, fallback: UserProfile): UserProfile {
  if (!row) {
    return fallback;
  }

  return {
    displayName: row.display_name ?? "",
    university: row.university ?? "",
    studyProgram: row.study_program ?? "",
    logoUrl: row.logo_url ?? "",
    theme: { ...PUBLIC_THEME, ...(row.theme ?? {}) },
  };
}

function checklistFromRows(rows: ChecklistRow[]): ChecklistState {
  return rows.reduce<ChecklistState>((state, row) => {
    state[row.item_id] = {
      ...state[row.item_id],
      [row.field]: row.completed,
    };
    return state;
  }, {});
}

function tryoutFromRow(row: TryoutRow): TryoutEntry {
  const scores = {
    pu: row.pu,
    pbm: row.pbm,
    ppu: row.ppu,
    pk: row.pk,
    lbi: row.lbi,
    lbe: row.lbe,
    pm: row.pm,
  };

  return {
    id: `cloud-${row.entry_no}`,
    entryNo: row.entry_no,
    date: row.tanggal ?? "",
    platform: row.platform ?? "",
    scores,
    average: calculateTryoutAverage(scores),
  };
}
