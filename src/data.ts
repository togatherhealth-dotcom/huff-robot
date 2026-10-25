// Session records stay on this laptop (browser storage) until exported as CSV.

import type { Condition } from "./script";

export type Session = {
  id: string;
  condition: Condition;
  started: string;
  finished?: string;
  voice: string;
  trust_1?: number;
  trust_2?: number;
  trust_3?: number;
  caught_by?: string;
  relied?: string;
  choices: string[];
  step_ms: number[];
  total_ms?: number;
  demo?: boolean;
};

const KEY = "huff.sessions.v1";
const SETTINGS = "huff.settings.v1";

export function loadSessions(): Session[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveSession(s: Session) {
  try {
    const all = loadSessions().filter((x) => x.id !== s.id);
    all.push(s);
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* storage unavailable: the CSV download at the end still works */
  }
}

export function clearSessions() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export type Settings = { voice: string | null; muted: boolean };

export function loadSettings(): Settings {
  try {
    return { voice: null, muted: false, ...JSON.parse(localStorage.getItem(SETTINGS) || "{}") };
  } catch {
    return { voice: null, muted: false };
  }
}

export function saveSettings(s: Settings) {
  try {
    localStorage.setItem(SETTINGS, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

/** Alternates conditions across completed real sessions: apology, explanation, apology... */
export function nextCondition(): Condition {
  const done = loadSessions().filter((s) => s.finished && !s.demo).length;
  return done % 2 === 0 ? "apology" : "explanation";
}

export function newId(): string {
  const n = loadSessions().filter((s) => !s.demo).length + 1;
  return `P${String(n).padStart(2, "0")}`;
}

const COLUMNS: (keyof Session)[] = [
  "id", "condition", "started", "finished", "total_ms", "voice",
  "trust_1", "trust_2", "trust_3", "caught_by", "relied", "choices", "step_ms",
];

export function toCSV(sessions: Session[]): string {
  const esc = (v: unknown) => {
    const s = Array.isArray(v) ? v.join(" | ") : v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [COLUMNS.join(","), ...sessions.filter((s) => !s.demo).map((s) => COLUMNS.map((c) => esc(s[c])).join(","))].join("\n");
}

export function download(name: string, text: string) {
  const blob = new Blob([text], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
