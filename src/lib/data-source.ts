import { PEOPLE, BOOKINGS } from "./data";
import type { Person, Booking, Photo } from "./data";
import type { MaryStay } from "@/db/queries";
import type { PaymentConfig } from "@/lib/payment";
import { todayIso, nightsBetween } from "@/lib/iso-date";

export function isDatabaseConfigured(): boolean {
  return !!process.env.DATABASE_URL?.trim();
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
  const today = todayIso();
  if (isDatabaseConfigured()) {
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

export async function fetchMaryData(
  payment: PaymentConfig | null,
): Promise<{ stays: MaryStay[]; today: string; connected: boolean }> {
  const today = todayIso();
  if (isDatabaseConfigured()) {
    const { getAllStaysForMary } = await import("@/db/queries");
    const stays = await getAllStaysForMary(payment);
    return { stays, today, connected: true };
  }

  const stays = BOOKINGS.map((booking) => {
    const person = PEOPLE.find((p) => p.id === booking.personId);
    const nights = nightsBetween(booking.start, booking.end);
    return {
      id: booking.id,
      personName: person?.first ?? "Unknown",
      start: booking.start,
      end: booking.end,
      nights,
      cost: payment ? nights * payment.costPerNight : null,
      currency: payment?.currency ?? "NZD",
      paymentSettled: booking.paymentSettled ?? false,
    };
  }).sort((a, b) => a.start.localeCompare(b.start));

  return { stays, today, connected: false };
}
