'use client'

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Calendar,
  Clock,
  MapPin,
  Plane,
  Plus,
  Users,
  UtensilsCrossed,
  Shield,
  Search,
  Download,
  LogOut,
  UserCircle2,
  Sparkles,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from "lucide-react";

/**
 * Marco 40 · Trip Planner (Supabase-first)
 * ✅ Events from Supabase
 * ✅ RSVPs from Supabase (shared)
 * ✅ Meals from Supabase (shared)
 * ✅ Flights/Profiles from Supabase (shared)
 * ✅ Parents can manage kids
 * ✅ Admin can add/edit/delete events
 *
 * Notes:
 * - RLS is currently disabled (MVP A).
 * - We still store ONLY the selected user name in localStorage for convenience.
 */

// ---------- Config ----------
const TRIP_DAYS = [
  "2026-09-01",
  "2026-09-02",
  "2026-09-03",
  "2026-09-04",
  "2026-09-05",
  "2026-09-06",
];

const DEFAULT_PARTICIPANTS = [
  "Marco",
  "Lx",
  "Benno",
  "Carina",
  "Chris",
  "Claudia",
  "Gianna",
  "Giulia",
  "Bassi",
  "Henry",
  "Bini",
  "Mama",
  "Papa",
  "Maxi",
  "Ricarda",
  "Roberta",
  // Kids
  "Emil",
  "Karli",
  "Flynn",
  "Georg",
  "Valentin",
  "Carlotta",
];

const GUARDIANS: Record<string, string[]> = {
  Emil: ["Benno", "Lx"],
  Karli: ["Benno", "Lx"],
  Flynn: ["Chris", "Carina"],
  Georg: ["Claudia", "Maxi"],
  Valentin: ["Claudia", "Maxi"],
  Carlotta: ["Claudia", "Maxi"],
};

const STORAGE_CURRENT_USER_KEY = "bday40_planner_current_user_v1";
const DEFAULT_ADMIN_PIN = "4040";

// ---------- Types (lightweight) ----------
type Person = string;

type EventUI = {
  id: string;
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  description?: string;
  capacity?: number;
  rsvp: Record<Person, "yes" | "no">;
};

type ProfilesUI = Record<
  Person,
  {
    arrival?: { date?: string; time?: string; flight?: string };
    departure?: { date?: string; time?: string; flight?: string };
  }
>;

type MealsUI = Record<
  string,
  {
    breakfast: Record<Person, boolean>;
    lunch: Record<Person, boolean>;
    dinner: Record<Person, boolean>;
  }
>;

type AppState = {
  admin: { isUnlocked: boolean };
  participants: Person[];
  profiles: ProfilesUI;
  events: EventUI[];
  meals: MealsUI;
};

// ---------- Helpers ----------
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function formatDayLabel(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

function sortByStart(a: EventUI, b: EventUI) {
  const ak = `${a.date}T${a.startTime || "00:00"}`;
  const bk = `${b.date}T${b.startTime || "00:00"}`;
  return ak.localeCompare(bk);
}

function uniqPreserveOrder(arr: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of arr) {
    if (!seen.has(x)) {
      seen.add(x);
      out.push(x);
    }
  }
  return out;
}

function getManagedPeople(currentUser: string) {
  if (!currentUser) return [];
  const kids = Object.keys(GUARDIANS).filter((kid) => (GUARDIANS[kid] || []).includes(currentUser));
  return uniqPreserveOrder([currentUser, ...kids]);
}

function splitFamily(managedPeople: string[], currentUser: string) {
  const me = currentUser;
  const kids = managedPeople.filter((p) => p !== me);
  return { me, kids };
}

function chunkDisplay(list: string[], limit: number) {
  const shown = list.slice(0, limit);
  const rest = list.length - shown.length;
  return { shown, rest };
}

function stableEventId() {
  // stable ID for DB row
  // @ts-ignore
  if (typeof crypto !== "undefined" && crypto.randomUUID) return `evt_${crypto.randomUUID()}`;
  return `evt_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function makeEmptyMeals(participants: string[]): MealsUI {
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

function makeEmptyProfiles(participants: string[]): ProfilesUI {
  return Object.fromEntries(participants.map((p) => [p, {}]));
}

function makeEmptyRsvp(participants: string[]): Record<string, "yes" | "no"> {
  return Object.fromEntries(participants.map((p) => [p, "no"]));
}

// ---------- UI bits ----------
function Pill({ icon: Icon, children, className = "" }: any) {
  return (
    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${className}`}>
      {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      <span className="leading-none">{children}</span>
    </div>
  );
}

function CountBadge({ label, value, max }: any) {
  const over = typeof max === "number" && value > max;
  return (
    <div className="flex items-center gap-2">
      <Badge variant={over ? "destructive" : "secondary"}>
        {value}
        {typeof max === "number" ? `/${max}` : ""}
      </Badge>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

function SectionTitle({ icon: Icon, title, right }: any) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        {Icon ? <Icon className="h-4 w-4 text-muted-foreground" /> : null}
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {right}
    </div>
  );
}

function RSVPBadge({ name, status }: { name: string; status: "yes" | "no" }) {
  const yes = status === "yes";
  return (
    <span
      className={
        "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium " +
        (yes
          ? "bg-emerald-500/15 text-emerald-700 border border-emerald-500/30 dark:text-emerald-300"
          : "bg-rose-500/15 text-rose-700 border border-rose-500/30 dark:text-rose-300")
      }
    >
      {yes ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
      {name}
    </span>
  );
}

function CompactList({ title, yes, no, expanded, onToggle, limit = 10, right }: any) {
  const { shown, rest } = chunkDisplay(yes, limit);
  return (
    <div>
      <SectionTitle
        icon={Users}
        title={title}
        right={
          <div className="flex items-center gap-2">
            {right}
            <Button variant="outline" size="sm" className="rounded-xl" onClick={onToggle}>
              {expanded ? "Kompakt" : "Alle"}
            </Button>
          </div>
        }
      />

      <div className="mt-2 flex flex-wrap gap-2">
        {!expanded ? (
          <>
            {shown.map((p: string) => (
              <RSVPBadge key={p} name={p} status="yes" />
            ))}
            {rest > 0 ? (
              <Badge className="rounded-full" variant="secondary">
                +{rest} weitere
              </Badge>
            ) : null}
            {no.length > 0 ? (
              <Badge
                className="rounded-full border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300"
                variant="secondary"
              >
                {no.length} abgesagt
              </Badge>
            ) : null}
          </>
        ) : (
          <>
            {yes.map((p: string) => (
              <RSVPBadge key={`y_${p}`} name={p} status="yes" />
            ))}
            {no.map((p: string) => (
              <RSVPBadge key={`n_${p}`} name={p} status="no" />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function LoginScreen({ participants, onLogin }: any) {
  const [name, setName] = useState("");
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-rose-50 dark:from-indigo-950 dark:via-background dark:to-rose-950">
      <div className="mx-auto max-w-md p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex flex-col gap-4"
        >
          <div className="rounded-2xl border bg-card/80 backdrop-blur p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-rose-500/20 border">
                <UserCircle2 className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-xl font-semibold">Marco 40 · Trip Planner</h1>
                <p className="text-sm text-muted-foreground">Bitte wähle deinen Namen</p>
              </div>
            </div>

            <div className="mt-5 grid gap-2">
              <Label>Ich bin…</Label>
              <Select value={name} onValueChange={setName}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Teilnehmer auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {participants.map((p: string) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Keine Sorge: Fürs Erste gibt es keine PIN / kein Passwort. (Das bauen wir später optional ein.)
              </p>
            </div>

            <div className="mt-5">
              <Button
                className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-rose-600 text-white hover:opacity-95"
                disabled={!name}
                onClick={() => name && onLogin(name)}
              >
                Weiter
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ---------- Main component ----------
export default function Page() {
  const [state, setState] = useState<AppState>(() => {
    const participants = DEFAULT_PARTICIPANTS;
    return {
      admin: { isUnlocked: false },
      participants,
      profiles: makeEmptyProfiles(participants),
      events: [],
      meals: makeEmptyMeals(participants),
    };
  });

  const [currentUser, setCurrentUser] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(STORAGE_CURRENT_USER_KEY) || "";
  });

  const managedPeople = useMemo(() => getManagedPeople(currentUser), [currentUser]);
  const { kids } = useMemo(() => splitFamily(managedPeople, currentUser), [managedPeople, currentUser]);
  const [actingPerson, setActingPerson] = useState("");

  const [filter, setFilter] = useState({ q: "", day: "all" });

  // Admin unlock dialog
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");

  // Event dialog
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  // Expand/collapse
  const [expandedRsvp, setExpandedRsvp] = useState<Record<string, boolean>>({});
  const [expandedMeals, setExpandedMeals] = useState<Record<string, boolean>>({});

  // Loading
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string>("");

  // Draft event
  const emptyEvent = useMemo(
    () => ({
      id: stableEventId(),
      title: "",
      date: TRIP_DAYS[0],
      startTime: "",
      endTime: "",
      location: "",
      description: "",
      capacity: undefined as number | undefined,
    }),
    []
  );

  const [eventDraft, setEventDraft] = useState<any>(emptyEvent);

  // Ensure actingPerson is valid
  useEffect(() => {
    if (!currentUser) {
      setActingPerson("");
      return;
    }
    const allowed = getManagedPeople(currentUser);
    if (!actingPerson || !allowed.includes(actingPerson)) {
      setActingPerson(allowed[0] || currentUser);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const isAdmin = state.admin.isUnlocked;

  const actingRsvpCounts = useMemo(() => {
    const person = actingPerson || currentUser;
    if (!person) return { yes: 0, no: 0 };
    const yes = state.events.filter((e) => e.rsvp?.[person] === "yes").length;
    const no = state.events.filter((e) => e.rsvp?.[person] !== "yes").length;
    return { yes, no };
  }, [state.events, actingPerson, currentUser]);

  const eventsByDay = useMemo(() => {
    const q = filter.q.trim().toLowerCase();
    let list = [...state.events];
    if (filter.day !== "all") list = list.filter((e) => e.date === filter.day);
    if (q) {
      list = list.filter((e) => {
        const hay = `${e.title} ${e.location || ""} ${e.description || ""}`.toLowerCase();
        return hay.includes(q);
      });
    }
    const by: Record<string, EventUI[]> = Object.fromEntries(TRIP_DAYS.map((d) => [d, []]));
    for (const e of list) {
      if (!by[e.date]) by[e.date] = [];
      by[e.date].push(e);
    }
    for (const d of Object.keys(by)) by[d].sort(sortByStart);
    return by;
  }, [state.events, filter.day, filter.q]);

  // ---------- Supabase: load all shared data ----------
  async function reloadAll() {
    setIsLoading(true);
    setLoadError("");
    try {
      const participants = state.participants;

      // 1) Events
      const { data: evData, error: evErr } = await supabase
        .from("events")
        .select("*")
        .order("date", { ascending: true })
        .order("start_time", { ascending: true });
      if (evErr) throw evErr;
      const dbEvents = (evData || []) as any[];
      const eventIds = dbEvents.map((e) => e.id);

      // 2) RSVPs for those events
      let rsvpRows: any[] = [];
      if (eventIds.length) {
        const { data: rData, error: rErr } = await supabase
          .from("rsvps")
          .select("event_id, person, status")
          .in("event_id", eventIds);
        if (rErr) throw rErr;
        rsvpRows = (rData || []) as any[];
      }

      // Build rsvp map per event
      const rsvpByEvent: Record<string, Record<string, "yes" | "no">> = {};
      for (const id of eventIds) rsvpByEvent[id] = makeEmptyRsvp(participants);
      for (const row of rsvpRows) {
        if (!rsvpByEvent[row.event_id]) rsvpByEvent[row.event_id] = makeEmptyRsvp(participants);
        rsvpByEvent[row.event_id][row.person] = row.status === "yes" ? "yes" : "no";
      }

      // 3) Meals
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

      // 4) Profiles (Flights)
      const { data: pData, error: pErr } = await supabase
        .from("profiles")
        .select("person, arrival_date, arrival_time, arrival_flight, departure_date, departure_time, departure_flight");
      if (pErr) throw pErr;
      const profiles = makeEmptyProfiles(participants);
      for (const row of (pData || []) as any[]) {
        profiles[row.person] = {
          arrival: {
            date: row.arrival_date || "",
            time: row.arrival_time || "",
            flight: row.arrival_flight || "",
          },
          departure: {
            date: row.departure_date || "",
            time: row.departure_time || "",
            flight: row.departure_flight || "",
          },
        };
      }

      // 5) Build UI events
      const uiEvents: EventUI[] = dbEvents.map((d) => ({
        id: d.id,
        title: d.title,
        date: d.date,
        startTime: d.start_time || "",
        endTime: d.end_time || "",
        location: d.location || "",
        description: d.description || "",
        capacity: d.capacity ?? undefined,
        rsvp: rsvpByEvent[d.id] || makeEmptyRsvp(participants),
      }));
      uiEvents.sort(sortByStart);

      setState((s) => ({
        ...s,
        events: uiEvents,
        meals,
        profiles,
      }));
    } catch (err: any) {
      console.error(err);
      setLoadError(err?.message || String(err));
    } finally {
      setIsLoading(false);
    }
  }

  // Initial load after login
  useEffect(() => {
    if (!currentUser) return;
    reloadAll();
    // refresh every 15s (simple sync without realtime)
    const t = setInterval(() => reloadAll(), 15000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // ---------- Auth-ish convenience ----------
  function loginAs(name: string) {
    setCurrentUser(name);
    localStorage.setItem(STORAGE_CURRENT_USER_KEY, name);
    setActingPerson(name);
  }

  function logout() {
    setCurrentUser("");
    setActingPerson("");
    localStorage.removeItem(STORAGE_CURRENT_USER_KEY);
  }

  // ---------- Admin PIN ----------
  function unlockAdmin() {
    setPinError("");
    if (pin === DEFAULT_ADMIN_PIN) {
      setState((s) => ({ ...s, admin: { isUnlocked: true } }));
      setPin("");
    } else {
      setPinError("Falsche PIN");
    }
  }

  function lockAdmin() {
    setState((s) => ({ ...s, admin: { isUnlocked: false } }));
  }

  // ---------- Events (Supabase) ----------
  function openNewEvent() {
    setEditingEventId(null);
    setEventDraft({ ...emptyEvent, id: stableEventId() });
    setEventDialogOpen(true);
  }

  function openEditEvent(e: EventUI) {
    setEditingEventId(e.id);
    setEventDraft({
      id: e.id,
      title: e.title,
      date: e.date,
      startTime: e.startTime || "",
      endTime: e.endTime || "",
      location: e.location || "",
      description: e.description || "",
      capacity: typeof e.capacity === "number" ? e.capacity : undefined,
    });
    setEventDialogOpen(true);
  }

  async function upsertEvent() {
    const title = String(eventDraft.title || "").trim();
    if (!title) return;

    const payload = {
      id: eventDraft.id || stableEventId(),
      title,
      date: eventDraft.date,
      start_time: eventDraft.startTime || null,
      end_time: eventDraft.endTime || null,
      location: eventDraft.location || null,
      description: eventDraft.description || null,
      capacity: typeof eventDraft.capacity === "number" ? eventDraft.capacity : null,
    };

    const { error } = await supabase.from("events").upsert(payload);
    if (error) {
      console.error(error);
      return;
    }

    setEventDialogOpen(false);
    setEditingEventId(null);
    await reloadAll();
  }

  async function deleteEvent(id: string) {
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) {
      console.error(error);
      return;
    }
    await reloadAll();
  }

  // ---------- RSVPs (Supabase) ----------
  function setRsvp(eventId: string, person: string, value: "yes" | "no") {
    // Optimistic UI
    setState((s) => ({
      ...s,
      events: s.events.map((e) =>
        e.id !== eventId ? e : { ...e, rsvp: { ...(e.rsvp || {}), [person]: value } }
      ),
    }));

    supabase
      .from("rsvps")
      .upsert({ event_id: eventId, person, status: value })
      .then(({ error }) => {
        if (error) console.error(error);
      });
  }

  function setRsvpMany(eventId: string, people: string[], value: "yes" | "no") {
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
    supabase.from("rsvps").upsert(rows).then(({ error }) => {
      if (error) console.error(error);
    });
  }

  // ---------- Meals (Supabase) ----------
  function toggleMeal(day: string, meal: "breakfast" | "lunch" | "dinner", person: string) {
    const nextValue = !state.meals?.[day]?.[meal]?.[person];

    // Optimistic UI
    setState((s) => ({
      ...s,
      meals: {
        ...s.meals,
        [day]: {
          ...s.meals[day],
          [meal]: {
            ...s.meals[day][meal],
            [person]: nextValue,
          },
        },
      },
    }));

    supabase
      .from("meals")
      .upsert({ day, meal_type: meal, person, enabled: nextValue })
      .then(({ error }) => {
        if (error) console.error(error);
      });
  }

  function setMealMany(day: string, meal: "breakfast" | "lunch" | "dinner", people: string[], value: boolean) {
    // Optimistic UI
    setState((s) => ({
      ...s,
      meals: {
        ...s.meals,
        [day]: {
          ...s.meals[day],
          [meal]: {
            ...s.meals[day][meal],
            ...Object.fromEntries(people.map((p) => [p, value])),
          },
        },
      },
    }));

    const rows = people.map((p) => ({ day, meal_type: meal, person: p, enabled: value }));
    supabase.from("meals").upsert(rows).then(({ error }) => {
      if (error) console.error(error);
    });
  }

  // ---------- Profiles/Flights (Supabase) ----------
  function updateProfile(person: string, patch: any) {
    // optimistic
    setState((s) => ({
      ...s,
      profiles: {
        ...s.profiles,
        [person]: { ...(s.profiles[person] || {}), ...patch },
      },
    }));

    const merged = {
      ...(state.profiles?.[person] || {}),
      ...patch,
    };

    const payload = {
      person,
      arrival_date: merged.arrival?.date || null,
      arrival_time: merged.arrival?.time || null,
      arrival_flight: merged.arrival?.flight || null,
      departure_date: merged.departure?.date || null,
      departure_time: merged.departure?.time || null,
      departure_flight: merged.departure?.flight || null,
    };

    supabase.from("profiles").upsert(payload).then(({ error }) => {
      if (error) console.error(error);
    });
  }

  // ---------- Export (Supabase snapshot) ----------
  function exportJson() {
    const payload = {
      exportedAt: new Date().toISOString(),
      participants: state.participants,
      events: state.events,
      meals: state.meals,
      profiles: state.profiles,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bday40-planner-export.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  if (!currentUser) {
    return <LoginScreen participants={state.participants} onLogin={loginAs} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-rose-50 dark:from-indigo-950 dark:via-background dark:to-rose-950">
      <div className="mx-auto max-w-4xl p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex flex-col gap-4"
        >
          {/* Header */}
          <div className="flex flex-col gap-3 rounded-2xl border bg-card/80 backdrop-blur p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-rose-500/20 border">
                    <Calendar className="h-5 w-5" />
                  </span>
                  <div>
                    <h1 className="text-xl font-semibold leading-tight">Marco 40 · Trip Planner</h1>
                    <p className="text-sm text-muted-foreground">01.–06.09.2026 · Mobil im Browser</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="rounded-xl" onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" /> Logout
                </Button>

                <Button variant="outline" size="sm" className="rounded-xl" onClick={reloadAll}>
                  <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                </Button>

                {state.admin.isUnlocked ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={lockAdmin}
                    className="rounded-xl border border-indigo-500/20 bg-indigo-500/10"
                  >
                    <Shield className="mr-2 h-4 w-4" /> Admin: an
                  </Button>
                ) : (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="rounded-xl">
                        <Shield className="mr-2 h-4 w-4" /> Admin
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="rounded-2xl">
                      <DialogHeader>
                        <DialogTitle>Admin entsperren</DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-2">
                        <Label htmlFor="pin">PIN</Label>
                        <Input
                          id="pin"
                          value={pin}
                          onChange={(e) => setPin(e.target.value)}
                          inputMode="numeric"
                          placeholder="z.B. 4040"
                          className="rounded-xl"
                        />
                        {pinError ? <p className="text-sm text-destructive">{pinError}</p> : null}
                        <p className="text-xs text-muted-foreground">
                          MVP-Hinweis: PIN ist nur ein leichter Schutz (kein echter Login).
                        </p>
                      </div>
                      <DialogFooter>
                        <Button
                          onClick={unlockAdmin}
                          className="rounded-xl bg-gradient-to-r from-indigo-600 to-rose-600 text-white hover:opacity-95"
                        >
                          Entsperren
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Pill icon={Users} className="bg-white/50 dark:bg-background/30">
                {state.participants.length} Teilnehmer
              </Pill>
              <Pill icon={UtensilsCrossed} className="bg-white/50 dark:bg-background/30">
                Meals (Supabase)
              </Pill>
              <Pill icon={Plane} className="bg-white/50 dark:bg-background/30">
                Flüge (Supabase)
              </Pill>
              <Pill icon={Sparkles} className="bg-white/50 dark:bg-background/30">
                Zusagen grün · Absagen rot
              </Pill>
              {isLoading ? <Badge variant="secondary">lädt…</Badge> : null}
              {loadError ? <Badge variant="destructive">{loadError}</Badge> : null}
            </div>

            <Separator />

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-1">
                <Label>Angemeldet als</Label>
                <div className="mt-1 rounded-xl border bg-muted/20 px-3 py-2 text-sm">
                  <span className="font-semibold">{currentUser}</span>
                  {managedPeople.length > 1 ? (
                    <span className="text-muted-foreground"> · kann auch für Kinder klicken</span>
                  ) : null}
                </div>

                <div className="mt-3">
                  <Label>Ändern für</Label>
                  <Select value={actingPerson} onValueChange={setActingPerson}>
                    <SelectTrigger className="mt-1 rounded-xl">
                      <SelectValue placeholder="Person auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {managedPeople.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="mt-2 flex items-center gap-2">
                    <CountBadge label="zugesagt" value={actingRsvpCounts.yes} />
                    <CountBadge label="offen/abgesagt" value={actingRsvpCounts.no} />
                  </div>
                </div>
              </div>

              <div className="sm:col-span-2">
                <Label>Suche / Filter</Label>
                <div className="mt-1 flex flex-col gap-2 sm:flex-row">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={filter.q}
                      onChange={(e) => setFilter((f) => ({ ...f, q: e.target.value }))}
                      placeholder="Event, Ort, Stichwort…"
                      className="pl-9 rounded-xl"
                    />
                  </div>
                  <Select value={filter.day} onValueChange={(v) => setFilter((f) => ({ ...f, day: v }))}>
                    <SelectTrigger className="rounded-xl sm:w-[220px]">
                      <SelectValue placeholder="Tag" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle Tage</SelectItem>
                      {TRIP_DAYS.map((d) => (
                        <SelectItem key={d} value={d}>
                          {formatDayLabel(d)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button variant="outline" size="sm" className="rounded-xl" onClick={exportJson}>
                    <Download className="mr-2 h-4 w-4" /> Export
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="calendar" className="w-full">
            <TabsList className="grid w-full grid-cols-3 rounded-2xl bg-card/70 backdrop-blur border">
              <TabsTrigger value="calendar" className="rounded-2xl">Kalender</TabsTrigger>
              <TabsTrigger value="meals" className="rounded-2xl">Meals</TabsTrigger>
              <TabsTrigger value="flights" className="rounded-2xl">Flüge</TabsTrigger>
            </TabsList>

            {/* Calendar */}
            <TabsContent value="calendar" className="mt-4">
              <Card className="rounded-2xl bg-card/80 backdrop-blur border">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base">Wochenplan</CardTitle>
                    {isAdmin ? (
                      <Button
                        onClick={openNewEvent}
                        size="sm"
                        className="rounded-xl bg-gradient-to-r from-indigo-600 to-rose-600 text-white hover:opacity-95"
                      >
                        <Plus className="mr-2 h-4 w-4" /> Event
                      </Button>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent className="grid gap-4">
                  {TRIP_DAYS.map((day) => {
                    const items = eventsByDay[day] || [];
                    return (
                      <div key={day} className="rounded-2xl border bg-card/50 p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <div className="font-semibold">{formatDayLabel(day)}</div>
                          <Badge variant="secondary">{items.length} Events</Badge>
                        </div>

                        {items.length === 0 ? (
                          <div className="text-sm text-muted-foreground">Keine Events (noch).</div>
                        ) : (
                          <div className="grid gap-3">
                            {items.map((e) => {
                              const yesList = state.participants.filter((p) => (e.rsvp || {})[p] === "yes");
                              const noList = state.participants.filter((p) => (e.rsvp || {})[p] !== "yes");

                              const yesCount = yesList.length;
                              const cap = typeof e.capacity === "number" ? e.capacity : undefined;
                              const isFull = typeof cap === "number" && yesCount >= cap;
                              const my = (e.rsvp || {})[actingPerson] === "yes" ? "yes" : "no";

                              const famNames = managedPeople;
                              const rsvpExpanded = !!expandedRsvp[e.id];

                              return (
                                <motion.div
                                  key={e.id}
                                  initial={{ opacity: 0, y: 6 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ duration: 0.25 }}
                                  className="rounded-2xl border bg-card p-3 shadow-sm relative overflow-hidden"
                                >
                                  <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-indigo-500 to-rose-500" />

                                  <div className="pl-3 flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <h4 className="truncate font-semibold">{e.title}</h4>
                                        {cap ? (
                                          <Badge variant={isFull ? "destructive" : "secondary"}>
                                            {yesCount}/{cap}
                                          </Badge>
                                        ) : (
                                          <Badge variant="secondary">{yesCount} dabei</Badge>
                                        )}
                                        <span
                                          className={
                                            "inline-flex items-center rounded-full px-2.5 py-1 text-xs border " +
                                            (my === "yes"
                                              ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-300"
                                              : "bg-rose-500/10 text-rose-700 border-rose-500/30 dark:text-rose-300")
                                          }
                                        >
                                          {actingPerson}: {my === "yes" ? "zugesagt" : "abgesagt"}
                                        </span>
                                      </div>

                                      <div className="mt-2 flex flex-wrap gap-2">
                                        {e.startTime || e.endTime ? (
                                          <Pill icon={Clock} className="bg-white/40 dark:bg-background/20">
                                            {(e.startTime || "").trim()}
                                            {e.endTime ? `–${e.endTime}` : ""}
                                          </Pill>
                                        ) : null}
                                        {e.location ? (
                                          <Pill icon={MapPin} className="bg-white/40 dark:bg-background/20">
                                            {e.location}
                                          </Pill>
                                        ) : null}
                                      </div>

                                      {e.description ? (
                                        <p className="mt-2 text-sm text-muted-foreground">{e.description}</p>
                                      ) : null}
                                    </div>

                                    {isAdmin ? (
                                      <div className="flex shrink-0 flex-col gap-2">
                                        <Button variant="outline" size="sm" className="rounded-xl" onClick={() => openEditEvent(e)}>
                                          Bearbeiten
                                        </Button>
                                        <Button variant="destructive" size="sm" className="rounded-xl" onClick={() => deleteEvent(e.id)}>
                                          Löschen
                                        </Button>
                                      </div>
                                    ) : null}
                                  </div>

                                  <Separator className="my-3" />

                                  <div className="pl-3 grid gap-3">
                                    <SectionTitle
                                      icon={Users}
                                      title="Teilnahme"
                                      right={
                                        <div className="flex items-center gap-2">
                                          <Button
                                            size="sm"
                                            className="rounded-xl bg-emerald-600 text-white hover:opacity-95"
                                            disabled={isFull && my !== "yes"}
                                            onClick={() => setRsvp(e.id, actingPerson, "yes")}
                                          >
                                            Zusagen
                                          </Button>
                                          <Button
                                            size="sm"
                                            className="rounded-xl bg-rose-600 text-white hover:opacity-95"
                                            onClick={() => setRsvp(e.id, actingPerson, "no")}
                                          >
                                            Absagen
                                          </Button>
                                        </div>
                                      }
                                    />

                                    {famNames.length > 1 ? (
                                      <div className="flex flex-wrap items-center gap-2">
                                        <Badge variant="secondary" className="rounded-full">Meine Family</Badge>
                                        <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setRsvpMany(e.id, famNames, "yes")}>
                                          Alle zusagen
                                        </Button>
                                        <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setRsvpMany(e.id, famNames, "no")}>
                                          Alle absagen
                                        </Button>
                                        {kids.length > 0 ? (
                                          <>
                                            <Button size="sm" className="rounded-xl bg-emerald-600 text-white hover:opacity-95" onClick={() => setRsvpMany(e.id, kids, "yes")}>
                                              Nur Kids zusagen
                                            </Button>
                                            <Button size="sm" className="rounded-xl bg-rose-600 text-white hover:opacity-95" onClick={() => setRsvpMany(e.id, kids, "no")}>
                                              Nur Kids absagen
                                            </Button>
                                          </>
                                        ) : null}
                                      </div>
                                    ) : null}

                                    <CompactList
                                      title="Teilnehmer"
                                      yes={yesList}
                                      no={noList}
                                      expanded={rsvpExpanded}
                                      onToggle={() => setExpandedRsvp((m) => ({ ...m, [e.id]: !m[e.id] }))}
                                      limit={10}
                                    />
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Event Dialog */}
              <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
                <DialogContent className="rounded-2xl">
                  <DialogHeader>
                    <DialogTitle>{editingEventId ? "Event bearbeiten" : "Neues Event"}</DialogTitle>
                  </DialogHeader>

                  <div className="grid gap-3">
                    <div className="grid gap-1">
                      <Label>Titel</Label>
                      <Input
                        value={eventDraft.title}
                        onChange={(e) => setEventDraft((d: any) => ({ ...d, title: e.target.value }))}
                        placeholder="z.B. Wüstentour"
                        className="rounded-xl"
                      />
                    </div>

                    <div className="grid gap-1">
                      <Label>Tag</Label>
                      <Select value={eventDraft.date} onValueChange={(v) => setEventDraft((d: any) => ({ ...d, date: v }))}>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TRIP_DAYS.map((d) => (
                            <SelectItem key={d} value={d}>
                              {formatDayLabel(d)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-1">
                        <Label>Start</Label>
                        <Input
                          value={eventDraft.startTime}
                          onChange={(e) => setEventDraft((d: any) => ({ ...d, startTime: e.target.value }))}
                          placeholder="HH:MM"
                          inputMode="numeric"
                          className="rounded-xl"
                        />
                      </div>
                      <div className="grid gap-1">
                        <Label>Ende</Label>
                        <Input
                          value={eventDraft.endTime}
                          onChange={(e) => setEventDraft((d: any) => ({ ...d, endTime: e.target.value }))}
                          placeholder="HH:MM"
                          inputMode="numeric"
                          className="rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="grid gap-1">
                      <Label>Ort</Label>
                      <Input
                        value={eventDraft.location}
                        onChange={(e) => setEventDraft((d: any) => ({ ...d, location: e.target.value }))}
                        placeholder="z.B. Villa / City / Restaurant"
                        className="rounded-xl"
                      />
                    </div>

                    <div className="grid gap-1">
                      <Label>Kapazität (optional)</Label>
                      <Input
                        value={typeof eventDraft.capacity === "number" ? String(eventDraft.capacity) : ""}
                        onChange={(e) => {
                          const raw = e.target.value.trim();
                          if (!raw) return setEventDraft((d: any) => ({ ...d, capacity: undefined }));
                          const n = clamp(parseInt(raw, 10) || 0, 1, 200);
                          setEventDraft((d: any) => ({ ...d, capacity: n }));
                        }}
                        placeholder="z.B. 12"
                        inputMode="numeric"
                        className="rounded-xl"
                      />
                      <p className="text-xs text-muted-foreground">Wenn gesetzt, können sich maximal so viele Leute zusagen.</p>
                    </div>

                    <div className="grid gap-1">
                      <Label>Beschreibung</Label>
                      <Textarea
                        value={eventDraft.description}
                        onChange={(e) => setEventDraft((d: any) => ({ ...d, description: e.target.value }))}
                        placeholder="Kurzbeschreibung…"
                        className="rounded-xl"
                      />
                    </div>
                  </div>

                  <DialogFooter className="gap-2">
                    <Button variant="outline" className="rounded-xl" onClick={() => setEventDialogOpen(false)}>
                      Abbrechen
                    </Button>
                    <Button
                      className="rounded-xl bg-gradient-to-r from-indigo-600 to-rose-600 text-white hover:opacity-95"
                      onClick={upsertEvent}
                    >
                      Speichern
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </TabsContent>

            {/* Meals */}
            <TabsContent value="meals" className="mt-4">
              <Card className="rounded-2xl bg-card/80 backdrop-blur border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Mahlzeiten im Haus</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                  {TRIP_DAYS.map((day) => {
                    const m = state.meals[day];
                    const bYes = state.participants.filter((p) => !!m.breakfast[p]);
                    const lYes = state.participants.filter((p) => !!m.lunch[p]);
                    const dYes = state.participants.filter((p) => !!m.dinner[p]);

                    return (
                      <div key={day} className="rounded-2xl border bg-card/50 p-3">
                        <div className="flex items-center justify-between">
                          <div className="font-semibold">{formatDayLabel(day)}</div>
                          <div className="flex items-center gap-2">
                            <Badge className="rounded-full bg-emerald-600 text-white">F {bYes.length}</Badge>
                            <Badge className="rounded-full bg-emerald-600 text-white">M {lYes.length}</Badge>
                            <Badge className="rounded-full bg-emerald-600 text-white">A {dYes.length}</Badge>
                          </div>
                        </div>

                        <Separator className="my-3" />

                        <div className="grid gap-3">
                          {([
                            { key: "breakfast", label: "Frühstück" },
                            { key: "lunch", label: "Mittagessen" },
                            { key: "dinner", label: "Abendessen" },
                          ] as const).map(({ key, label }) => {
                            const meal = m[key];
                            const yesList = state.participants.filter((p) => !!meal[p]);
                            const noList = state.participants.filter((p) => !meal[p]);
                            const expandedKey = `${day}_${key}`;
                            const expanded = !!expandedMeals[expandedKey];
                            const on = !!meal[actingPerson];

                            return (
                              <div key={key} className="rounded-2xl border bg-card p-3 relative overflow-hidden">
                                <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-emerald-500 to-teal-500" />

                                <div className="pl-3">
                                  <div className="flex items-center justify-between gap-3">
                                    <SectionTitle icon={UtensilsCrossed} title={label} />
                                    <Button
                                      size="sm"
                                      className={
                                        "rounded-xl text-white hover:opacity-95 " +
                                        (on ? "bg-rose-600" : "bg-emerald-600")
                                      }
                                      onClick={() => toggleMeal(day, key, actingPerson)}
                                    >
                                      {on ? "Abmelden" : "Anmelden"}
                                    </Button>
                                  </div>

                                  {managedPeople.length > 1 ? (
                                    <div className="mt-2 flex flex-wrap items-center gap-2">
                                      <Badge variant="secondary" className="rounded-full">Meine Family</Badge>
                                      <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setMealMany(day, key, managedPeople, true)}>
                                        Alle anmelden
                                      </Button>
                                      <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setMealMany(day, key, managedPeople, false)}>
                                        Alle abmelden
                                      </Button>
                                      {kids.length > 0 ? (
                                        <>
                                          <Button size="sm" className="rounded-xl bg-emerald-600 text-white hover:opacity-95" onClick={() => setMealMany(day, key, kids, true)}>
                                            Nur Kids anmelden
                                          </Button>
                                          <Button size="sm" className="rounded-xl bg-rose-600 text-white hover:opacity-95" onClick={() => setMealMany(day, key, kids, false)}>
                                            Nur Kids abmelden
                                          </Button>
                                        </>
                                      ) : null}
                                    </div>
                                  ) : null}

                                  <div className="mt-3">
                                    <CompactList
                                      title="Anmeldungen"
                                      yes={yesList}
                                      no={noList}
                                      expanded={expanded}
                                      onToggle={() => setExpandedMeals((m2) => ({ ...m2, [expandedKey]: !m2[expandedKey] }))}
                                      limit={10}
                                      right={<Badge className="rounded-full bg-emerald-600 text-white">{yesList.length}</Badge>}
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Flights */}
            <TabsContent value="flights" className="mt-4">
              <Card className="rounded-2xl bg-card/80 backdrop-blur border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Ankunft & Abflug</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="rounded-2xl border bg-card/50 p-3">
                    <SectionTitle icon={Plane} title="Flugdaten für ausgewählte Person" />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Du bearbeitest gerade: <span className="font-semibold">{actingPerson}</span>
                    </p>

                    <div className="mt-3 grid gap-4 sm:grid-cols-2">
                      <div className="rounded-2xl border bg-card p-3 relative overflow-hidden">
                        <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-indigo-500 to-sky-500" />
                        <div className="pl-3">
                          <div className="font-semibold">Ankunft</div>
                          <div className="mt-2 grid gap-2">
                            <div className="grid gap-1">
                              <Label>Datum</Label>
                              <Input
                                type="date"
                                value={state.profiles[actingPerson]?.arrival?.date || ""}
                                onChange={(e) =>
                                  updateProfile(actingPerson, {
                                    arrival: {
                                      ...(state.profiles[actingPerson]?.arrival || {}),
                                      date: e.target.value,
                                    },
                                  })
                                }
                                className="rounded-xl"
                              />
                            </div>
                            <div className="grid gap-1">
                              <Label>Uhrzeit</Label>
                              <Input
                                type="time"
                                value={state.profiles[actingPerson]?.arrival?.time || ""}
                                onChange={(e) =>
                                  updateProfile(actingPerson, {
                                    arrival: {
                                      ...(state.profiles[actingPerson]?.arrival || {}),
                                      time: e.target.value,
                                    },
                                  })
                                }
                                className="rounded-xl"
                              />
                            </div>
                            <div className="grid gap-1">
                              <Label>Flug (optional)</Label>
                              <Input
                                value={state.profiles[actingPerson]?.arrival?.flight || ""}
                                onChange={(e) =>
                                  updateProfile(actingPerson, {
                                    arrival: {
                                      ...(state.profiles[actingPerson]?.arrival || {}),
                                      flight: e.target.value,
                                    },
                                  })
                                }
                                placeholder="z.B. LH123"
                                className="rounded-xl"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border bg-card p-3 relative overflow-hidden">
                        <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-rose-500 to-orange-500" />
                        <div className="pl-3">
                          <div className="font-semibold">Abflug</div>
                          <div className="mt-2 grid gap-2">
                            <div className="grid gap-1">
                              <Label>Datum</Label>
                              <Input
                                type="date"
                                value={state.profiles[actingPerson]?.departure?.date || ""}
                                onChange={(e) =>
                                  updateProfile(actingPerson, {
                                    departure: {
                                      ...(state.profiles[actingPerson]?.departure || {}),
                                      date: e.target.value,
                                    },
                                  })
                                }
                                className="rounded-xl"
                              />
                            </div>
                            <div className="grid gap-1">
                              <Label>Uhrzeit</Label>
                              <Input
                                type="time"
                                value={state.profiles[actingPerson]?.departure?.time || ""}
                                onChange={(e) =>
                                  updateProfile(actingPerson, {
                                    departure: {
                                      ...(state.profiles[actingPerson]?.departure || {}),
                                      time: e.target.value,
                                    },
                                  })
                                }
                                className="rounded-xl"
                              />
                            </div>
                            <div className="grid gap-1">
                              <Label>Flug (optional)</Label>
                              <Input
                                value={state.profiles[actingPerson]?.departure?.flight || ""}
                                onChange={(e) =>
                                  updateProfile(actingPerson, {
                                    departure: {
                                      ...(state.profiles[actingPerson]?.departure || {}),
                                      flight: e.target.value,
                                    },
                                  })
                                }
                                placeholder="z.B. TK456"
                                className="rounded-xl"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border bg-card/50 p-3">
                    <SectionTitle icon={Users} title="Übersicht (alle)" />
                    <div className="mt-3 grid gap-2">
                      {state.participants.map((p) => {
                        const prof = state.profiles[p] || {};
                        const a = prof.arrival || {};
                        const d = prof.departure || {};
                        return (
                          <div
                            key={p}
                            className="flex flex-col gap-1 rounded-2xl border bg-card p-3 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="font-semibold">{p}</div>
                            <div className="flex flex-wrap gap-2 text-sm">
                              <Pill icon={Plane} className="bg-white/40 dark:bg-background/20">
                                <span className="font-semibold">An:</span> {a.date || "—"} {a.time || ""} {a.flight ? `(${a.flight})` : ""}
                              </Pill>
                              <Pill icon={Plane} className="bg-white/40 dark:bg-background/20">
                                <span className="font-semibold">Ab:</span> {d.date || "—"} {d.time || ""} {d.flight ? `(${d.flight})` : ""}
                              </Pill>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Footer */}
          <div className="rounded-2xl border bg-card/80 backdrop-blur p-4 text-sm text-muted-foreground">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-rose-500/20 border">
                  <Users className="h-4 w-4" />
                </span>
                <div>
                  <div className="font-medium text-foreground">Shared via Supabase</div>
                  <div>Events · RSVPs · Meals · Flights</div>
                </div>
              </div>
              <div className="text-xs">Admin-PIN (MVP): <span className="font-mono">{DEFAULT_ADMIN_PIN}</span></div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
