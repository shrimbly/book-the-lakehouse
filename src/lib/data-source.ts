import { PEOPLE, BOOKINGS } from "./data";
import type { Person, Booking, Photo } from "./data";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function fetchCalendarData(
  year: number,
  month: number,
): Promise<{
  people: Person[];
  bookings: Booking[];
  photos: Photo[];
  today: string;
  connected: boolean;
}> {
  const today = todayISO();
  if (process.env.DATABASE_URL) {
    const { getPeople, getBookingsForMonth, getPhotosForBookings } =
      await import("@/db/queries");
    const [people, bookings] = await Promise.all([
      getPeople(),
      getBookingsForMonth(year, month),
    ]);
    const photos = await getPhotosForBookings(bookings.map((b) => b.id));
    return { people, bookings, photos, today, connected: true };
  }
  return { people: PEOPLE, bookings: BOOKINGS, photos: [], today, connected: false };
}
