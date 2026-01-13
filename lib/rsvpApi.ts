import { supabase } from "@/lib/supabaseClient";

export type DbRsvp = {
  event_id: string;
  person: string;
  status: "yes" | "no";
};

export async function fetchRsvpsForEvents(eventIds: string[]): Promise<DbRsvp[]> {
  if (!eventIds.length) return [];
  const { data, error } = await supabase
    .from("rsvps")
    .select("event_id, person, status")
    .in("event_id", eventIds);

  if (error) throw error;
  return (data || []) as DbRsvp[];
}

export async function upsertRsvp(eventId: string, person: string, status: "yes" | "no") {
  const { error } = await supabase
    .from("rsvps")
    .upsert({ event_id: eventId, person, status });
  if (error) throw error;
}

export async function upsertRsvpsBulk(rows: DbRsvp[]) {
  if (!rows.length) return;
  const { error } = await supabase.from("rsvps").upsert(rows);
  if (error) throw error;
}
