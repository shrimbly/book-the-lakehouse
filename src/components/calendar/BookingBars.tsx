"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import type { Booking, Person } from "@/lib/data";
import { nightsBetween } from "@/lib/iso-date";
import {
  BottomOverlayShell,
  CloseIconButton,
  OverlayBackdrop,
  PersonChip,
  fmtDay,
  useAnimatedClose,
} from "./overlayPrimitives";

export function ConfirmBar({
  start,
  end,
  locked,
  person,
  conflict,
  pending,
  onCancel,
  onConfirm,
  onAdjustStart,
  onAdjustEnd,
  canAdjustStart,
  canAdjustEnd,
  mode = "create",
  hasChanges = true,
}: {
  start: string;
  end: string;
  locked: boolean;
  person: Person;
  conflict: string | null;
  pending?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  onAdjustStart: (delta: number) => void;
  onAdjustEnd: (delta: number) => void;
  canAdjustStart: (delta: number) => boolean;
  canAdjustEnd: (delta: number) => boolean;
  mode?: "create" | "edit";
  hasChanges?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const { isClosing, close, closeWith } = useAnimatedClose(onCancel);
  const canEdit = locked;
  const confirmLabel =
    mode === "edit"
      ? pending
        ? "Saving…"
        : "Save"
      : pending
        ? "Saving…"
        : "Confirm";

  useEffect(() => {
    if (mode !== "edit" || !locked) return;
    const frame = window.requestAnimationFrame(() => setEditing(true));
    return () => window.cancelAnimationFrame(frame);
  }, [locked, mode]);

  return (
    <>
      {locked ? (
        <OverlayBackdrop onPointerDown={close} isClosing={isClosing} />
      ) : null}
      <BottomOverlayShell isClosing={isClosing}>
        <div
          className={[
            "flex w-full flex-col rounded-[12px] sm:rounded-[14px] border border-rule bg-paper shadow-card max-w-[calc(100vw-1.5rem)] sm:w-[480px] origin-bottom transition-transform duration-500 ease-out",
            locked
              ? "pointer-events-auto -translate-y-3 scale-[1.035]"
              : "pointer-events-none translate-y-0 scale-100",
          ].join(" ")}
        >
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 sm:gap-x-4 px-3 py-2.5 sm:px-4 sm:py-3">
            <PersonChip person={person} />
            <div className="flex flex-col leading-tight min-w-0">
              <StayDateText start={start} end={end} />
              {!locked ? (
                <span className="text-[10px] sm:text-[11px] text-muted">
                  pick an end date · {person.first}
                </span>
              ) : null}
            </div>
            {canEdit ? (
              <>
                <span
                  className="hidden sm:inline-block h-[3px] w-[3px] shrink-0 rounded-full bg-faint"
                  aria-hidden
                />
                <button
                  type="button"
                  onClick={() => setEditing((value) => !value)}
                  aria-expanded={editing}
                  className={[
                    "text-[12px] sm:text-[13px] font-medium underline-offset-4 transition-colors hover:underline focus-visible:underline focus-visible:outline-none",
                    editing
                      ? "text-ink underline decoration-ink"
                      : "text-muted hover:text-ink",
                  ].join(" ")}
                >
                  Edit
                </button>
              </>
            ) : null}
            {conflict ? (
              <div className="basis-full sm:basis-auto sm:ml-1 sm:max-w-[160px] text-[10px] sm:text-[11px] italic text-faint">
                overlaps {conflict}&rsquo;s stay
              </div>
            ) : null}
            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                onClick={() => closeWith(onConfirm)}
                disabled={
                  !locked || !!conflict || pending || !hasChanges || isClosing
                }
                className="pointer-events-auto whitespace-nowrap rounded-full bg-ink px-3 sm:px-4 py-1.5 text-[11px] sm:text-[12px] font-medium text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-25"
              >
                {confirmLabel}
              </button>
              <CloseIconButton onClick={close} />
            </div>
          </div>
          {canEdit ? (
            <div
              className="grid overflow-hidden transition-[grid-template-rows] duration-300 ease-out"
              style={{ gridTemplateRows: editing ? "1fr" : "0fr" }}
              aria-hidden={!editing}
            >
              <div className="overflow-hidden">
                <div className="border-t border-soft px-3 py-3 sm:px-4 sm:py-3.5 space-y-2">
                  <NudgeRow
                    label="Start"
                    value={fmtDay(start)}
                    onDec={() => onAdjustStart(-1)}
                    onInc={() => onAdjustStart(1)}
                    canDec={canAdjustStart(-1)}
                    canInc={canAdjustStart(1)}
                  />
                  <NudgeRow
                    label="End"
                    value={fmtDay(end)}
                    onDec={() => onAdjustEnd(-1)}
                    onInc={() => onAdjustEnd(1)}
                    canDec={canAdjustEnd(-1)}
                    canInc={canAdjustEnd(1)}
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </BottomOverlayShell>
    </>
  );
}

export function ChoiceBar({
  booking,
  person,
  onCancel,
  onEdit,
  onDelete,
}: {
  booking: Booking | null;
  person: Person;
  onCancel: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { isClosing, close, closeWith } = useAnimatedClose(onCancel);
  if (!booking) return null;

  return (
    <>
      <OverlayBackdrop onPointerDown={close} isClosing={isClosing} />
      <BottomOverlayShell isClosing={isClosing}>
        <div className="pointer-events-auto flex w-full flex-wrap items-center gap-x-3 gap-y-2 sm:gap-x-4 rounded-[12px] sm:rounded-[14px] border border-rule bg-paper px-3 py-2.5 sm:px-4 sm:py-3 shadow-card max-w-[calc(100vw-1.5rem)] sm:w-[480px]">
          <PersonChip person={person} />
          <div className="flex flex-col leading-tight min-w-0">
            <StayDateText start={booking.start} end={booking.end} />
            <span className="text-[10px] sm:text-[11px] text-muted">
              your stay · {person.first}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => closeWith(onDelete)}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-rule px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-[12px] font-medium text-ink transition-colors hover:border-ink"
            >
              <Trash2 size={12} strokeWidth={2.25} />
              Delete
            </button>
            <button
              type="button"
              onClick={() => closeWith(onEdit)}
              className="whitespace-nowrap px-1 py-1.5 text-[12px] sm:text-[13px] font-medium text-muted underline-offset-4 transition-colors hover:text-ink hover:underline focus-visible:text-ink focus-visible:underline focus-visible:outline-none"
            >
              Edit
            </button>
            <CloseIconButton onClick={close} />
          </div>
        </div>
      </BottomOverlayShell>
    </>
  );
}

export function DeleteBar({
  booking,
  person,
  pending,
  onCancel,
  onDelete,
}: {
  booking: Booking | null;
  person: Person;
  pending?: boolean;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const { isClosing, close, closeWith } = useAnimatedClose(onCancel);
  if (!booking) return null;

  const nights = nightsBetween(booking.start, booking.end);
  const sameDay = booking.start === booking.end;

  return (
    <>
      <OverlayBackdrop onPointerDown={close} isClosing={isClosing} />
      <BottomOverlayShell isClosing={isClosing}>
        <div className="pointer-events-auto flex w-full flex-wrap items-center gap-x-3 gap-y-2 sm:gap-x-4 rounded-[12px] sm:rounded-[14px] border border-rule bg-paper px-3 py-2.5 sm:px-4 sm:py-3 shadow-card max-w-[calc(100vw-1.5rem)] sm:w-[480px]">
          <PersonChip person={person} />
          <div className="flex min-w-0 flex-1 flex-col leading-tight">
            <span className="text-[12px] sm:text-[13px] font-medium">
              Remove this stay?
            </span>
            <span className="text-[10px] sm:text-[11px] text-muted">
              {sameDay
                ? fmtDay(booking.start)
                : `${fmtDay(booking.start)} → ${fmtDay(booking.end)}`}
              {" · "}
              {nights} night{nights === 1 ? "" : "s"}
            </span>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => closeWith(onDelete)}
              disabled={pending || isClosing}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-ink px-3 sm:px-4 py-1.5 text-[11px] sm:text-[12px] font-medium text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-25"
            >
              {!pending ? <Trash2 size={12} strokeWidth={2.25} /> : null}
              {pending ? "Removing…" : "Delete"}
            </button>
            <CloseIconButton onClick={close} />
          </div>
        </div>
      </BottomOverlayShell>
    </>
  );
}

function StayDateText({ start, end }: { start: string; end: string }) {
  const sameDay = start === end;

  if (sameDay) {
    return (
      <span className="text-[12px] sm:text-[13px] font-medium truncate">
        {fmtDay(start)}
      </span>
    );
  }

  return (
    <>
      <span className="hidden sm:block text-[13px] font-medium truncate">
        {fmtDay(start)}, to {fmtDay(end)}
      </span>
      <span className="sm:hidden text-[12px] font-medium truncate">
        {fmtDay(start)},
      </span>
      <span className="sm:hidden text-[12px] font-medium truncate">
        to {fmtDay(end)}
      </span>
    </>
  );
}

function NudgeRow({
  label,
  value,
  onDec,
  onInc,
  canDec,
  canInc,
}: {
  label: string;
  value: string;
  onDec: () => void;
  onInc: () => void;
  canDec: boolean;
  canInc: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.06em] text-muted w-[40px]">
        {label}
      </span>
      <span className="text-[12px] sm:text-[13px] font-medium tabular-nums flex-1">
        {value}
      </span>
      <NudgeButton
        onClick={onDec}
        disabled={!canDec}
        label={`${label} earlier`}
      >
        <ChevronLeft size={15} strokeWidth={2.25} />
      </NudgeButton>
      <NudgeButton onClick={onInc} disabled={!canInc} label={`${label} later`}>
        <ChevronRight size={15} strokeWidth={2.25} />
      </NudgeButton>
    </div>
  );
}

function NudgeButton({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="grid h-8 w-8 place-items-center rounded-full border border-rule text-[14px] text-muted transition-colors hover:border-ink hover:bg-ink hover:text-paper disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-rule disabled:hover:bg-paper disabled:hover:text-muted"
    >
      {children}
    </button>
  );
}
