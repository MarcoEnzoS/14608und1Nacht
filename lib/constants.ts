export const TRIP_DAYS = [
  "2026-09-01",
  "2026-09-02",
  "2026-09-03",
  "2026-09-04",
  "2026-09-05",
  "2026-09-06",
] as const;

export const DEFAULT_PARTICIPANTS = [
  "Marco","Lx","Benno","Carina","Chris","Claudia","Gianna","Giulia","Bassi","Henry","Bini","Mama","Papa","Maxi","Ricarda","Roberta",
  "Emil","Karli","Flynn","Georg","Valentin","Carlotta",
] as const;

export const GUARDIANS: Record<string, string[]> = {
  Emil: ["Benno", "Lx"],
  Karli: ["Benno", "Lx"],
  Flynn: ["Chris", "Carina"],
  Georg: ["Claudia", "Maxi"],
  Valentin: ["Claudia", "Maxi"],
  Carlotta: ["Claudia", "Maxi"],
};

export const STORAGE_CURRENT_USER_KEY = "bday40_planner_current_user_v1";
export const DEFAULT_ADMIN_PIN = "4040";
