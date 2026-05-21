"use client";

import type { Booking, Person, Photo } from "@/lib/data";
import { PhotoSheet } from "../PhotoSheet";
import type { PhotoContext } from "./useStayPhotos";

export function CalendarPhotoSheet({
  context,
  bookings,
  people,
  photos,
  meId,
  pending,
  onClose,
  onUpload,
  onDelete,
}: {
  context: PhotoContext | null;
  bookings: Booking[];
  people: Person[];
  photos: Photo[];
  meId: string;
  pending: boolean;
  onClose: () => void;
  onUpload: (bookingId: string, date: string, file: File) => void;
  onDelete: (photoId: string) => void;
}) {
  if (!context) return null;

  const booking = bookings.find((candidate) => candidate.id === context.bookingId);
  if (!booking) return null;

  const owner = people.find((person) => person.id === booking.personId);
  if (!owner) return null;

  const dayPhotos = photos.filter(
    (photo) => photo.bookingId === booking.id && photo.date === context.date,
  );

  return (
    <PhotoSheet
      booking={booking}
      date={context.date}
      person={owner}
      photos={dayPhotos}
      canUpload={owner.id === meId}
      meId={meId}
      pending={pending}
      initialLightbox={context.mode === "view"}
      onClose={onClose}
      onUpload={(file) => onUpload(booking.id, context.date, file)}
      onDelete={onDelete}
    />
  );
}
