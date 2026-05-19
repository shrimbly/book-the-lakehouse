import { and, gte, lte, inArray } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "./client";
import { bookings, people, photos } from "./schema";
import type { Person, Booking, Photo } from "@/lib/data";

// People list rarely changes (only when someone updates their name,
// color, or photo). Cache across requests and invalidate via the
// 'people' tag from the relevant server actions.
export const getPeople = unstable_cache(
  async (): Promise<Person[]> => {
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
  // Month boundaries (with one week of overflow so multi-week stays
  // straddling the visible month are caught)
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  const padStart = new Date(start);
  padStart.setDate(padStart.getDate() - 7);
  const padEnd = new Date(end);
  padEnd.setDate(padEnd.getDate() + 7);
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
  }));
}

export async function getPhotosForBookings(
  bookingIds: string[],
): Promise<Photo[]> {
  if (bookingIds.length === 0) return [];
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
