"use server";

import { and, eq, ne, lte, gte } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import { cookies } from "next/headers";
import { put, del } from "@vercel/blob";
import { getDb, hasDatabaseUrl } from "@/db/client";
import { bookings, people, photos } from "@/db/schema";
import { PEOPLE } from "@/lib/data";
import { IDENTITY_COOKIE, getCurrentIdentityId } from "@/lib/identity";
import { GATE_COOKIE, isGatePassed } from "@/lib/gate";
import { validateIsoRange, isIsoDate } from "@/lib/iso-date";
import { isMaryId } from "@/lib/mary";
import { isPaletteColor } from "@/lib/palette";
import {
  choosePersonColor,
  generatePersonId,
  validatePersonName,
} from "@/lib/person";

const DB_NOT_CONFIGURED =
  "Database isn't configured yet. Add DATABASE_URL to save changes.";
const BOOKING_CONFLICT = "Those dates overlap an existing stay";

function isDbConstraintError(error: unknown, names: string[]): boolean {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String(error.code) : "";
  const constraint = "constraint" in error ? String(error.constraint) : "";
  const message = error instanceof Error ? error.message : String(error);
  return (
    code === "23P01" ||
    code === "23514" ||
    code === "23505" ||
    names.some((name) => constraint === name || message.includes(name))
  );
}

async function setIdentityCookie(personId: string) {
  const c = await cookies();
  c.set(IDENTITY_COOKIE, personId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
}

export async function createBooking(input: {
  start: string;
  end: string;
}): Promise<{ id: string } | { error: string }> {
  const range = validateIsoRange(input.start, input.end);
  if ("error" in range) return range;
  if (!hasDatabaseUrl()) return { error: DB_NOT_CONFIGURED };

  const me = await getCurrentIdentityId();
  if (!me) return { error: "Not signed in" };

  const db = getDb();
  const personRows = await db
    .select({ id: people.id })
    .from(people)
    .where(eq(people.id, me))
    .limit(1);
  if (personRows.length === 0) return { error: "Unknown person" };

  const conflicts = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(
      and(
        lte(bookings.startDate, input.end),
        gte(bookings.endDate, input.start),
      ),
    )
    .limit(1);

  if (conflicts.length > 0) return { error: BOOKING_CONFLICT };

  const id = crypto.randomUUID();
  try {
    await db.insert(bookings).values({
      id,
      personId: me,
      startDate: input.start,
      endDate: input.end,
    });
  } catch (error) {
    if (
      isDbConstraintError(error, [
        "bookings_no_overlap",
        "bookings_valid_date_range",
      ])
    ) {
      return { error: BOOKING_CONFLICT };
    }
    throw error;
  }

  revalidatePath("/");
  return { id };
}

export async function deleteBooking(
  id: string,
): Promise<{ ok: true } | { error: string }> {
  if (!hasDatabaseUrl()) return { error: DB_NOT_CONFIGURED };
  const me = await getCurrentIdentityId();
  if (!me) return { error: "Not signed in" };
  const db = getDb();

  const rows = await db
    .select({ personId: bookings.personId })
    .from(bookings)
    .where(eq(bookings.id, id))
    .limit(1);
  if (rows.length === 0) return { error: "Booking not found" };
  if (rows[0].personId !== me) return { error: "Not your booking" };
  await db.delete(bookings).where(eq(bookings.id, id));
  revalidatePath("/");
  return { ok: true };
}

export async function updateBooking(input: {
  id: string;
  start: string;
  end: string;
}): Promise<{ ok: true } | { error: string }> {
  const range = validateIsoRange(input.start, input.end);
  if ("error" in range) return range;
  if (!hasDatabaseUrl()) return { error: DB_NOT_CONFIGURED };
  const me = await getCurrentIdentityId();
  if (!me) return { error: "Not signed in" };
  const db = getDb();

  const rows = await db
    .select({ personId: bookings.personId })
    .from(bookings)
    .where(eq(bookings.id, input.id))
    .limit(1);
  if (rows.length === 0) return { error: "Booking not found" };
  if (rows[0].personId !== me) return { error: "Not your booking" };

  const conflicts = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(
      and(
        ne(bookings.id, input.id),
        lte(bookings.startDate, input.end),
        gte(bookings.endDate, input.start),
      ),
    )
    .limit(1);
  if (conflicts.length > 0) return { error: BOOKING_CONFLICT };

  try {
    await db
      .update(bookings)
      .set({ startDate: input.start, endDate: input.end })
      .where(eq(bookings.id, input.id));
  } catch (error) {
    if (
      isDbConstraintError(error, [
        "bookings_no_overlap",
        "bookings_valid_date_range",
      ])
    ) {
      return { error: BOOKING_CONFLICT };
    }
    throw error;
  }

  revalidatePath("/");
  return { ok: true };
}

export async function setBookingPaymentSettled(input: {
  id: string;
  settled: boolean;
}): Promise<{ ok: true } | { error: string }> {
  if (!hasDatabaseUrl()) return { error: DB_NOT_CONFIGURED };
  const me = await getCurrentIdentityId();
  if (!isMaryId(me)) return { error: "Mary mode only" };
  const db = getDb();

  await db
    .update(bookings)
    .set({ paymentSettled: input.settled })
    .where(eq(bookings.id, input.id));

  revalidatePath("/mary");
  return { ok: true };
}

export async function setIdentity(
  personId: string,
): Promise<{ ok: true } | { error: string }> {
  if (hasDatabaseUrl()) {
    const db = getDb();
    const rows = await db
      .select({ id: people.id })
      .from(people)
      .where(eq(people.id, personId))
      .limit(1);
    if (rows.length === 0) return { error: "Unknown person" };
  } else if (!PEOPLE.some((person) => person.id === personId)) {
    return { error: "Unknown person" };
  }

  await setIdentityCookie(personId);
  revalidatePath("/");
  return { ok: true };
}

export async function createPerson(input: {
  first: string;
  color?: string;
}): Promise<{ id: string } | { error: string }> {
  if (!(await isGatePassed())) return { error: "Pin required" };
  if (!hasDatabaseUrl()) return { error: DB_NOT_CONFIGURED };

  const name = validatePersonName(input.first);
  if ("error" in name) return name;

  const db = getDb();
  const existing = await db
    .select({ id: people.id, color: people.color })
    .from(people);
  const color = choosePersonColor(
    input.color,
    existing.map((person) => person.color),
  );
  if (typeof color !== "string") return color;

  let knownIds = existing.map((person) => person.id);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const id = generatePersonId(name.first, knownIds);
    try {
      await db.insert(people).values({
        id,
        firstName: name.first,
        color,
      });
      await setIdentityCookie(id);
      updateTag("people");
      revalidatePath("/");
      return { id };
    } catch (error) {
      if (!isDbConstraintError(error, ["people_pkey"])) throw error;
      knownIds = [...knownIds, id];
    }
  }

  return { error: "Couldn't create that person. Please try again." };
}

export async function clearIdentity(): Promise<{ ok: true }> {
  const c = await cookies();
  c.delete(IDENTITY_COOKIE);
  revalidatePath("/");
  return { ok: true };
}

export async function unlockPin(
  pin: string,
): Promise<{ ok: true } | { error: string }> {
  const expected = process.env.FAMILY_PIN;
  if (!expected) {
    return { error: "Pin not configured" };
  }
  if (!/^\d{4}$/.test(pin)) {
    return { error: "Pin must be four digits" };
  }
  if (pin !== expected) {
    return { error: "Incorrect pin" };
  }
  const c = await cookies();
  c.set(GATE_COOKIE, "ok", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 90,
    path: "/",
  });
  revalidatePath("/");
  return { ok: true };
}

export async function lockGate(): Promise<{ ok: true }> {
  const c = await cookies();
  c.delete(GATE_COOKIE);
  c.delete(IDENTITY_COOKIE);
  revalidatePath("/");
  return { ok: true };
}

export async function updateMyProfile(input: {
  first?: string;
  color?: string;
}): Promise<{ ok: true } | { error: string }> {
  if (!hasDatabaseUrl()) return { error: DB_NOT_CONFIGURED };
  const id = await getCurrentIdentityId();
  if (!id) return { error: "Not signed in" };

  const updates: { firstName?: string; color?: string } = {};

  if (input.first !== undefined) {
    const trimmed = input.first.trim();
    if (!trimmed) return { error: "Name can't be empty" };
    if (trimmed.length > 64) return { error: "Name too long" };
    updates.firstName = trimmed;
  }

  if (input.color !== undefined) {
    if (!isPaletteColor(input.color)) {
      return { error: "That color isn't in the palette" };
    }
    updates.color = input.color;
  }

  if (Object.keys(updates).length === 0) return { ok: true };

  const db = getDb();
  await db.update(people).set(updates).where(eq(people.id, id));
  updateTag("people");
  revalidatePath("/");
  return { ok: true };
}

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

export async function uploadProfileImage(
  formData: FormData,
): Promise<{ url: string } | { error: string }> {
  if (!hasDatabaseUrl()) return { error: DB_NOT_CONFIGURED };
  const id = await getCurrentIdentityId();
  if (!id) return { error: "Not signed in" };
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return { error: "Image upload isn't configured yet" };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "No file received" };
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return { error: "Image must be jpeg, png, webp, or gif" };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { error: "Image must be under 5 MB" };
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const safeExt = /^[a-z0-9]{1,8}$/.test(ext) ? ext : "jpg";
  const blob = await put(`people/${id}/${Date.now()}.${safeExt}`, file, {
    access: "public",
    addRandomSuffix: true,
    contentType: file.type,
  });

  const db = getDb();
  const existing = await db
    .select({ url: people.imageUrl })
    .from(people)
    .where(eq(people.id, id))
    .limit(1);
  const oldUrl = existing[0]?.url;

  await db
    .update(people)
    .set({ imageUrl: blob.url })
    .where(eq(people.id, id));

  if (oldUrl) {
    try {
      await del(oldUrl);
    } catch {
      // ignore - leftover blob is harmless
    }
  }

  updateTag("people");
  revalidatePath("/");
  return { url: blob.url };
}

export async function uploadStayPhoto(
  bookingId: string,
  date: string,
  formData: FormData,
): Promise<{ id: string; url: string; thumbnailUrl: string } | { error: string }> {
  if (!hasDatabaseUrl()) return { error: DB_NOT_CONFIGURED };
  const me = await getCurrentIdentityId();
  if (!me) return { error: "Not signed in" };
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return { error: "Photo upload isn't configured" };
  }
  if (!isIsoDate(date)) {
    return { error: "Invalid date" };
  }

  const db = getDb();
  const ownerRows = await db
    .select({
      personId: bookings.personId,
      startDate: bookings.startDate,
      endDate: bookings.endDate,
    })
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);
  if (ownerRows.length === 0) return { error: "Booking not found" };
  if (ownerRows[0].personId !== me) return { error: "Not your booking" };
  if (date < ownerRows[0].startDate || date > ownerRows[0].endDate) {
    return { error: "Date is outside this stay" };
  }

  const file = formData.get("file");
  const thumb = formData.get("thumbnail");
  if (!(file instanceof File)) return { error: "No file received" };
  if (!(thumb instanceof File)) return { error: "No thumbnail received" };
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return { error: "Image must be jpeg, png, webp, or gif" };
  }
  if (!ALLOWED_IMAGE_TYPES.has(thumb.type)) {
    return { error: "Thumbnail must be jpeg, png, webp, or gif" };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { error: "Image must be under 5 MB" };
  }
  if (thumb.size > MAX_IMAGE_BYTES) {
    return { error: "Thumbnail too large" };
  }

  const stamp = Date.now();
  const [blob, thumbBlob] = await Promise.all([
    put(`stays/${bookingId}/${date}/${stamp}.jpg`, file, {
      access: "public",
      addRandomSuffix: true,
      contentType: file.type,
    }),
    put(`stays/${bookingId}/${date}/${stamp}-thumb.jpg`, thumb, {
      access: "public",
      addRandomSuffix: true,
      contentType: thumb.type,
    }),
  ]);

  const id = crypto.randomUUID();
  await db.insert(photos).values({
    id,
    bookingId,
    uploaderId: me,
    photoDate: date,
    url: blob.url,
    thumbnailUrl: thumbBlob.url,
  });

  revalidatePath("/");
  return { id, url: blob.url, thumbnailUrl: thumbBlob.url };
}

export async function deleteStayPhoto(
  photoId: string,
): Promise<{ ok: true } | { error: string }> {
  if (!hasDatabaseUrl()) return { error: DB_NOT_CONFIGURED };
  const me = await getCurrentIdentityId();
  if (!me) return { error: "Not signed in" };

  const db = getDb();
  const rows = await db
    .select({
      uploaderId: photos.uploaderId,
      url: photos.url,
      thumbnailUrl: photos.thumbnailUrl,
    })
    .from(photos)
    .where(eq(photos.id, photoId))
    .limit(1);
  if (rows.length === 0) return { error: "Photo not found" };
  if (rows[0].uploaderId !== me) return { error: "Not your photo" };

  await db.delete(photos).where(eq(photos.id, photoId));

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const urls = [rows[0].url, rows[0].thumbnailUrl].filter(
      (u): u is string => !!u,
    );
    try {
      await del(urls);
    } catch {
      // ignore
    }
  }

  revalidatePath("/");
  return { ok: true };
}

export async function removeProfileImage(): Promise<
  { ok: true } | { error: string }
> {
  if (!hasDatabaseUrl()) return { error: DB_NOT_CONFIGURED };
  const id = await getCurrentIdentityId();
  if (!id) return { error: "Not signed in" };

  const db = getDb();
  const existing = await db
    .select({ url: people.imageUrl })
    .from(people)
    .where(eq(people.id, id))
    .limit(1);
  const oldUrl = existing[0]?.url;

  await db
    .update(people)
    .set({ imageUrl: null })
    .where(eq(people.id, id));

  if (oldUrl && process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      await del(oldUrl);
    } catch {
      // ignore
    }
  }

  updateTag("people");
  revalidatePath("/");
  return { ok: true };
}
