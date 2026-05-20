CREATE EXTENSION IF NOT EXISTS btree_gist;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_valid_date_range'
  ) THEN
    ALTER TABLE "bookings"
      ADD CONSTRAINT "bookings_valid_date_range"
      CHECK ("start_date" <= "end_date");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_no_overlap'
  ) THEN
    ALTER TABLE "bookings"
      ADD CONSTRAINT "bookings_no_overlap"
      EXCLUDE USING gist (
        daterange("start_date", "end_date" + 1, '[)') WITH &&
      );
  END IF;
END $$;
