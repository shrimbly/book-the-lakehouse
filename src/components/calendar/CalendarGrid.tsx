"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import type { Cell } from "@/lib/calendar";
import type { Person, Photo } from "@/lib/data";
import { PhotoStack } from "./PhotoStack";
import type { BookingRow, CalendarPreview, RowRibbon } from "./ribbons";

type CalendarGridProps = {
  cells: Cell[];
  dayLabels: readonly string[];
  preview: CalendarPreview | null;
  previewRows: RowRibbon[];
  exitingPreviewRows: RowRibbon[];
  exitingPreviewAvatar: RowRibbon | null;
  baseRowCount: number;
  scrollRows: number;
  bookingRows: BookingRow[];
  photosByDate: Map<string, Photo[]>;
  firstVisibleCellByBooking: Map<string, string>;
  exitingBookingIds: Set<string>;
  me: Person;
  meId: string;
  pickStart: string | null;
  pickEnd: string | null;
  actioningId: string | null;
  deletingId: string | null;
  editingId: string | null;
  isDragging: boolean;
  onPointerLeave: () => void;
  onHoverDate: (iso: string) => void;
  onPickDate: (
    iso: string,
    inMonth: boolean,
    hasBooking: boolean,
    pointer?: { x: number; y: number },
  ) => void;
  onSelectBooking: (bookingId: string) => void;
  onOpenPhotos: (
    bookingId: string,
    date: string,
    mode: "view" | "upload",
  ) => void;
};

export function CalendarGrid({
  cells,
  dayLabels,
  preview,
  previewRows,
  exitingPreviewRows,
  exitingPreviewAvatar,
  baseRowCount,
  scrollRows,
  bookingRows,
  photosByDate,
  firstVisibleCellByBooking,
  exitingBookingIds,
  me,
  meId,
  pickStart,
  pickEnd,
  actioningId,
  deletingId,
  editingId,
  isDragging,
  onPointerLeave,
  onHoverDate,
  onPickDate,
  onSelectBooking,
  onOpenPhotos,
}: CalendarGridProps) {
  const bodyRowCount = Math.max(
    ...cells.map((_, index) => Math.floor(index / 7) + 1),
    0,
  );
  const hasVirtualRows = bodyRowCount > baseRowCount;
  const visibleRowCount = hasVirtualRows ? baseRowCount + 1 : baseRowCount;
  const viewportRef = useRef<HTMLDivElement>(null);
  const [rowHeight, setRowHeight] = useState(68);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    function readRowHeight() {
      const currentViewport = viewportRef.current;
      if (!currentViewport) return;
      const raw = window
        .getComputedStyle(currentViewport)
        .getPropertyValue("--calendar-row-height");
      const next = Number.parseFloat(raw);
      if (Number.isFinite(next) && next > 0) setRowHeight(next);
    }

    readRowHeight();
    const observer = new ResizeObserver(readRowHeight);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="select-none">
      <div className="grid grid-cols-7 border-t border-ink">
        {dayLabels.map((dayLabel) => (
          <div
            key={dayLabel}
            className="px-3 pt-3.5 pb-4 text-[11px] font-medium text-muted"
          >
            {dayLabel}
          </div>
        ))}
      </div>

      <div
        ref={viewportRef}
        className="calendar-grid-viewport overflow-hidden"
        style={
          hasVirtualRows
            ? ({ "--calendar-visible-rows": visibleRowCount } as CSSProperties)
            : undefined
        }
      >
        <div
          className="calendar-scroll-track grid grid-cols-7"
          style={{
            transform: `translate3d(0, ${scrollRows * rowHeight * -1}px, 0)`,
          }}
          onPointerLeave={() => {
            if (!isDragging) onPointerLeave();
          }}
        >
          {cells.map((cell, index) => (
            <CalendarDayCell
              key={cell.iso}
              cell={cell}
              index={index}
              preview={preview}
              photos={photosByDate.get(cell.iso) ?? []}
              firstVisibleCellByBooking={firstVisibleCellByBooking}
              exitingBookingIds={exitingBookingIds}
              meId={meId}
              pickStart={pickStart}
              pickEnd={pickEnd}
              onHoverDate={onHoverDate}
              onPickDate={onPickDate}
              onOpenPhotos={onOpenPhotos}
            />
          ))}

          {bookingRows.map((row) => (
            <BookingRibbon
              key={row.bookingKey}
              row={row}
              isOwn={row.personId === meId}
              isExiting={exitingBookingIds.has(row.bookingId)}
              isActive={
                actioningId === row.bookingId ||
                deletingId === row.bookingId ||
                editingId === row.bookingId
              }
              pickStart={pickStart}
              onSelectBooking={onSelectBooking}
            />
          ))}

          {bookingRows
            .filter((row) => exitingBookingIds.has(row.bookingId))
            .map((row) => (
              <ExitingBookingCover key={`exit-${row.bookingKey}`} row={row} />
            ))}

          {bookingRows
            .filter((row) => row.isBookingStart)
            .map((row) => (
              <BookingAvatar
                key={`av-${row.bookingKey}`}
                row={row}
                isOwn={row.personId === meId}
                isExiting={exitingBookingIds.has(row.bookingId)}
                pickStart={pickStart}
                onSelectBooking={onSelectBooking}
              />
            ))}

          {previewRows.map((row, index) => (
            <PreviewRibbon
              key={`pr-track-${row.gridRow}`}
              row={row}
              index={index}
              person={me}
            />
          ))}

          {exitingPreviewRows.map((row, index) => (
            <PreviewRibbon
              key={`pr-exit-${row.gridRow}-${row.startCol}-${row.endCol}`}
              row={row}
              index={index}
              person={me}
              exiting
            />
          ))}

          {previewRows[0] ? (
            <PreviewAvatar row={previewRows[0]} person={me} />
          ) : null}

          {exitingPreviewAvatar ? (
            <PreviewAvatar row={exitingPreviewAvatar} person={me} exiting />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CalendarDayCell({
  cell,
  index,
  preview,
  photos,
  firstVisibleCellByBooking,
  exitingBookingIds,
  meId,
  pickStart,
  pickEnd,
  onHoverDate,
  onPickDate,
  onOpenPhotos,
}: {
  cell: Cell;
  index: number;
  preview: CalendarPreview | null;
  photos: Photo[];
  firstVisibleCellByBooking: Map<string, string>;
  exitingBookingIds: Set<string>;
  meId: string;
  pickStart: string | null;
  pickEnd: string | null;
  onHoverDate: (iso: string) => void;
  onPickDate: (
    iso: string,
    inMonth: boolean,
    hasBooking: boolean,
    pointer?: { x: number; y: number },
  ) => void;
  onOpenPhotos: (
    bookingId: string,
    date: string,
    mode: "view" | "upload",
  ) => void;
}) {
  const booking = cell.booking;
  const inPreview =
    preview != null &&
    cell.selectable &&
    !booking &&
    cell.iso >= preview.start &&
    cell.iso <= preview.end;
  const interactive = cell.selectable && !booking && !pickEnd;
  const showGhost = interactive && !inPreview;
  const isExitingBookingCell = !!booking && exitingBookingIds.has(booking.id);
  const isOwnBookingCell = booking?.person.id === meId;
  const showThumbStack = !!booking && photos.length > 0 && !isExitingBookingCell;
  const showAddBadge =
    !!booking && isOwnBookingCell && !pickStart && !isExitingBookingCell;
  const isFirstBookingCell =
    !!booking && firstVisibleCellByBooking.get(booking.id) === cell.iso;
  const isResolvedNextMonth = cell.virtualState === "resolved";
  const isPreviewNextMonth = cell.virtualState === "preview";

  return (
    <div
      data-iso={cell.iso}
      onPointerEnter={() => onHoverDate(cell.iso)}
      onPointerDown={(event) => {
        event.preventDefault();
        const target = event.target as Element;
        if (target.hasPointerCapture?.(event.pointerId)) {
          target.releasePointerCapture(event.pointerId);
        }
        onPickDate(cell.iso, cell.inMonth, !!booking, {
          x: event.clientX,
          y: event.clientY,
        });
      }}
      style={{
        gridRow: Math.floor(index / 7) + 1,
        gridColumn: (index % 7) + 1,
        touchAction: "none",
      }}
      className={[
        "relative min-h-[68px] sm:min-h-[84px] border-t border-soft px-2 pt-2 pb-1.5 sm:px-3 sm:pt-2.5 sm:pb-2.5",
        isResolvedNextMonth ? "bg-soft/25" : "",
        isPreviewNextMonth
          ? "bg-paper/55 backdrop-blur-[2px] opacity-70 border-dashed"
          : "",
        interactive ? "cursor-pointer" : "",
        showGhost || showAddBadge ? "group" : "",
      ].join(" ")}
    >
      <span
        className={[
          "relative inline-block text-[14px] sm:text-[18px] leading-none tabular-nums tracking-[-0.01em]",
          isResolvedNextMonth
            ? "font-medium text-muted"
            : isPreviewNextMonth
              ? "font-medium text-faint"
              : !cell.inMonth
            ? "text-faint"
            : cell.isToday
              ? "font-semibold text-ink"
              : "font-medium text-ink",
        ].join(" ")}
      >
        {cell.day}
        {cell.isToday ? (
          <span className="absolute -bottom-1 left-0 right-0 h-[2px] rounded-sm bg-ink" />
        ) : null}
      </span>

      {showGhost ? (
        <div className="pointer-events-none absolute bottom-1.5 sm:bottom-2.5 left-1 right-1 sm:left-1.5 sm:right-1.5 flex h-[20px] sm:h-[26px] items-center justify-center rounded-[5px] sm:rounded-[6px] border border-dashed border-rule text-[12px] sm:text-[14px] leading-none text-faint opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          +
        </div>
      ) : null}

      {showThumbStack && booking ? (
        <PhotoStack
          photos={photos}
          offsetForAvatar={isFirstBookingCell}
          disabled={!!pickStart}
          onOpen={() => {
            const isHoverDevice =
              typeof window !== "undefined" &&
              window.matchMedia("(hover: hover) and (pointer: fine)").matches;
            onOpenPhotos(
              booking.id,
              cell.iso,
              isHoverDevice ? "view" : "upload",
            );
          }}
        />
      ) : null}

      {showAddBadge && booking ? (
        <button
          type="button"
          onPointerDown={(event) => {
            event.stopPropagation();
            event.preventDefault();
            onOpenPhotos(booking.id, cell.iso, "upload");
          }}
          aria-label="Add a photo for this day"
          className={[
            "absolute z-[9] place-items-center rounded-[4px] sm:rounded-[5px] border border-dashed border-rule bg-paper/85 text-[12px] leading-none text-faint opacity-0 transition-opacity duration-150 group-hover:opacity-100 hover:border-ink hover:text-ink",
            showThumbStack
              ? "max-sm:hidden grid h-[30px] w-[30px] bottom-[42px]"
              : "grid h-[22px] w-[22px] sm:h-[26px] sm:w-[26px] bottom-[30px] sm:bottom-[40px]",
            showThumbStack
              ? isFirstBookingCell
                ? "sm:left-[88px]"
                : "sm:left-[78px]"
              : isFirstBookingCell
                ? "left-[34px] sm:left-[44px]"
                : "left-[26px] sm:left-[34px]",
          ].join(" ")}
        >
          +
        </button>
      ) : null}
    </div>
  );
}

function BookingRibbon({
  row,
  isOwn,
  isExiting,
  isActive,
  pickStart,
  onSelectBooking,
}: {
  row: BookingRow;
  isOwn: boolean;
  isExiting: boolean;
  isActive: boolean;
  pickStart: string | null;
  onSelectBooking: (bookingId: string) => void;
}) {
  return (
    <div
      onClick={
        isOwn && !pickStart && !isExiting
          ? () => onSelectBooking(row.bookingId)
          : undefined
      }
      className={[
        "z-[4] flex h-[20px] sm:h-[26px] items-center self-end overflow-hidden text-[10px] sm:text-[11px] font-medium tracking-[-0.005em] mb-1.5 sm:mb-2.5 pr-1.5 sm:pr-2 transition-[opacity,outline] duration-150",
        isExiting ? "pointer-events-none" : "",
        isOwn && !pickStart && !isExiting
          ? "cursor-pointer hover:opacity-90"
          : "pointer-events-none",
        isActive ? "outline outline-2 outline-offset-1 outline-ink/60" : "",
        row.isBookingStart ? "pl-[30px] sm:pl-[42px]" : "pl-1.5 sm:pl-2",
        row.roundLeft ? "ml-1 sm:ml-1.5" : "",
        row.roundRight ? "mr-1 sm:mr-1.5" : "",
        row.muted ? "opacity-65 saturate-[0.72]" : "",
        ribbonRadius(row),
      ].join(" ")}
      style={{
        gridColumn: `${row.startCol} / ${row.endCol}`,
        gridRow: row.gridRow - 1,
        backgroundColor: row.muted
          ? `color-mix(in srgb, ${row.color} var(--theme-ribbon-muted-fill-color), var(--color-soft) var(--theme-ribbon-muted-fill-soft))`
          : `color-mix(in srgb, ${row.color} var(--theme-ribbon-fill-color), var(--color-paper) var(--theme-ribbon-fill-paper))`,
        color: row.muted
          ? `color-mix(in srgb, ${row.color} var(--theme-ribbon-muted-label-color), var(--color-muted) var(--theme-ribbon-muted-label-muted))`
          : `color-mix(in srgb, ${row.color} var(--theme-ribbon-label-color), var(--color-ink) var(--theme-ribbon-label-ink))`,
      }}
    >
      {row.isBookingStart ? (
        <span className="block truncate">{row.name}</span>
      ) : null}
    </div>
  );
}

function ExitingBookingCover({ row }: { row: BookingRow }) {
  return (
    <div
      style={{
        gridColumn: `${row.startCol} / ${row.endCol}`,
        gridRow: row.gridRow - 1,
      }}
      className={[
        "pointer-events-none relative z-[10] self-stretch overflow-visible",
        row.roundLeft ? "ml-1 sm:ml-1.5" : "",
        row.roundRight ? "mr-1 sm:mr-1.5" : "",
      ].join(" ")}
    >
      <div
        className={[
          "absolute bottom-1.5 right-0 h-[20px] bg-paper animate-ribbon-cover sm:bottom-2.5 sm:h-[26px]",
          row.roundRight ? "rounded-r-[5px] sm:rounded-r-[6px]" : "",
        ].join(" ")}
      />
    </div>
  );
}

function BookingAvatar({
  row,
  isOwn,
  isExiting,
  pickStart,
  onSelectBooking,
}: {
  row: BookingRow;
  isOwn: boolean;
  isExiting: boolean;
  pickStart: string | null;
  onSelectBooking: (bookingId: string) => void;
}) {
  return (
    <div
      onClick={
        isOwn && !pickStart && !isExiting
          ? () => onSelectBooking(row.bookingId)
          : undefined
      }
      className={[
        "z-[8] grid h-[26px] w-[26px] sm:h-[34px] sm:w-[34px] translate-y-px place-items-center self-end justify-self-start overflow-hidden rounded-[5px] sm:rounded-[6px] border border-avatar-ring text-[11px] sm:text-[12px] font-semibold text-paper shadow-control mb-1.5 sm:mb-2.5 ml-1 sm:ml-1.5",
        isExiting ? "pointer-events-none animate-avatar-shrink" : "",
        isOwn && !pickStart && !isExiting
          ? "cursor-pointer"
          : "pointer-events-none",
        row.muted ? "opacity-70 saturate-[0.72]" : "",
      ].join(" ")}
      style={{
        gridColumn: row.startCol,
        gridRow: row.gridRow - 1,
        backgroundColor: row.imageUrl ? undefined : row.color,
      }}
    >
      {row.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={row.imageUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        row.initial
      )}
    </div>
  );
}

function PreviewRibbon({
  row,
  index,
  person,
  exiting = false,
}: {
  row: RowRibbon;
  index: number;
  person: Person;
  exiting?: boolean;
}) {
  return (
    <div
      style={{ gridRow: row.gridRow - 1, gridColumn: "1 / 8" }}
      className="pointer-events-none relative"
    >
      <div
        className={[
          exiting
            ? "preview-ribbon-exit absolute bottom-1.5 sm:bottom-2.5 z-[6] flex h-[20px] sm:h-[26px] origin-left items-center overflow-hidden text-[10px] sm:text-[11px] font-medium tracking-[-0.005em] opacity-70 pr-1.5 sm:pr-2 animate-ribbon-shrink"
            : "preview-ribbon-fill absolute bottom-1.5 sm:bottom-2.5 z-[5] flex h-[20px] sm:h-[26px] items-center overflow-hidden text-[10px] sm:text-[11px] font-medium tracking-[-0.005em] opacity-70 pr-1.5 sm:pr-2",
          index === 0 ? "pl-[30px] sm:pl-[42px]" : "pl-1.5 sm:pl-2",
          ribbonRadius(row),
        ].join(" ")}
        style={{
          ["--rl" as string]: `${((row.startCol - 1) / 7) * 100}%`,
          ["--rw" as string]: `${((row.endCol - row.startCol) / 7) * 100}%`,
          ["--ol" as string]: row.roundLeft ? 1 : 0,
          ["--or" as string]: row.roundRight ? 1 : 0,
          backgroundColor: `color-mix(in srgb, ${person.color} var(--theme-ribbon-fill-color), var(--color-paper) var(--theme-ribbon-fill-paper))`,
          color: `color-mix(in srgb, ${person.color} var(--theme-ribbon-label-color), var(--color-ink) var(--theme-ribbon-label-ink))`,
        }}
      >
        {index === 0 ? (
          <span className="block truncate">{person.first}</span>
        ) : null}
      </div>
    </div>
  );
}

function PreviewAvatar({
  row,
  person,
  exiting = false,
}: {
  row: RowRibbon;
  person: Person;
  exiting?: boolean;
}) {
  return (
    <div
      className={[
        "pointer-events-none z-10 grid h-[26px] w-[26px] sm:h-[34px] sm:w-[34px] translate-y-px place-items-center self-end justify-self-start overflow-hidden rounded-[5px] sm:rounded-[6px] border border-avatar-ring text-[11px] sm:text-[12px] font-semibold text-paper opacity-70 shadow-control mb-1.5 sm:mb-2.5 ml-1 sm:ml-1.5",
        exiting ? "animate-avatar-shrink" : "animate-avatar-pop",
      ].join(" ")}
      style={{
        gridColumn: row.startCol,
        gridRow: row.gridRow - 1,
        backgroundColor: person.imageUrl ? undefined : person.color,
      }}
    >
      {person.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={person.imageUrl}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : (
        person.initial
      )}
    </div>
  );
}

function ribbonRadius(row: { roundLeft: boolean; roundRight: boolean }) {
  if (row.roundLeft && row.roundRight) return "rounded-[5px] sm:rounded-[6px]";
  if (row.roundLeft) return "rounded-l-[5px] sm:rounded-l-[6px]";
  if (row.roundRight) return "rounded-r-[5px] sm:rounded-r-[6px]";
  return "";
}
