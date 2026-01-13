import React, { useState } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { CheckCircle2, Clock, UserCircle2, XCircle, Users } from "lucide-react";
import type { RsvpStatus } from "@/lib/types";

export function LoginScreen({ participants, onLogin }: any) {
  const [name, setName] = useState("");
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-rose-50 dark:from-indigo-950 dark:via-background dark:to-rose-950">
      <div className="mx-auto max-w-md p-4 sm:p-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="flex flex-col gap-4">
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
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="mt-5">
              <Button className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-rose-600 text-white hover:opacity-95" disabled={!name} onClick={() => name && onLogin(name)}>
                Weiter
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export function RSVPBadge({ name, status }: { name: string; status: RsvpStatus }) {
  return (
    <span
      className={
        "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium " +
        (status === "yes"
          ? "bg-emerald-500/15 text-emerald-700 border border-emerald-500/30 dark:text-emerald-300"
          : status === "no"
            ? "bg-rose-500/15 text-rose-700 border border-rose-500/30 dark:text-rose-300"
            : "bg-muted text-muted-foreground border")
      }
    >
      {status === "yes" ? (
        <CheckCircle2 className="h-3.5 w-3.5" />
      ) : status === "no" ? (
        <XCircle className="h-3.5 w-3.5" />
      ) : (
        <Clock className="h-3.5 w-3.5" />
      )}
      {name}
    </span>
  );
}

function chunkDisplay(list: string[], limit: number) {
  const shown = list.slice(0, limit);
  const rest = list.length - shown.length;
  return { shown, rest };
}

export function CompactList({ title, yes, no, pending, expanded, onToggle, limit = 10 }: any) {
  const { shown, rest } = chunkDisplay(yes, limit);
  const pendingCount = Array.isArray(pending) ? pending.length : 0;

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        <Button variant="outline" size="sm" className="rounded-xl" onClick={onToggle}>
          {expanded ? "Kompakt" : "Alle"}
        </Button>
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {!expanded ? (
          <>
            {shown.map((p: string) => <RSVPBadge key={p} name={p} status="yes" />)}
            {rest > 0 ? <Badge className="rounded-full" variant="secondary">+{rest} weitere</Badge> : null}
            {no.length > 0 ? <Badge className="rounded-full" variant="secondary">{no.length} abgesagt</Badge> : null}
            {pendingCount > 0 ? <Badge className="rounded-full" variant="secondary">{pendingCount} offen</Badge> : null}
          </>
        ) : (
          <>
            {yes.map((p: string) => <RSVPBadge key={`y_${p}`} name={p} status="yes" />)}
            {no.map((p: string) => <RSVPBadge key={`n_${p}`} name={p} status="no" />)}
            {pending.map((p: string) => <RSVPBadge key={`p_${p}`} name={p} status="pending" />)}
          </>
        )}
      </div>
    </div>
  );
}
