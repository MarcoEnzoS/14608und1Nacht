'use client'

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

import {
  Calendar,
  Clock,
  Euro,
  LogOut,
  MapPin,
  Plane,
  Plus,
  RefreshCw,
  Shield,
  UtensilsCrossed,
  Users,
} from "lucide-react";

import { TRIP_DAYS, DEFAULT_ADMIN_PIN } from "@/lib/constants";
import { formatDayLabel, formatEur, stableEventId } from "@/lib/format";
import { getManagedPeople, getFamilyGroupForCosts } from "@/lib/family";
import type { RsvpStatus } from "@/lib/types";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useTripData } from "@/hooks/useTripData";

import { LoginScreen, CompactList } from "@/components/TripUI";
import { EventDialog } from "@/components/EventDialog";

export default function Page() {
  const { currentUser, loginAs, logout } = useCurrentUser();

  const {
    state,
    isLoading,
    loadError,
    reloadAll,
    upsertEvent,
    deleteEvent,
    setRsvp,
    setRsvpMany,
    toggleMeal,
    setMealMany,
    updateProfile,
  } = useTripData();

  // Family helpers
  const managedPeople = useMemo(() => getManagedPeople(currentUser), [currentUser]);
  const familyForCosts = useMemo(() => getFamilyGroupForCosts(currentUser), [currentUser]);

  // acting person (parent can switch)
  const [actingPerson, setActingPerson] = useState("");
  useEffect(() => {
    if (!currentUser) {
      setActingPerson("");
      return;
    }
    const allowed = getManagedPeople(currentUser);
    if (!actingPerson || !allowed.includes(actingPerson)) setActingPerson(allowed[0] || currentUser);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // polling (keep view same)
  useEffect(() => {
    if (!currentUser) return;
    reloadAll();
    const t = setInterval(() => reloadAll(), 15000);
    return () => clearInterval(t);
  }, [currentUser, reloadAll]);

  // Expand states (FIX for your crash)
  const [expandedRsvp, setExpandedRsvp] = useState<Record<string, boolean>>({});
  const [expandedMeals, setExpandedMeals] = useState<Record<string, boolean>>({});

  // Admin (only Marco)
  const isMarco = currentUser === "Marco";
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");

  function unlockAdmin() {
    setPinError("");
    if (pin === DEFAULT_ADMIN_PIN) {
      setAdminUnlocked(true);
      setPin("");
    } else {
      setPinError("Falsche PIN");
    }
  }

  // Event Dialog state
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  const emptyDraft = useMemo(
    () => ({
      id: stableEventId(),
      title: "",
      date: TRIP_DAYS[0],
      startTime: "",
      endTime: "",
      location: "",
      description: "",
      capacity: undefined as number | undefined,
      priceEur: undefined as number | undefined,
    }),
    []
  );

  const [draft, setDraft] = useState<any>(emptyDraft);

  function openNewEvent() {
    setEditing(false);
    setDraft({ ...emptyDraft, id: stableEventId() });
    setEventDialogOpen(true);
  }

  function openEditEvent(e: any) {
    setEditing(true);
    setDraft({
      id: e.id,
      title: e.title,
      date: e.date,
      startTime: e.startTime || "",
      endTime: e.endTime || "",
      location: e.location || "",
      description: e.description || "",
      capacity: typeof e.capacity === "number" ? e.capacity : undefined,
      priceEur: typeof e.priceEur === "number" ? e.priceEur : undefined,
    });
    setEventDialogOpen(true);
  }

  async function saveEvent() {
    const title = String(draft.title || "").trim();
    if (!title) return;

    await upsertEvent({
      id: draft.id || stableEventId(),
      title,
      date: draft.date,
      start_time: draft.startTime || null,
      end_time: draft.endTime || null,
      location: draft.location || null,
      description: draft.description || null,
      capacity: typeof draft.capacity === "number" ? draft.capacity : null,
      price_eur: typeof draft.priceEur === "number" ? draft.priceEur : null,
    });

    setEventDialogOpen(false);
  }

  const eventsByDay = useMemo(() => {
    const by: Record<string, any[]> = Object.fromEntries(TRIP_DAYS.map((d) => [d, []]));
    for (const e of state.events) {
      if (!by[e.date]) by[e.date] = [];
      by[e.date].push(e);
    }
    return by;
  }, [state.events]);

  const expectedCost = useMemo(() => {
    const people = familyForCosts.people;
    if (!people.length) return 0;

    let sum = 0;
    for (const evt of state.events) {
      const price = typeof evt.priceEur === "number" && Number.isFinite(evt.priceEur) ? evt.priceEur : 0;
      if (price <= 0) continue;

      for (const p of people) {
        if ((evt.rsvp || {})[p] === "yes") sum += price;
      }
    }
    return sum;
  }, [state.events, familyForCosts.people]);

  if (!currentUser) return <LoginScreen participants={state.participants} onLogin={loginAs} />;

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-rose-50 dark:from-indigo-950 dark:via-background dark:to-rose-950">
      <div className="mx-auto max-w-4xl p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex flex-col gap-4"
        >
          {/* Header (minimal, wie du es wolltest) */}
          <div className="flex flex-col gap-3 rounded-2xl border bg-card/80 backdrop-blur p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-rose-500/20 border">
                  <Calendar className="h-5 w-5" />
                </span>
                <h1 className="text-xl font-semibold leading-tight">Marco 40 · Trip Planner</h1>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="rounded-xl" onClick={reloadAll}>
                  <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                </Button>
                <Button variant="outline" size="sm" className="rounded-xl" onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" /> Logout
                </Button>

                {/* Admin only for Marco */}
                {isMarco ? (
                  adminUnlocked ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="rounded-xl border border-indigo-500/20 bg-indigo-500/10"
                      onClick={() => setAdminUnlocked(false)}
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
                            className="rounded-xl"
                          />
                          {pinError ? <p className="text-sm text-destructive">{pinError}</p> : null}
                        </div>
                        <DialogFooter>
                          <Button
                            className="rounded-xl bg-gradient-to-r from-indigo-600 to-rose-600 text-white hover:opacity-95"
                            onClick={unlockAdmin}
                          >
                            Entsperren
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )
                ) : null}
              </div>
            </div>

            <Separator />

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-1">
                <Label>Angemeldet als</Label>
                <div className="mt-1 rounded-xl border bg-muted/20 px-3 py-2 text-sm">
                  <span className="font-semibold">{currentUser}</span>
                </div>

                {managedPeople.length > 1 ? (
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
                  </div>
                ) : null}
              </div>

              <div className="sm:col-span-2">
                <Label>
                  {familyForCosts.label === "deine Family"
                    ? `Voraussichtliche Kosten für deine Family: ${formatEur(expectedCost)}`
                    : `Voraussichtliche Kosten für dich: ${formatEur(expectedCost)}`}
                </Label>
                <div className="mt-1 rounded-xl border bg-muted/20 px-3 py-3 text-sm flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Euro className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold">{formatEur(expectedCost)}</span>
                    <span className="text-muted-foreground">(nur Zusagen)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isLoading ? <Badge variant="secondary">lädt…</Badge> : null}
                    {loadError ? <Badge variant="destructive">{loadError}</Badge> : null}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs (Ansicht bleibt wie sie ist) */}
          <Tabs defaultValue="calendar" className="w-full">
            <TabsList className="grid w-full grid-cols-3 rounded-2xl bg-card/70 backdrop-blur border">
              <TabsTrigger value="calendar" className="rounded-2xl">
                Kalender
              </TabsTrigger>
              <TabsTrigger value="meals" className="rounded-2xl">
                Meals
              </TabsTrigger>
              <TabsTrigger value="flights" className="rounded-2xl">
                Flüge
              </TabsTrigger>
            </TabsList>

            {/* Calendar */}
            <TabsContent value="calendar" className="mt-4">
              <Card className="rounded-2xl bg-card/80 backdrop-blur border">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base">Wochenplan</CardTitle>
                    {adminUnlocked ? (
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
                              const noList = state.participants.filter((p) => (e.rsvp || {})[p] === "no");
                              const pendingList = state.participants.filter((p) => (e.rsvp || {})[p] === "pending");

                              const yesCount = yesList.length;
                              const cap = typeof e.capacity === "number" ? e.capacity : undefined;
                              const isFull = typeof cap === "number" && yesCount >= cap;

                              const my: RsvpStatus =
                                (e.rsvp || {})[actingPerson] === "yes"
                                  ? "yes"
                                  : (e.rsvp || {})[actingPerson] === "no"
                                    ? "no"
                                    : "pending";

                              const fam = managedPeople;
                              const kids = fam.filter((p) => p !== currentUser);

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
                                              ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30"
                                              : my === "no"
                                                ? "bg-rose-500/10 text-rose-700 border-rose-500/30"
                                                : "bg-muted text-muted-foreground border")
                                          }
                                        >
                                          {actingPerson}: {my === "yes" ? "zugesagt" : my === "no" ? "abgesagt" : "offen"}
                                        </span>
                                      </div>

                                      <div className="mt-2 flex flex-wrap gap-2">
                                        {(e.startTime || e.endTime) ? (
                                          <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs bg-white/40 dark:bg-background/20">
                                            <Clock className="h-3.5 w-3.5" /> {(e.startTime || "").trim()}
                                            {e.endTime ? `–${e.endTime}` : ""}
                                          </span>
                                        ) : null}

                                        {typeof e.priceEur === "number" ? (
                                          <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs bg-white/40 dark:bg-background/20">
                                            <Euro className="h-3.5 w-3.5" /> {formatEur(e.priceEur)}
                                          </span>
                                        ) : null}

                                        {e.location ? (
                                          <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs bg-white/40 dark:bg-background/20">
                                            <MapPin className="h-3.5 w-3.5" /> {e.location}
                                          </span>
                                        ) : null}
                                      </div>

                                      {e.description ? <p className="mt-2 text-sm text-muted-foreground">{e.description}</p> : null}
                                    </div>

                                    {adminUnlocked ? (
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
                                    <div className="flex items-center justify-between gap-3">
                                      <div className="flex items-center gap-2">
                                        <Users className="h-4 w-4 text-muted-foreground" />
                                        <h3 className="text-sm font-semibold">Teilnahme</h3>
                                      </div>

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
                                    </div>

                                    {fam.length > 1 ? (
                                      <div className="flex flex-wrap items-center gap-2">
                                        <Badge variant="secondary" className="rounded-full">Meine Family</Badge>
                                        <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setRsvpMany(e.id, fam, "yes")}>
                                          Alle zusagen
                                        </Button>
                                        <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setRsvpMany(e.id, fam, "no")}>
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
                                      pending={pendingList}
                                      expanded={!!expandedRsvp[e.id]}
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

              <EventDialog
                open={eventDialogOpen}
                onOpenChange={setEventDialogOpen}
                editing={editing}
                draft={draft}
                setDraft={setDraft}
                onSave={saveEvent}
              />
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

                    const fam = managedPeople;
                    const kids = fam.filter((p) => p !== currentUser);

                    return (
                      <div key={day} className="rounded-2xl border bg-card/50 p-3">
                        <div className="flex items-center justify-between">
                          <div className="font-semibold">{formatDayLabel(day)}</div>
                        </div>

                        <Separator className="my-3" />

                        {(["breakfast", "lunch", "dinner"] as const).map((mealKey) => {
                          const label = mealKey === "breakfast" ? "Frühstück" : mealKey === "lunch" ? "Mittagessen" : "Abendessen";
                          const meal = m[mealKey];
                          const yesList = state.participants.filter((p) => !!meal[p]);
                          const noList = state.participants.filter((p) => !meal[p]);
                          const expandedKey = `${day}_${mealKey}`;

                          return (
                            <div key={mealKey} className="mt-3 rounded-2xl border bg-card p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
                                  <h3 className="text-sm font-semibold">{label}</h3>
                                </div>

                                <Button
                                  size="sm"
                                  className={"rounded-xl text-white hover:opacity-95 " + (meal[actingPerson] ? "bg-rose-600" : "bg-emerald-600")}
                                  onClick={() => toggleMeal(day, mealKey, actingPerson)}
                                >
                                  {meal[actingPerson] ? "Abmelden" : "Anmelden"}
                                </Button>
                              </div>

                              {fam.length > 1 ? (
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                  <Badge variant="secondary" className="rounded-full">Meine Family</Badge>
                                  <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setMealMany(day, mealKey, fam, true)}>Alle anmelden</Button>
                                  <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setMealMany(day, mealKey, fam, false)}>Alle abmelden</Button>

                                  {kids.length > 0 ? (
                                    <>
                                      <Button size="sm" className="rounded-xl bg-emerald-600 text-white hover:opacity-95" onClick={() => setMealMany(day, mealKey, kids, true)}>Nur Kids anmelden</Button>
                                      <Button size="sm" className="rounded-xl bg-rose-600 text-white hover:opacity-95" onClick={() => setMealMany(day, mealKey, kids, false)}>Nur Kids abmelden</Button>
                                    </>
                                  ) : null}
                                </div>
                              ) : null}

                              <div className="mt-2">
                                <CompactList
                                  title="Anmeldungen"
                                  yes={yesList}
                                  no={noList}
                                  pending={[]}
                                  expanded={!!expandedMeals[expandedKey]}
                                  onToggle={() => setExpandedMeals((s) => ({ ...s, [expandedKey]: !s[expandedKey] }))}
                                  limit={10}
                                />
                              </div>
                            </div>
                          );
                        })}
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
                    <div className="flex items-center gap-2">
                      <Plane className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-semibold">Flugdaten für ausgewählte Person</h3>
                    </div>

                    <p className="mt-1 text-xs text-muted-foreground">
                      Du bearbeitest gerade: <span className="font-semibold">{actingPerson}</span>
                    </p>

                    <div className="mt-3 grid gap-4 sm:grid-cols-2">
                      <div className="rounded-2xl border bg-card p-3">
                        <div className="font-semibold">Ankunft</div>
                        <div className="mt-2 grid gap-2">
                          <div className="grid gap-1">
                            <Label>Datum</Label>
                            <Input
                              type="date"
                              value={state.profiles[actingPerson]?.arrival?.date || ""}
                              onChange={(e) =>
                                updateProfile(actingPerson, { arrival: { ...(state.profiles[actingPerson]?.arrival || {}), date: e.target.value } })
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
                                updateProfile(actingPerson, { arrival: { ...(state.profiles[actingPerson]?.arrival || {}), time: e.target.value } })
                              }
                              className="rounded-xl"
                            />
                          </div>
                          <div className="grid gap-1">
                            <Label>Flug (optional)</Label>
                            <Input
                              value={state.profiles[actingPerson]?.arrival?.flight || ""}
                              onChange={(e) =>
                                updateProfile(actingPerson, { arrival: { ...(state.profiles[actingPerson]?.arrival || {}), flight: e.target.value } })
                              }
                              className="rounded-xl"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border bg-card p-3">
                        <div className="font-semibold">Abflug</div>
                        <div className="mt-2 grid gap-2">
                          <div className="grid gap-1">
                            <Label>Datum</Label>
                            <Input
                              type="date"
                              value={state.profiles[actingPerson]?.departure?.date || ""}
                              onChange={(e) =>
                                updateProfile(actingPerson, { departure: { ...(state.profiles[actingPerson]?.departure || {}), date: e.target.value } })
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
                                updateProfile(actingPerson, { departure: { ...(state.profiles[actingPerson]?.departure || {}), time: e.target.value } })
                              }
                              className="rounded-xl"
                            />
                          </div>
                          <div className="grid gap-1">
                            <Label>Flug (optional)</Label>
                            <Input
                              value={state.profiles[actingPerson]?.departure?.flight || ""}
                              onChange={(e) =>
                                updateProfile(actingPerson, { departure: { ...(state.profiles[actingPerson]?.departure || {}), flight: e.target.value } })
                              }
                              className="rounded-xl"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border bg-card/50 p-3">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-semibold">Übersicht (alle)</h3>
                    </div>

                    <div className="mt-3 grid gap-2">
                      {state.participants.map((p) => {
                        const prof = state.profiles[p] || {};
                        const a = prof.arrival || {};
                        const d = prof.departure || {};
                        return (
                          <div key={p} className="flex flex-col gap-1 rounded-2xl border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="font-semibold">{p}</div>
                            <div className="flex flex-wrap gap-2 text-sm">
                              <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs bg-white/40 dark:bg-background/20">
                                <Plane className="h-3.5 w-3.5" /> <span className="font-semibold">An:</span> {a.date || "—"} {a.time || ""} {a.flight ? `(${a.flight})` : ""}
                              </span>
                              <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs bg-white/40 dark:bg-background/20">
                                <Plane className="h-3.5 w-3.5" /> <span className="font-semibold">Ab:</span> {d.date || "—"} {d.time || ""} {d.flight ? `(${d.flight})` : ""}
                              </span>
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
        </motion.div>
      </div>
    </div>
  );
}
