import { supabase } from "@/lib/supabaseClient";

export type DbEvent = {
  id: string;
  title: string;
  date: string; // "2026-09-01"
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  description: string | null;
  capacity: number | null;
};

export async function fetchEvents(): Promise<DbEvent[]> {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) throw error;
  return (data || []) as DbEvent[];
}

export async function upsertEvent(e: {
  id: string;
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  description?: string;
  capacity?: number;
}) {
  const payload: DbEvent = {
    id: e.id,
    title: e.title,
    date: e.date,
    start_time: e.startTime || null,
    end_time: e.endTime || null,
    location: e.location || null,
    description: e.description || null,
    capacity: typeof e.capacity === "number" ? e.capacity : null,
  };

  const { error } = await supabase.from("events").upsert(payload);
  if (error) throw error;
}

export async function deleteEventById(id: string) {
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) throw error;
}

export async function seedEventsIfEmpty(seed: DbEvent[]) {
  const existing = await fetchEvents();
  if (existing.length > 0) return;

  const { error } = await supabase.from("events").insert(seed);
  if (error) throw error;
}
