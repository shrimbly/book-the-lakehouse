export type Person = {
  id: string;
  first: string;
  initial: string;
  color: string;
  imageUrl: string | null;
};

export type Booking = {
  id: string;
  personId: string;
  start: string;
  end: string;
  paymentSettled?: boolean;
};

export type Photo = {
  id: string;
  bookingId: string;
  uploaderId: string;
  date: string;
  url: string;
  thumbnailUrl: string | null;
  caption: string | null;
  createdAt: string;
};

export const PEOPLE: Person[] = [
  { id: "james", first: "James", initial: "J", color: "#3a4e48", imageUrl: null },
  { id: "margaret", first: "Margaret", initial: "M", color: "#8b6f47", imageUrl: null },
  { id: "tom", first: "Tom", initial: "T", color: "#6b7a8b", imageUrl: null },
  { id: "sophie", first: "Sophie", initial: "S", color: "#7a8b7a", imageUrl: null },
  { id: "henry", first: "Henry", initial: "H", color: "#a8553c", imageUrl: null },
  { id: "eliza", first: "Eliza", initial: "E", color: "#8b6b7a", imageUrl: null },
];

export const ME = "james";

export const BOOKINGS: Booking[] = [
  { id: "seed-tom-1", personId: "tom", start: "2026-05-08", end: "2026-05-11" },
  { id: "seed-sophie-1", personId: "sophie", start: "2026-05-15", end: "2026-05-17" },
  { id: "seed-margaret-1", personId: "margaret", start: "2026-05-22", end: "2026-05-26" },
  { id: "seed-henry-1", personId: "henry", start: "2026-05-28", end: "2026-05-31" },
];

export const TODAY = "2026-05-17";
