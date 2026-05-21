"use client";

import type { Photo } from "@/lib/data";

export function PhotoStack({
  photos,
  offsetForAvatar,
  disabled = false,
  onOpen,
}: {
  photos: Photo[];
  offsetForAvatar?: boolean;
  disabled?: boolean;
  onOpen: () => void;
}) {
  const first = photos[0];
  const hasMore = photos.length > 1;

  return (
    <button
      type="button"
      onPointerDown={(event) => {
        if (disabled) return;
        event.stopPropagation();
        event.preventDefault();
        onOpen();
      }}
      aria-label={`View ${photos.length} photo${photos.length === 1 ? "" : "s"}`}
      className={[
        "absolute z-[9] block h-[26px] w-[26px] sm:h-[32px] sm:w-[32px]",
        "bottom-[30px] sm:bottom-[40px]",
        disabled ? "pointer-events-none" : "",
        offsetForAvatar
          ? "left-[34px] sm:left-[44px]"
          : "left-[26px] sm:left-[34px]",
      ].join(" ")}
    >
      {hasMore ? (
        <span
          aria-hidden
          className="absolute inset-0 translate-x-[7px] scale-[0.92] rounded-[4px] sm:rounded-[5px] border border-paper bg-soft shadow-control overflow-hidden"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photos[1].thumbnailUrl ?? photos[1].url}
            alt=""
            className="h-full w-full object-cover"
          />
        </span>
      ) : null}
      <span className="absolute inset-0 rounded-[4px] sm:rounded-[5px] border border-paper bg-soft shadow-control overflow-hidden transition-transform hover:scale-105">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={first.thumbnailUrl ?? first.url}
          alt=""
          className="h-full w-full object-cover"
        />
      </span>
    </button>
  );
}
