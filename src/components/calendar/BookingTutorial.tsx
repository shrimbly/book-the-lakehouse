"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, X } from "lucide-react";
import type { Cell } from "@/lib/calendar";
import type { Booking, Person } from "@/lib/data";
import {
  BOOKING_TUTORIAL_OPEN_EVENT,
  BOOKING_TUTORIAL_STORAGE_KEY,
} from "@/lib/booking-tutorial";
import { buildBookingRows, buildPreviewRows } from "./ribbons";
import type { TutorialCalendarOverlay } from "./CalendarGrid";
import { ChoiceBar, ConfirmBar } from "./Overlays";

const TUTORIAL_EXIT_MS = 260;

type TutorialStepId =
  | "intro"
  | "tap-start"
  | "tap-end"
  | "drag"
  | "edit"
  | "delete";

type TutorialPhase = "idle" | "choice" | "edit" | "delete";

const DEMO_BOOKING_ID = "booking-tutorial-demo-booking";
const STEP_IDS: TutorialStepId[] = [
  "intro",
  "tap-start",
  "tap-end",
  "drag",
  "edit",
  "delete",
];

const STEP_COPY: Record<
  TutorialStepId,
  { title: string; body: string }
> = {
  intro: {
    title: "How to book your stay",
    body: "A short practice run using this calendar. Nothing here changes real bookings.",
  },
  "tap-start": {
    title: "Tap your first day",
    body: "Tap once on the day you arrive. The bar appears and asks you to pick an end date.",
  },
  "tap-end": {
    title: "Tap your last day",
    body: "Tap the last day of your stay. The ribbon grows across every night before you confirm.",
  },
  drag: {
    title: "Or press and drag",
    body: "You can also drag across the calendar to choose the whole stay in one motion.",
  },
  edit: {
    title: "Edit an existing booking",
    body: "Tap your booking, choose Edit, then nudge the start or end date.",
  },
  delete: {
    title: "Delete a booking",
    body: "Tap your booking and choose Delete. The final step asks you to confirm before removing it.",
  },
};

export function BookingTutorial({
  cells,
  me,
  onVisualChange,
}: {
  cells: Cell[];
  me: Person;
  onVisualChange: (visual: TutorialCalendarOverlay | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [phase, setPhase] = useState<TutorialPhase>("idle");
  const demo = useMemo(() => buildDemoRanges(cells), [cells]);
  const stepId = STEP_IDS[stepIndex];
  const isLast = stepIndex === STEP_IDS.length - 1;

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(BOOKING_TUTORIAL_STORAGE_KEY)) {
        const timer = window.setTimeout(() => setOpen(true), 700);
        return () => window.clearTimeout(timer);
      }
    } catch {
      return undefined;
    }
    return undefined;
  }, []);

  useEffect(() => {
    function replay() {
      setStepIndex(0);
      setPhase("idle");
      setIsClosing(false);
      setOpen(true);
    }

    window.addEventListener(BOOKING_TUTORIAL_OPEN_EVENT, replay);
    return () => window.removeEventListener(BOOKING_TUTORIAL_OPEN_EVENT, replay);
  }, []);

  useEffect(() => {
    if (!open) {
      onVisualChange(null);
      return;
    }

    if (stepId === "delete" && phase === "choice") {
      const timer = window.setTimeout(() => setPhase("delete"), 1150);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [onVisualChange, open, phase, stepId]);

  useEffect(() => {
    if (!open) {
      onVisualChange(null);
      return;
    }
    onVisualChange(visualForStep({ cells, demo, me, phase, stepId }));
  }, [cells, demo, me, onVisualChange, open, phase, stepId]);

  function markSeen() {
    try {
      window.localStorage.setItem(BOOKING_TUTORIAL_STORAGE_KEY, "1");
    } catch {
      // Browser privacy settings can block storage; closing should still work.
    }
  }

  function close() {
    if (isClosing) return;
    markSeen();
    setIsClosing(true);
    window.setTimeout(() => {
      setOpen(false);
      setIsClosing(false);
      setPhase("idle");
    }, TUTORIAL_EXIT_MS);
  }

  function next() {
    if (isLast) {
      close();
      return;
    }
    const nextStep = STEP_IDS[stepIndex + 1];
    setPhase(
      nextStep === "edit" ? "edit" : nextStep === "delete" ? "choice" : "idle",
    );
    setStepIndex((value) => value + 1);
  }

  if (!open || !demo) return null;

  const copy = STEP_COPY[stepId];
  const demoBooking: Booking = {
    id: DEMO_BOOKING_ID,
    personId: me.id,
    start: demo.booking.start,
    end: demo.booking.end,
  };

  return createPortal(
    <>
      <div
        aria-hidden
        className={[
          "booking-tutorial-wash themed-overlay-wash fixed inset-0 z-[18] opacity-80",
          isClosing ? "is-closing" : "",
        ].join(" ")}
      />
      <div
        aria-hidden
        data-booking-tutorial-blocker
        className="fixed inset-0 z-[25]"
      />
      {renderDemoBar({
        demoBooking,
        demo,
        me,
        phase,
        stepId,
        onClose: close,
        onDeletePhase: () => setPhase("delete"),
        onEditPhase: () => setPhase("edit"),
        onNext: next,
      })}
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-tutorial-title"
        data-booking-tutorial
        data-booking-tutorial-step={stepId}
        className={[
          "booking-tutorial-card fixed left-1/2 top-[max(1rem,env(safe-area-inset-top))] z-[50] w-[min(360px,calc(100vw-1.5rem))] -translate-x-1/2 rounded-[14px] border border-rule bg-paper px-4 py-4 text-ink shadow-panel sm:left-auto sm:right-8 sm:top-8 sm:translate-x-0",
          isClosing ? "is-closing" : "",
        ].join(" ")}
      >
        <div className="mb-3 flex items-start justify-between gap-4">
          <div>
            <h2
              id="booking-tutorial-title"
              className="m-0 text-[18px] font-semibold leading-tight tracking-[-0.025em]"
            >
              {copy.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={close}
            disabled={isClosing}
            aria-label="Close tutorial"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-paper/70 text-muted shadow-control transition-colors hover:bg-soft hover:text-ink"
          >
            <X size={15} strokeWidth={2.25} />
          </button>
        </div>
        <p className="m-0 text-[13px] leading-relaxed text-muted">{copy.body}</p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex gap-1" aria-label={`Step ${stepIndex + 1} of ${STEP_IDS.length}`}>
            {STEP_IDS.map((id, index) => (
              <span
                key={id}
                className={[
                  "h-1.5 rounded-full transition-all duration-300",
                  index === stepIndex ? "w-5 bg-ink" : "w-1.5 bg-rule",
                ].join(" ")}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={close}
              disabled={isClosing}
              className="rounded-full px-3 py-1.5 text-[12px] font-medium text-muted transition-colors hover:text-ink"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={next}
              disabled={isClosing}
              className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-1.5 text-[12px] font-medium text-paper shadow-control transition-opacity hover:opacity-90"
            >
              {isLast ? "Done" : "Next"}
              {!isLast ? <ArrowRight size={13} strokeWidth={2.25} /> : null}
            </button>
          </div>
        </div>
      </section>
    </>,
    document.body,
  );
}

function renderDemoBar({
  demoBooking,
  demo,
  me,
  phase,
  stepId,
  onClose,
  onDeletePhase,
  onEditPhase,
  onNext,
}: {
  demoBooking: Booking;
  demo: TutorialDemoRanges;
  me: Person;
  phase: TutorialPhase;
  stepId: TutorialStepId;
  onClose: () => void;
  onDeletePhase: () => void;
  onEditPhase: () => void;
  onNext: () => void;
}) {
  if (stepId === "tap-start") {
    return (
      <ConfirmBar
        start={demo.tap.start}
        end={demo.tap.start}
        locked={false}
        person={me}
        conflict={null}
        onCancel={onClose}
        onConfirm={onNext}
        onAdjustStart={() => undefined}
        onAdjustEnd={() => undefined}
        canAdjustStart={() => false}
        canAdjustEnd={() => false}
      />
    );
  }

  if (stepId === "tap-end" || stepId === "drag") {
    const range = stepId === "drag" ? demo.drag : demo.tap;
    return (
      <ConfirmBar
        start={range.start}
        end={range.end}
        locked
        person={me}
        conflict={null}
        onCancel={onClose}
        onConfirm={onNext}
        onAdjustStart={() => undefined}
        onAdjustEnd={() => undefined}
        canAdjustStart={() => false}
        canAdjustEnd={() => false}
      />
    );
  }

  if (stepId === "edit" && phase === "edit") {
    return (
      <ConfirmBar
        start={demo.booking.start}
        end={demo.booking.end}
        locked
        person={me}
        conflict={null}
        mode="edit"
        onCancel={onClose}
        onConfirm={onNext}
        onAdjustStart={() => undefined}
        onAdjustEnd={() => undefined}
        canAdjustStart={() => true}
        canAdjustEnd={() => true}
        tutorialEditIndicator
      />
    );
  }

  if (stepId === "edit" || stepId === "delete") {
    return (
      <ChoiceBar
        booking={demoBooking}
        person={me}
        deleting={stepId === "delete" && phase === "delete"}
        onCancel={onClose}
        onEdit={stepId === "edit" ? onEditPhase : onNext}
        onDelete={onDeletePhase}
        onConfirmDelete={onNext}
      />
    );
  }

  return null;
}

type TutorialDemoRanges = {
  tap: { start: string; end: string };
  drag: { start: string; end: string };
  booking: { start: string; end: string };
  pointer: {
    tapStart: { gridRow: number; gridColumn: number };
    tapEnd: { gridRow: number; gridColumn: number };
    dragStart: { gridRow: number; gridColumn: number };
    dragEnd: { gridRow: number; gridColumn: number };
    booking: { gridRow: number; gridColumn: number };
  };
};

function buildDemoRanges(cells: Cell[]): TutorialDemoRanges | null {
  const selectable = cells
    .map((cell, index) => ({
      cell,
      gridRow: Math.floor(index / 7) + 2,
      gridColumn: (index % 7) + 1,
    }))
    .filter(({ cell }) => cell.inMonth && cell.selectable && !cell.booking);

  const tap = findContiguousRange(selectable, 3) ?? selectable.slice(0, 3);
  const drag = findContiguousRange(selectable.slice(3), 4) ?? selectable.slice(0, 4);
  const booking = findContiguousRange(selectable.slice(7), 3) ?? tap;

  if (tap.length < 1 || drag.length < 1 || booking.length < 1) return null;

  return {
    tap: { start: tap[0].cell.iso, end: tap[tap.length - 1].cell.iso },
    drag: { start: drag[0].cell.iso, end: drag[drag.length - 1].cell.iso },
    booking: {
      start: booking[0].cell.iso,
      end: booking[booking.length - 1].cell.iso,
    },
    pointer: {
      tapStart: { gridRow: tap[0].gridRow, gridColumn: tap[0].gridColumn },
      tapEnd: {
        gridRow: tap[tap.length - 1].gridRow,
        gridColumn: tap[tap.length - 1].gridColumn,
      },
      dragStart: {
        gridRow: drag[0].gridRow,
        gridColumn: drag[0].gridColumn,
      },
      dragEnd: {
        gridRow: drag[drag.length - 1].gridRow,
        gridColumn: drag[drag.length - 1].gridColumn,
      },
      booking: {
        gridRow: booking[0].gridRow,
        gridColumn: booking[0].gridColumn,
      },
    },
  };
}

function findContiguousRange<T extends { cell: Cell; gridRow: number }>(
  cells: T[],
  length: number,
): T[] | null {
  for (let start = 0; start <= cells.length - length; start += 1) {
    const range = cells.slice(start, start + length);
    const sameRow = range.every((entry) => entry.gridRow === range[0].gridRow);
    const contiguous = range.every((entry, index) => {
      if (index === 0) return true;
      const previous = new Date(`${range[index - 1].cell.iso}T00:00:00`);
      const current = new Date(`${entry.cell.iso}T00:00:00`);
      return current.getTime() - previous.getTime() === 86_400_000;
    });
    if (sameRow && contiguous) return range;
  }
  return null;
}

function visualForStep({
  cells,
  demo,
  me,
  phase,
  stepId,
}: {
  cells: Cell[];
  demo: TutorialDemoRanges | null;
  me: Person;
  phase: TutorialPhase;
  stepId: TutorialStepId;
}): TutorialCalendarOverlay | null {
  if (!demo || stepId === "intro") return null;

  if (stepId === "tap-start") {
    return {
      previewRows: buildPreviewRows(
        { start: demo.tap.start, end: demo.tap.start },
        cells,
      ),
      pointer: { ...demo.pointer.tapStart, motion: "tap" },
    };
  }

  if (stepId === "tap-end") {
    return {
      previewRows: buildPreviewRows(demo.tap, cells),
      pointer: { ...demo.pointer.tapEnd, motion: "tap" },
    };
  }

  if (stepId === "drag") {
    return {
      previewRows: buildPreviewRows(demo.drag, cells),
      pointer: {
        ...demo.pointer.dragStart,
        gridColumnEnd: demo.pointer.dragEnd.gridColumn + 1,
        motion: "drag",
      },
    };
  }

  const bookingRows = buildBookingRows({
    bookings: [
      {
        id: DEMO_BOOKING_ID,
        personId: me.id,
        start: demo.booking.start,
        end: demo.booking.end,
      },
    ],
    cells,
    people: [me],
  });

  return {
    bookingRows,
    activeBookingId: DEMO_BOOKING_ID,
    pointer:
      phase === "choice"
        ? { ...demo.pointer.booking, motion: "tap" }
        : null,
  };
}
