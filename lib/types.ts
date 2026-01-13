export type Person = string;
export type RsvpStatus = "yes" | "no" | "pending";

export type EventUI = {
  id: string;
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  description?: string;
  capacity?: number;
  priceEur?: number;
  rsvp: Record<Person, RsvpStatus>;
};

export type ProfilesUI = Record<
  Person,
  {
    arrival?: { date?: string; time?: string; flight?: string };
    departure?: { date?: string; time?: string; flight?: string };
  }
>;

export type MealsUI = Record<
  string,
  {
    breakfast: Record<Person, boolean>;
    lunch: Record<Person, boolean>;
    dinner: Record<Person, boolean>;
  }
>;

export type TripState = {
  participants: Person[];
  events: EventUI[];
  meals: MealsUI;
  profiles: ProfilesUI;
};
