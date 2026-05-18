"use server";

import { and, eq, lte, gte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { db } from "@/db/client";
import { bookings, people } from "@/db/schema";
import { IDENTITY_COOKIE } from "@/lib/identity";
import { GATE_COOKIE } from "@/lib/gate";

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
  await db.delete(bookings).where(eq(bookings.id, id));
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
