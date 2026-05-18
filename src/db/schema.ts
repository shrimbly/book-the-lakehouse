import { pgTable, varchar, text, date, timestamp, index } from "drizzle-orm/pg-core";

export const people = pgTable("people", {
  id: varchar("id", { length: 64 }).primaryKey(),
  firstName: text("first_name").notNull(),
  color: varchar("color", { length: 16 }).notNull(),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const bookings = pgTable(
  "bookings",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    personId: varchar("person_id", { length: 64 })
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("bookings_start_idx").on(t.startDate),
    index("bookings_person_idx").on(t.personId),
  ],
);

export const photos = pgTable(
  "photos",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    bookingId: varchar("booking_id", { length: 64 })
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    uploaderId: varchar("uploader_id", { length: 64 })
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    caption: text("caption"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("photos_booking_idx").on(t.bookingId),
    index("photos_uploader_idx").on(t.uploaderId),
  ],
);

export type PersonRow = typeof people.$inferSelect;
export type BookingRow = typeof bookings.$inferSelect;
export type PhotoRow = typeof photos.$inferSelect;
