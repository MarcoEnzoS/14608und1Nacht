import React from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TRIP_DAYS } from "@/lib/constants";
import { clamp } from "@/lib/format";
import { formatDayLabel } from "@/lib/format";

export function EventDialog({
  open,
  onOpenChange,
  editing,
  draft,
  setDraft,
  onSave,
}: any) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Event bearbeiten" : "Neues Event"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-1">
            <Label>Titel</Label>
            <Input value={draft.title} onChange={(e) => setDraft((d: any) => ({ ...d, title: e.target.value }))} className="rounded-xl" />
          </div>

          <div className="grid gap-1">
            <Label>Tag</Label>
            <Select value={draft.date} onValueChange={(v) => setDraft((d: any) => ({ ...d, date: v }))}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TRIP_DAYS.map((d) => (
                  <SelectItem key={d} value={d}>{formatDayLabel(d)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1">
              <Label>Start</Label>
              <Input value={draft.startTime} onChange={(e) => setDraft((d: any) => ({ ...d, startTime: e.target.value }))} placeholder="HH:MM" className="rounded-xl" />
            </div>
            <div className="grid gap-1">
              <Label>Ende</Label>
              <Input value={draft.endTime} onChange={(e) => setDraft((d: any) => ({ ...d, endTime: e.target.value }))} placeholder="HH:MM" className="rounded-xl" />
            </div>
          </div>

          <div className="grid gap-1">
            <Label>Preis (€)</Label>
            <Input
              value={typeof draft.priceEur === "number" ? String(draft.priceEur) : ""}
              onChange={(e) => {
                const raw = e.target.value.trim();
                if (!raw) return setDraft((d: any) => ({ ...d, priceEur: undefined }));
                const n = clamp(parseFloat(raw) || 0, 0, 100000);
                setDraft((d: any) => ({ ...d, priceEur: n }));
              }}
              inputMode="decimal"
              className="rounded-xl"
            />
          </div>

          <div className="grid gap-1">
            <Label>Ort</Label>
            <Input value={draft.location} onChange={(e) => setDraft((d: any) => ({ ...d, location: e.target.value }))} className="rounded-xl" />
          </div>

          <div className="grid gap-1">
            <Label>Kapazität (optional)</Label>
            <Input
              value={typeof draft.capacity === "number" ? String(draft.capacity) : ""}
              onChange={(e) => {
                const raw = e.target.value.trim();
                if (!raw) return setDraft((d: any) => ({ ...d, capacity: undefined }));
                const n = clamp(parseInt(raw, 10) || 0, 1, 200);
                setDraft((d: any) => ({ ...d, capacity: n }));
              }}
              inputMode="numeric"
              className="rounded-xl"
            />
          </div>

          <div className="grid gap-1">
            <Label>Beschreibung</Label>
            <Textarea value={draft.description} onChange={(e) => setDraft((d: any) => ({ ...d, description: e.target.value }))} className="rounded-xl" />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>Abbrechen</Button>
          <Button className="rounded-xl bg-gradient-to-r from-indigo-600 to-rose-600 text-white hover:opacity-95" onClick={onSave}>Speichern</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
