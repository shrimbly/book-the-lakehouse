"use server";

import { and, eq, ne, lte, gte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { db } from "@/db/client";
import { bookings, people } from "@/db/schema";
import { IDENTITY_COOKIE, getCurrentIdentityId } from "@/lib/identity";
import { GATE_COOKIE } from "@/lib/gate";
import { isPaletteColor } from "@/lib/palette";
import { put, del } from "@vercel/blob";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function createBooking(input: {
  personId: string;
  start: string;
  end: string;
}): Promise<{ id: string } | { error: string }> {
  if (!ISO_DATE.test(input.start) || !ISO_DATE.test(input.end)) {
    return { error: "Invalid date format" };
  }
  if (input.start > input.end) {
    return { error: "Start date is after end date" };
  }

  // Server-side conflict check: any booking whose range overlaps [start, end]
  // overlap if existing.start <= input.end AND existing.end >= input.start
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

  if (conflicts.length > 0) {
    return { error: "Those dates overlap an existing stay" };
  }

  const id = crypto.randomUUID();
  await db.insert(bookings).values({
    id,
    personId: input.personId,
    startDate: input.start,
    endDate: input.end,
  });

  revalidatePath("/");
  return { id };
}

export async function deleteBooking(id: string): Promise<{ ok: true } | { error: string }> {
  const me = await getCurrentIdentityId();
  if (!me) return { error: "Not signed in" };
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
  if (!ISO_DATE.test(input.start) || !ISO_DATE.test(input.end)) {
    return { error: "Invalid date format" };
  }
  if (input.start > input.end) {
    return { error: "Start date is after end date" };
  }
  const me = await getCurrentIdentityId();
  if (!me) return { error: "Not signed in" };

  const rows = await db
    .select({ personId: bookings.personId })
    .from(bookings)
    .where(eq(bookings.id, input.id))
    .limit(1);
  if (rows.length === 0) return { error: "Booking not found" };
  if (rows[0].personId !== me) return { error: "Not your booking" };

  // Conflict check: any OTHER booking whose range overlaps
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
  if (conflicts.length > 0) {
    return { error: "Those dates overlap an existing stay" };
  }

  await db
    .update(bookings)
    .set({ startDate: input.start, endDate: input.end })
    .where(eq(bookings.id, input.id));

  revalidatePath("/");
  return { ok: true };
}

export async function setIdentity(
  personId: string,
): Promise<{ ok: true } | { error: string }> {
  const rows = await db
    .select({ id: people.id })
    .from(people)
    .where(eq(people.id, personId))
    .limit(1);
  if (rows.length === 0) {
    return { error: "Unknown person" };
  }
  const c = await cookies();
  c.set(IDENTITY_COOKIE, personId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  revalidatePath("/");
  return { ok: true };
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

  await db.update(people).set(updates).where(eq(people.id, id));
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

  // Best-effort: delete the previous image if any
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
      // ignore — leftover blob is harmless
    }
  }

  revalidatePath("/");
  return { url: blob.url };
}

export async function removeProfileImage(): Promise<{ ok: true } | { error: string }> {
  const id = await getCurrentIdentityId();
  if (!id) return { error: "Not signed in" };

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

  revalidatePath("/");
  return { ok: true };
}
