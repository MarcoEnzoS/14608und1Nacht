import { supabase } from "@/lib/supabaseClient";
import { TRIP_DAYS } from "./constants";
import type { MealsUI, ProfilesUI, RsvpStatus } from "./types";

export function makeEmptyMeals(participants: string[]): MealsUI {
  const base: MealsUI = {};
  for (const day of TRIP_DAYS) {
    base[day] = {
      breakfast: Object.fromEntries(participants.map((p) => [p, false])),
      lunch: Object.fromEntries(participants.map((p) => [p, false])),
      dinner: Object.fromEntries(participants.map((p) => [p, false])),
    };
  }
  return base;
}

export function makeEmptyProfiles(participants: string[]): ProfilesUI {
  return Object.fromEntries(participants.map((p) => [p, {}]));
}

export function makeEmptyRsvp(participants: string[]): Record<string, RsvpStatus> {
  // Neutral default: "pending" (no DB row)
  return Object.fromEntries(participants.map((p) => [p, "pending"]));
}

export async function fetchAllTripData(participants: string[]) {
  // 1) events (incl price_eur)
  const { data: evData, error: evErr } = await supabase
    .from("events")
    .select("id,title,date,start_time,end_time,location,description,capacity,price_eur")
    .order("date", { ascending: true })
    .order("start_time", { ascending: true });

  if (evErr) throw evErr;
  const dbEvents = (evData || []) as any[];
  const eventIds = dbEvents.map((e) => e.id);

  // 2) rsvps
  let rsvpRows: any[] = [];
  if (eventIds.length) {
    const { data: rData, error: rErr } = await supabase
      .from("rsvps")
      .select("event_id, person, status")
      .in("event_id", eventIds);

    if (rErr) throw rErr;
    rsvpRows = (rData || []) as any[];
  }

  const rsvpByEvent: Record<string, Record<string, RsvpStatus>> = {};
  for (const id of eventIds) rsvpByEvent[id] = makeEmptyRsvp(participants);

  for (const row of rsvpRows) {
    if (!rsvpByEvent[row.event_id]) rsvpByEvent[row.event_id] = makeEmptyRsvp(participants);
    rsvpByEvent[row.event_id][row.person] = row.status === "yes" ? "yes" : "no";
  }

  // 3) meals
  const { data: mData, error: mErr } = await supabase
    .from("meals")
    .select("day, meal_type, person, enabled")
    .in("day", TRIP_DAYS);

  if (mErr) throw mErr;

  const meals = makeEmptyMeals(participants);
  for (const row of (mData || []) as any[]) {
    if (!meals[row.day]) continue;
    if (!meals[row.day][row.meal_type]) continue;
    meals[row.day][row.meal_type][row.person] = !!row.enabled;
  }

  // 4) profiles
  const { data: pData, error: pErr } = await supabase
    .from("profiles")
    .select("person, arrival_date, arrival_time, arrival_flight, departure_date, departure_time, departure_flight");

  if (pErr) throw pErr;

  const profiles = makeEmptyProfiles(participants);
  for (const row of (pData || []) as any[]) {
    profiles[row.person] = {
      arrival: { date: row.arrival_date || "", time: row.arrival_time || "", flight: row.arrival_flight || "" },
      departure: { date: row.departure_date || "", time: row.departure_time || "", flight: row.departure_flight || "" },
    };
  }

  return { dbEvents, rsvpByEvent, meals, profiles };
}

export async function upsertEventToDb(payload: any) {
  const { error } = await supabase.from("events").upsert(payload);
  if (error) throw error;
}

export async function deleteEventFromDb(id: string) {
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) throw error;
}

export async function upsertRsvpToDb(eventId: string, person: string, status: "yes" | "no") {
  const { error } = await supabase.from("rsvps").upsert({ event_id: eventId, person, status });
  if (error) throw error;
}

export async function upsertRsvpBulkToDb(rows: Array<{ event_id: string; person: string; status: "yes" | "no" }>) {
  const { error } = await supabase.from("rsvps").upsert(rows);
  if (error) throw error;
}

export async function upsertMealToDb(day: string, meal: string, person: string, enabled: boolean) {
  const { error } = await supabase.from("meals").upsert({ day, meal_type: meal, person, enabled });
  if (error) throw error;
}

export async function upsertMealsBulkToDb(rows: Array<{ day: string; meal_type: string; person: string; enabled: boolean }>) {
  const { error } = await supabase.from("meals").upsert(rows);
  if (error) throw error;
}

export async function upsertProfileToDb(payload: any) {
  const { error } = await supabase.from("profiles").upsert(payload);
  if (error) throw error;
}
