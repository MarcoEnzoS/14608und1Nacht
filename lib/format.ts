import type { EventUI } from "./types";

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function formatDayLabel(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" });
}

export function sortByStart(a: EventUI, b: EventUI) {
  const ak = `${a.date}T${a.startTime || "00:00"}`;
  const bk = `${b.date}T${b.startTime || "00:00"}`;
  return ak.localeCompare(bk);
}

export function stableEventId() {
  // @ts-ignore
  if (typeof crypto !== "undefined" && crypto.randomUUID) return `evt_${crypto.randomUUID()}`;
  return `evt_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

export function formatEur(value?: number) {
  const v = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return `${v.toFixed(0)}€`;
}
