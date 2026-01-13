import { GUARDIANS } from "./constants";

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

export function getManagedPeople(currentUser: string) {
  if (!currentUser) return [];
  const kids = Object.keys(GUARDIANS).filter((kid) => (GUARDIANS[kid] || []).includes(currentUser));
  return uniqPreserveOrder([currentUser, ...kids]);
}

/**
 * Für Kosten: Wenn User Elternteil ist, zählen wir:
 * - currentUser
 * - co-parents (andere Guardians der Kids)
 * - kids
 */
export function getFamilyGroupForCosts(currentUser: string) {
  if (!currentUser) return { label: "dich", people: [] as string[] };

  const kids = Object.keys(GUARDIANS).filter((kid) => (GUARDIANS[kid] || []).includes(currentUser));
  const coParents = uniqPreserveOrder(
    kids.flatMap((kid) => (GUARDIANS[kid] || []).filter((p) => p !== currentUser))
  );

  const people = uniqPreserveOrder([currentUser, ...coParents, ...kids]);
  const isFamily = kids.length > 0 || coParents.length > 0;

  return { label: isFamily ? "deine Family" : "dich", people };
}