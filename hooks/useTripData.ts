import { useCallback, useMemo, useState } from "react";
import { DEFAULT_PARTICIPANTS } from "@/lib/constants";
import type { EventUI, TripState } from "@/lib/types";
import { sortByStart } from "@/lib/format";
import {
  fetchAllTripData,
  makeEmptyMeals,
  makeEmptyProfiles,
  makeEmptyRsvp,
  upsertEventToDb,
  deleteEventFromDb,
  upsertRsvpToDb,
  upsertRsvpBulkToDb,
  upsertMealToDb,
  upsertMealsBulkToDb,
  upsertProfileToDb,
} from "@/lib/tripApi";

export function useTripData() {
  const participants = useMemo(() => [...DEFAULT_PARTICIPANTS], []);

  const [state, setState] = useState<TripState>(() => ({
    participants,
    events: [],
    meals: makeEmptyMeals(participants),
    profiles: makeEmptyProfiles(participants),
  }));

  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  const reloadAll = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const { dbEvents, rsvpByEvent, meals, profiles } = await fetchAllTripData(participants);

      const uiEvents: EventUI[] = dbEvents.map((d: any) => ({
        id: d.id,
        title: d.title,
        date: d.date,
        startTime: d.start_time || "",
        endTime: d.end_time || "",
        location: d.location || "",
        description: d.description || "",
        capacity: d.capacity ?? undefined,
        priceEur: typeof d.price_eur === "number" ? d.price_eur : undefined,
        rsvp: rsvpByEvent[d.id] || makeEmptyRsvp(participants),
      }));

      uiEvents.sort(sortByStart);

      setState((s) => ({ ...s, events: uiEvents, meals, profiles }));
    } catch (err: any) {
      setLoadError(err?.message || String(err));
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [participants]);

  // mutations
  const upsertEvent = useCallback(async (payload: any) => {
    await upsertEventToDb(payload);
    await reloadAll();
  }, [reloadAll]);

  const deleteEvent = useCallback(async (id: string) => {
    await deleteEventFromDb(id);
    await reloadAll();
  }, [reloadAll]);

  const setRsvp = useCallback((eventId: string, person: string, value: "yes" | "no") => {
    // optimistic
    setState((s) => ({
      ...s,
      events: s.events.map((e) =>
        e.id !== eventId ? e : { ...e, rsvp: { ...(e.rsvp || {}), [person]: value } }
      ),
    }));
    upsertRsvpToDb(eventId, person, value).catch(console.error);
  }, []);

  const setRsvpMany = useCallback((eventId: string, people: string[], value: "yes" | "no") => {
    setState((s) => ({
      ...s,
      events: s.events.map((e) => {
        if (e.id !== eventId) return e;
        const rsvp = { ...(e.rsvp || {}) };
        for (const p of people) rsvp[p] = value;
        return { ...e, rsvp };
      }),
    }));

    const rows = people.map((p) => ({ event_id: eventId, person: p, status: value }));
    upsertRsvpBulkToDb(rows).catch(console.error);
  }, []);

  const toggleMeal = useCallback((day: string, meal: "breakfast" | "lunch" | "dinner", person: string) => {
    setState((s) => {
      const nextValue = !s.meals?.[day]?.[meal]?.[person];
      // optimistic
      const next = {
        ...s,
        meals: {
          ...s.meals,
          [day]: {
            ...s.meals[day],
            [meal]: { ...s.meals[day][meal], [person]: nextValue },
          },
        },
      };
      upsertMealToDb(day, meal, person, nextValue).catch(console.error);
      return next;
    });
  }, []);

  const setMealMany = useCallback((day: string, meal: "breakfast" | "lunch" | "dinner", people: string[], value: boolean) => {
    setState((s) => {
      const next = {
        ...s,
        meals: {
          ...s.meals,
          [day]: {
            ...s.meals[day],
            [meal]: { ...s.meals[day][meal], ...Object.fromEntries(people.map((p) => [p, value])) },
          },
        },
      };
      const rows = people.map((p) => ({ day, meal_type: meal, person: p, enabled: value }));
      upsertMealsBulkToDb(rows).catch(console.error);
      return next;
    });
  }, []);

  const updateProfile = useCallback((person: string, patch: any) => {
    setState((s) => {
      const merged = { ...(s.profiles?.[person] || {}), ...patch };
      const next = { ...s, profiles: { ...s.profiles, [person]: merged } };

      const payload = {
        person,
        arrival_date: merged.arrival?.date || null,
        arrival_time: merged.arrival?.time || null,
        arrival_flight: merged.arrival?.flight || null,
        departure_date: merged.departure?.date || null,
        departure_time: merged.departure?.time || null,
        departure_flight: merged.departure?.flight || null,
      };
      upsertProfileToDb(payload).catch(console.error);

      return next;
    });
  }, []);

  return { state, isLoading, loadError, reloadAll, upsertEvent, deleteEvent, setRsvp, setRsvpMany, toggleMeal, setMealMany, updateProfile };
}
