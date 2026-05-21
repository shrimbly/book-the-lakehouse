import { and, asc, eq, gte, lte, inArray } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { getDb } from "./client";
import { bookings, people, photos } from "./schema";
import type { Person, Booking, Photo } from "@/lib/data";
import type { PaymentConfig } from "@/lib/payment";
import { nightsBetween } from "@/lib/iso-date";

// People list rarely changes (only when someone updates their name,
// color, or photo). Cache across requests and invalidate via the
// 'people' tag from the relevant server actions.
export const getPeople = unstable_cache(
  async (): Promise<Person[]> => {
    const db = getDb();
    const rows = await db.select().from(people).orderBy(people.createdAt);
    return rows.map((r) => ({
      id: r.id,
      first: r.firstName,
      initial: r.firstName.charAt(0).toUpperCase(),
      color: r.color,
      imageUrl: r.imageUrl,
    }));
  },
  ["people"],
  { tags: ["people"], revalidate: 600 },
);

export async function getBookingsForMonth(
  year: number,
  month: number, // 0-indexed
): Promise<Booking[]> {
  const db = getDb();
  // Month boundaries with the full next month included so cross-month
  // drag selection can detect conflicts before the route changes.
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 2, 0);
  const padStart = start;
  const padEnd = end;
  const toISO = (d: Date) => d.toISOString().slice(0, 10);

  const rows = await db
    .select()
    .from(bookings)
    .where(
      // booking range overlaps the padded window if
      // booking.start <= padEnd AND booking.end >= padStart
      and(
        lte(bookings.startDate, toISO(padEnd)),
        gte(bookings.endDate, toISO(padStart)),
      ),
    );

  return rows.map((r) => ({
    id: r.id,
    personId: r.personId,
    start: r.startDate,
    end: r.endDate,
    paymentSettled: r.paymentSettled,
  }));
}

export type MaryStay = {
  id: string;
  personName: string;
  start: string;
  end: string;
  nights: number;
  cost: number | null;
  currency: string;
  paymentSettled: boolean;
};

export async function getAllStaysForMary(
  payment: PaymentConfig | null,
): Promise<MaryStay[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: bookings.id,
      startDate: bookings.startDate,
      endDate: bookings.endDate,
      paymentSettled: bookings.paymentSettled,
      personName: people.firstName,
    })
    .from(bookings)
    .innerJoin(people, eq(bookings.personId, people.id))
    .orderBy(asc(bookings.startDate));

  return rows.map((row) => {
    const nights = nightsBetween(row.startDate, row.endDate);
    return {
      id: row.id,
      personName: row.personName,
      start: row.startDate,
      end: row.endDate,
      nights,
      cost: payment ? nights * payment.costPerNight : null,
      currency: payment?.currency ?? "NZD",
      paymentSettled: row.paymentSettled,
    };
  });
}

export async function getPhotosForBookings(
  bookingIds: string[],
): Promise<Photo[]> {
  if (bookingIds.length === 0) return [];
  const db = getDb();
  const rows = await db
    .select()
    .from(photos)
    .where(inArray(photos.bookingId, bookingIds))
    .orderBy(photos.createdAt);
  return rows.map((r) => ({
    id: r.id,
    bookingId: r.bookingId,
    uploaderId: r.uploaderId,
    date: r.photoDate,
    url: r.url,
    thumbnailUrl: r.thumbnailUrl,
    caption: r.caption,
    createdAt: r.createdAt.toISOString(),
  }));
}
