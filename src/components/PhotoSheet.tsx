"use client";

import { useEffect, useRef, useState } from "react";
import type { Booking, Person, Photo } from "@/lib/data";

function fmtDay(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-NZ", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function PhotoSheet({
  booking,
  person,
  photos,
  canUpload,
  meId,
  pending,
  onClose,
  onUpload,
  onDelete,
}: {
  booking: Booking;
  person: Person;
  photos: Photo[];
  canUpload: boolean;
  meId: string;
  pending?: boolean;
  onClose: () => void;
  onUpload: (file: File) => void;
  onDelete: (photoId: string) => void;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (openIndex !== null) setOpenIndex(null);
      else onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openIndex, onClose]);

  const sameDay = booking.start === booking.end;
  const range = sameDay
    ? fmtDay(booking.start)
    : `${fmtDay(booking.start)}, to ${fmtDay(booking.end)}`;

  function pickFiles() {
    fileRef.current?.click();
  }

  function handleFiles(files: FileList | null) {
    if (!files) return;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file && file.type.startsWith("image/")) {
        onUpload(file);
      }
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <>
      <div
        aria-hidden
        onPointerDown={onClose}
        className="fixed inset-0 z-40 bg-ink/45 animate-backdrop-fade"
      />
      <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center px-3 sm:px-6 py-6 sm:py-10">
        <div className="pointer-events-auto flex max-h-full w-full flex-col overflow-hidden rounded-[14px] border border-rule bg-paper shadow-[0_24px_60px_-20px_rgba(60,40,20,0.25),0_4px_10px_-4px_rgba(60,40,20,0.08)] max-w-[calc(100vw-1.5rem)] sm:max-w-[640px] animate-toast-pop">
          <div className="flex items-center gap-3 border-b border-soft px-4 py-3 sm:px-5 sm:py-4">
            <PersonChip person={person} />
            <div className="flex flex-col leading-tight min-w-0 flex-1">
              <span className="text-[13px] sm:text-[14px] font-medium truncate">
                {range}
              </span>
              <span className="text-[11px] text-muted">
                {photos.length === 0
                  ? "No photos yet"
                  : `${photos.length} photo${photos.length === 1 ? "" : "s"} · ${person.first}`}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="close"
              className="grid h-8 w-8 place-items-center rounded-full text-faint transition-colors hover:text-ink"
            >
              ×
            </button>
          </div>

          <div className="overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
            {photos.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <div className="grid h-12 w-12 place-items-center rounded-full border border-dashed border-rule text-[20px] text-faint">
                  +
                </div>
                <p className="text-[13px] text-muted">
                  {canUpload
                    ? "Share photos from this stay."
                    : "Nothing here yet."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                {photos.map((p, idx) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setOpenIndex(idx)}
                    className="relative aspect-square overflow-hidden rounded-[8px] bg-soft transition-opacity hover:opacity-90"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {canUpload ? (
            <div className="border-t border-soft px-4 py-3 sm:px-5 sm:py-4 flex items-center justify-end gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                onChange={(e) => handleFiles(e.target.files)}
                className="hidden"
              />
              <button
                type="button"
                onClick={pickFiles}
                disabled={pending}
                className="rounded-full bg-ink px-4 py-2 text-[12px] sm:text-[13px] font-medium text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-25"
              >
                {pending ? "Uploading…" : "Add photos"}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {openIndex !== null && photos[openIndex] ? (
        <Lightbox
          photo={photos[openIndex]}
          canDelete={photos[openIndex].uploaderId === meId}
          pending={pending}
          onPrev={
            openIndex > 0 ? () => setOpenIndex(openIndex - 1) : undefined
          }
          onNext={
            openIndex < photos.length - 1
              ? () => setOpenIndex(openIndex + 1)
              : undefined
          }
          onClose={() => setOpenIndex(null)}
          onDelete={() => {
            onDelete(photos[openIndex].id);
            setOpenIndex(null);
          }}
        />
      ) : null}
    </>
  );
}

function Lightbox({
  photo,
  canDelete,
  pending,
  onPrev,
  onNext,
  onClose,
  onDelete,
}: {
  photo: Photo;
  canDelete: boolean;
  pending?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  onClose: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-ink/95 animate-backdrop-fade">
      <div className="flex items-center justify-end gap-2 px-3 py-3 sm:px-5">
        {canDelete ? (
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            className="rounded-full border border-paper/30 px-3 py-1.5 text-[11px] sm:text-[12px] font-medium text-paper/85 transition-colors hover:border-paper hover:text-paper disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pending ? "Removing…" : "Delete"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onClose}
          aria-label="close"
          className="grid h-9 w-9 place-items-center rounded-full text-paper/70 transition-colors hover:text-paper"
        >
          ×
        </button>
      </div>
      <div className="flex flex-1 items-center justify-center px-4 pb-6 sm:px-8 sm:pb-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.url}
          alt=""
          className="max-h-full max-w-full object-contain"
        />
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center justify-between px-2 sm:px-4">
        {onPrev ? (
          <button
            type="button"
            onClick={onPrev}
            aria-label="previous"
            className="pointer-events-auto grid h-10 w-10 place-items-center rounded-full bg-paper/10 text-paper transition-colors hover:bg-paper/20"
          >
            ‹
          </button>
        ) : (
          <span />
        )}
        {onNext ? (
          <button
            type="button"
            onClick={onNext}
            aria-label="next"
            className="pointer-events-auto grid h-10 w-10 place-items-center rounded-full bg-paper/10 text-paper transition-colors hover:bg-paper/20"
          >
            ›
          </button>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}

function PersonChip({ person }: { person: Person }) {
  if (person.imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={person.imageUrl}
        alt=""
        className="h-[32px] w-[32px] sm:h-[36px] sm:w-[36px] shrink-0 rounded-[6px] object-cover"
      />
    );
  }
  return (
    <div
      className="grid h-[32px] w-[32px] sm:h-[36px] sm:w-[36px] shrink-0 place-items-center rounded-[6px] text-[12px] font-semibold text-paper"
      style={{ backgroundColor: person.color }}
    >
      {person.initial}
    </div>
  );
}
