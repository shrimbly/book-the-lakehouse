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
  date,
  person,
  photos,
  canUpload,
  meId,
  pending,
  initialLightbox = false,
  onClose,
  onUpload,
  onDelete,
}: {
  booking: Booking;
  date: string;
  person: Person;
  photos: Photo[];
  canUpload: boolean;
  meId: string;
  pending?: boolean;
  initialLightbox?: boolean;
  onClose: () => void;
  onUpload: (file: File) => void;
  onDelete: (photoId: string) => void;
}) {
  // Skip the gallery entirely and open straight into the lightbox when:
  // - non-owner (no upload UI to show), OR
  // - the caller explicitly asked for view mode.
  const skipGallery =
    (!canUpload || initialLightbox) && photos.length > 0;
  const [openIndex, setOpenIndex] = useState<number | null>(
    skipGallery ? 0 : null,
  );
  const fileRef = useRef<HTMLInputElement | null>(null);

  function closeLightbox() {
    setOpenIndex(null);
    if (skipGallery) onClose();
  }

  useEffect(() => {
    if (openIndex !== null) return; // Lightbox owns its own key handling
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openIndex, onClose]);

  const dayLabel = fmtDay(date);
  const sameDay = booking.start === booking.end;
  const stayRange = sameDay
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

  const sheetHidden = openIndex !== null;

  return (
    <>
      {!sheetHidden ? (
        <div
          aria-hidden
          onPointerDown={onClose}
          className="fixed inset-0 z-40 bg-ink/45 animate-backdrop-fade"
        />
      ) : null}
      <div
        className={[
          "pointer-events-none fixed inset-0 z-50 flex items-center justify-center px-3 sm:px-6 py-6 sm:py-10",
          sheetHidden ? "invisible" : "",
        ].join(" ")}
      >
        <div className="pointer-events-auto flex max-h-full w-full flex-col overflow-hidden rounded-[14px] border border-rule bg-paper shadow-[0_24px_60px_-20px_rgba(60,40,20,0.25),0_4px_10px_-4px_rgba(60,40,20,0.08)] max-w-[calc(100vw-1.5rem)] sm:max-w-[640px] animate-toast-pop">
          <div className="flex items-center gap-3 border-b border-soft px-4 py-3 sm:px-5 sm:py-4">
            <PersonChip person={person} />
            <div className="flex flex-col leading-tight min-w-0 flex-1">
              <span className="text-[13px] sm:text-[14px] font-medium truncate">
                {dayLabel}
              </span>
              <span className="text-[11px] text-muted truncate">
                {person.first}&rsquo;s stay · {stayRange}
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
              canUpload ? (
                <button
                  type="button"
                  onClick={pickFiles}
                  disabled={pending}
                  className="flex w-full flex-col items-center gap-3 rounded-[10px] border border-dashed border-rule px-4 py-12 text-center transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="grid h-12 w-12 place-items-center rounded-full border border-dashed border-rule text-[20px] text-faint">
                    +
                  </span>
                  <span className="text-[13px] text-muted">
                    {pending ? "Uploading…" : "Share photos from this stay."}
                  </span>
                </button>
              ) : (
                <div className="flex flex-col items-center gap-3 py-12 text-center">
                  <div className="grid h-12 w-12 place-items-center rounded-full border border-dashed border-rule text-[20px] text-faint">
                    +
                  </div>
                  <p className="text-[13px] text-muted">Nothing here yet.</p>
                </div>
              )
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                {photos.map((p, idx) => {
                  const isMine = p.uploaderId === meId;
                  return (
                    <div
                      key={p.id}
                      className="relative aspect-square overflow-hidden rounded-[8px] bg-soft"
                    >
                      <button
                        type="button"
                        onClick={() => setOpenIndex(idx)}
                        style={{ WebkitTapHighlightColor: "transparent" }}
                        className="block h-full w-full transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/30 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={p.thumbnailUrl ?? p.url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </button>
                      {isMine ? (
                        <button
                          type="button"
                          onClick={() => onDelete(p.id)}
                          aria-label="Delete photo"
                          disabled={pending}
                          className="absolute top-1.5 right-1.5 grid h-6 w-6 place-items-center rounded-full border border-rule bg-paper/85 backdrop-blur-sm text-[14px] leading-none text-ink shadow-[0_2px_6px_-2px_rgba(60,40,20,0.18)] transition-colors hover:bg-ink hover:text-paper disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <span aria-hidden className="block -translate-y-px">
                            ×
                          </span>
                        </button>
                      ) : null}
                    </div>
                  );
                })}
                {canUpload ? (
                  <button
                    type="button"
                    onClick={pickFiles}
                    disabled={pending}
                    aria-label="Add a photo"
                    className="grid aspect-square place-items-center rounded-[8px] border border-dashed border-rule text-[26px] leading-none text-faint transition-colors hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    +
                  </button>
                ) : null}
              </div>
            )}
          </div>

          {canUpload ? (
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              onChange={(e) => handleFiles(e.target.files)}
              className="hidden"
            />
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
          onClose={closeLightbox}
          onDelete={() => {
            onDelete(photos[openIndex].id);
            closeLightbox();
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
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // Two-step mount so the browser paints the closed state first, then
  // the transition runs from closed → open.
  useEffect(() => {
    const id = window.setTimeout(() => setIsOpen(true), 0);
    return () => window.clearTimeout(id);
  }, []);

  function handleClose() {
    if (isClosing) return;
    setIsClosing(true);
    setIsOpen(false);
    // Start the calendar's unscale animation at the same time so the
    // close feels coordinated.
    const main = document.querySelector("main") as HTMLElement | null;
    if (main) main.style.transform = "scale3d(1, 1, 1)";
    window.setTimeout(onClose, 260);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
      else if (e.key === "ArrowLeft" && onPrev) onPrev();
      else if (e.key === "ArrowRight" && onNext) onNext();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onPrev, onNext, isClosing]);

  useEffect(() => {
    const main = document.querySelector("main");
    if (!main) return;
    const el = main as HTMLElement;
    el.style.willChange = "transform";
    el.style.backfaceVisibility = "hidden";
    el.style.transformOrigin = "center center";
    el.style.transition =
      "transform 420ms cubic-bezier(0.16, 0.84, 0.44, 1)";
    const raf = requestAnimationFrame(() => {
      el.style.transform = "scale3d(0.97, 0.97, 1)";
    });
    return () => {
      cancelAnimationFrame(raf);
      el.style.transform = "scale3d(1, 1, 1)";
    };
  }, []);

  const blurValue = isOpen ? "blur(4px)" : "blur(0px)";

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col"
      style={{
        background:
          "radial-gradient(ellipse at center, rgba(250, 248, 244, 0.32) 0%, rgba(250, 248, 244, 0.58) 100%)",
        opacity: isOpen ? 1 : 0,
        backdropFilter: blurValue,
        WebkitBackdropFilter: blurValue,
        transition:
          "opacity 260ms cubic-bezier(0.16, 0.84, 0.44, 1), backdrop-filter 260ms cubic-bezier(0.16, 0.84, 0.44, 1), -webkit-backdrop-filter 260ms cubic-bezier(0.16, 0.84, 0.44, 1)",
      }}
    >
      <div
        className="flex items-center justify-end gap-3 px-4 pt-4 pb-2 sm:px-6 sm:pt-5 sm:pb-3 animate-blur-fade"
        style={{ animationDelay: "60ms" }}
        onPointerDown={(e) => {
          if (e.target === e.currentTarget) handleClose();
        }}
      >
        {canDelete ? (
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            className="rounded-full px-2.5 py-1.5 text-[11px] sm:text-[12px] text-muted transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pending ? "Removing…" : "Delete"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={handleClose}
          aria-label="close"
          className="grid h-9 w-9 sm:h-10 sm:w-10 place-items-center rounded-full border border-rule bg-paper/90 text-[18px] sm:text-[20px] leading-none text-ink shadow-[0_2px_8px_-2px_rgba(60,40,20,0.15)] transition-colors hover:bg-ink hover:text-paper"
        >
          ×
        </button>
      </div>
      <div
        className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-6 sm:px-12 sm:pb-10 animate-blur-fade"
        style={{ animationDelay: "120ms" }}
        onPointerDown={(e) => {
          if (e.target === e.currentTarget) handleClose();
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.url}
          alt=""
          className="max-h-full max-w-full object-contain rounded-[10px] shadow-[0_40px_90px_-25px_rgba(60,40,20,0.45),0_8px_22px_-6px_rgba(60,40,20,0.22)]"
        />
        {onPrev ? (
          <button
            type="button"
            onClick={onPrev}
            aria-label="previous"
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 grid h-9 w-9 sm:h-10 sm:w-10 place-items-center rounded-full text-[16px] sm:text-[18px] leading-none text-muted bg-paper/70 border border-rule backdrop-blur-sm transition-colors hover:bg-paper hover:text-ink"
          >
            ‹
          </button>
        ) : null}
        {onNext ? (
          <button
            type="button"
            onClick={onNext}
            aria-label="next"
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 grid h-9 w-9 sm:h-10 sm:w-10 place-items-center rounded-full text-[16px] sm:text-[18px] leading-none text-muted bg-paper/70 border border-rule backdrop-blur-sm transition-colors hover:bg-paper hover:text-ink"
          >
            ›
          </button>
        ) : null}
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
