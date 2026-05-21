"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildMonthCells,
  maxNextRowsForMonth,
  nextRowsNeededForIso,
} from "@/lib/calendar";
import type { Booking, Person } from "@/lib/data";
import { shiftIsoDate } from "@/lib/iso-date";
import {
  buildPreviewRows,
  rangeOverlapsBookings,
  type RowRibbon,
} from "./ribbons";

const RIBBON_EXIT_ANIMATION_MS = 220;
const ROW_REVEAL_DELAY_MS = 260;
const DRAG_COMMIT_DISTANCE_PX = 5;

type PointerPoint = {
  x: number;
  y: number;
};

export function useBookingSelection({
  year,
  month,
  bookings,
  people,
  me,
  today,
  hasPaymentConfig,
  onSave,
}: {
  year: number;
  month: number;
  bookings: Booking[];
  people: Person[];
  me: Person | undefined;
  today: string;
  hasPaymentConfig: boolean;
  onSave: (start: string, end: string, id: string | null) => void;
}) {
  const [pickStart, setPickStart] = useState<string | null>(null);
  const [pickEnd, setPickEnd] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [paymentReview, setPaymentReview] = useState<{
    start: string;
    end: string;
  } | null>(null);
  const [resolvedNextRows, setResolvedNextRows] = useState(0);
  const [exitingPreviewRows, setExitingPreviewRows] = useState<RowRibbon[]>([]);
  const ribbonExitTimers = useRef<number[]>([]);
  const lastRowRevealAt = useRef(-ROW_REVEAL_DELAY_MS);
  const dragStartPoint = useRef<PointerPoint | null>(null);
  const hasMovedDuringDrag = useRef(false);

  useEffect(() => {
    const timers = ribbonExitTimers.current;
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  const baseCells = useMemo(
    () =>
      buildMonthCells(
        year,
        month,
        editingId
          ? bookings.filter((booking) => booking.id !== editingId)
          : bookings,
        people,
        today,
      ),
    [year, month, bookings, people, today, editingId],
  );
  const shouldShowNextPreviewRow = useMemo(() => {
    if (!pickStart || pickEnd) return false;
    if (resolvedNextRows >= maxNextRowsForMonth(year, month)) return false;
    const hoveredIndex = baseCells.findIndex((cell) => cell.iso === hovered);
    if (hoveredIndex < 0) return resolvedNextRows > 0;
    const hoveredRow = Math.floor(hoveredIndex / 7);
    const lastResolvedRow = baseCells.length / 7 + resolvedNextRows - 1;
    return hoveredRow >= lastResolvedRow;
  }, [baseCells, hovered, month, pickEnd, pickStart, resolvedNextRows, year]);

  const cells = useMemo(
    () =>
      buildMonthCells(
        year,
        month,
        editingId
          ? bookings.filter((booking) => booking.id !== editingId)
          : bookings,
        people,
        today,
        {
          resolvedNextRows,
          includeNextPreviewRow: shouldShowNextPreviewRow,
          selectTrailingNextMonth: !!pickStart,
        },
      ),
    [
      year,
      month,
      bookings,
      people,
      today,
      editingId,
      resolvedNextRows,
      shouldShowNextPreviewRow,
      pickStart,
    ],
  );

  const preview = useMemo(() => {
    if (!pickStart) return null;
    let start = pickStart;
    let end = pickStart;
    if (pickEnd) {
      start = pickStart <= pickEnd ? pickStart : pickEnd;
      end = pickStart <= pickEnd ? pickEnd : pickStart;
    } else if (hovered) {
      if (hovered >= pickStart) end = hovered;
      else start = hovered;
    }
    return { start, end };
  }, [pickStart, pickEnd, hovered]);

  const conflict = useMemo(() => {
    if (!preview) return null;
    for (const booking of bookings) {
      if (editingId && booking.id === editingId) continue;
      if (preview.start <= booking.end && preview.end >= booking.start) {
        const person = people.find(
          (candidate) => candidate.id === booking.personId,
        );
        return person?.first ?? "another stay";
      }
    }
    return null;
  }, [preview, bookings, people, editingId]);

  const previewRows = useMemo(
    () => buildPreviewRows(preview, cells),
    [preview, cells],
  );
  const exitingPreviewAvatar = exitingPreviewRows[0] ?? null;

  const clearSelection = useCallback(() => {
    setPickStart(null);
    setPickEnd(null);
    setHovered(null);
    setIsDragging(false);
    setEditingId(null);
    setPaymentReview(null);
    setResolvedNextRows(0);
    lastRowRevealAt.current = -ROW_REVEAL_DELAY_MS;
    dragStartPoint.current = null;
    hasMovedDuringDrag.current = false;
  }, []);

  const cancel = useCallback(() => {
    if (previewRows.length > 0) {
      setExitingPreviewRows(previewRows);
      const timer = window.setTimeout(
        () => setExitingPreviewRows([]),
        RIBBON_EXIT_ANIMATION_MS,
      );
      ribbonExitTimers.current.push(timer);
    }
    clearSelection();
  }, [clearSelection, previewRows]);

  function pickDate(
    iso: string,
    _inMonth: boolean,
    hasBooking: boolean,
    pointer?: PointerPoint,
  ) {
    const cell = cells.find((candidate) => candidate.iso === iso);
    if (!cell?.selectable || hasBooking || pickEnd) return;
    if (!pickStart) {
      setPickStart(iso);
      setHovered(iso);
      setIsDragging(true);
      dragStartPoint.current = pointer ?? null;
      hasMovedDuringDrag.current = false;
      return;
    }

    if (iso === pickStart) {
      setPickEnd(iso);
      return;
    }
    if (iso > pickStart) {
      setPickEnd(iso);
    } else {
      setPickEnd(pickStart);
      setPickStart(iso);
    }
  }

  function commitDragEnd() {
    if (!isDragging || !pickStart || pickEnd) {
      setIsDragging(false);
      dragStartPoint.current = null;
      hasMovedDuringDrag.current = false;
      return;
    }
    const end = hovered;
    if (!end || end === pickStart) {
      if (end === pickStart && hasMovedDuringDrag.current) {
        setPickEnd(pickStart);
      }
      setIsDragging(false);
      dragStartPoint.current = null;
      hasMovedDuringDrag.current = false;
      return;
    }
    const cell = cells.find((candidate) => candidate.iso === end);
    if (!cell || !cell.selectable || cell.booking) {
      setIsDragging(false);
      dragStartPoint.current = null;
      hasMovedDuringDrag.current = false;
      return;
    }
    if (end > pickStart) {
      setPickEnd(end);
    } else {
      setPickEnd(pickStart);
      setPickStart(end);
    }
    setIsDragging(false);
    dragStartPoint.current = null;
    hasMovedDuringDrag.current = false;
  }

  function confirm() {
    if (!pickStart || !pickEnd || conflict || !me) return;
    const start = pickStart;
    const end = pickEnd;
    const id = editingId;
    clearSelection();
    onSave(start, end, id);
    if (!id && hasPaymentConfig) {
      setPaymentReview({ start, end });
    }
  }

  function editBooking(booking: Booking | null | undefined) {
    if (!booking) return;
    setActioningId(null);
    setEditingId(booking.id);
    setPickStart(booking.start);
    setPickEnd(booking.end);
    setResolvedNextRows(nextRowsNeededForIso(year, month, booking.end));
  }

  function hoverDate(iso: string) {
    const cell = cells.find((candidate) => candidate.iso === iso);
    if (cell?.virtualState === "preview") {
      const now = performance.now();
      if (now - lastRowRevealAt.current < ROW_REVEAL_DELAY_MS) return;
      lastRowRevealAt.current = now;
      setResolvedNextRows((value) =>
        Math.min(value + 1, maxNextRowsForMonth(year, month)),
      );
    }
    setHovered(iso);
  }

  function adjustStart(delta: number) {
    if (!pickStart) return;
    const newStart = shiftIsoDate(pickStart, delta);
    const end = pickEnd ?? pickStart;
    if (newStart > end) return;
    if (rangeOverlapsBookings(newStart, end, bookings, editingId)) return;
    setPickStart(newStart);
  }

  function adjustEnd(delta: number) {
    if (!pickStart) return;
    const current = pickEnd ?? pickStart;
    const newEnd = shiftIsoDate(current, delta);
    if (newEnd < pickStart) return;
    if (rangeOverlapsBookings(pickStart, newEnd, bookings, editingId)) return;
    setPickEnd(newEnd);
  }

  function canAdjustStart(delta: number): boolean {
    if (!pickStart) return false;
    const newStart = shiftIsoDate(pickStart, delta);
    const end = pickEnd ?? pickStart;
    if (newStart > end) return false;
    return !rangeOverlapsBookings(newStart, end, bookings, editingId);
  }

  function canAdjustEnd(delta: number): boolean {
    if (!pickStart) return false;
    const current = pickEnd ?? pickStart;
    const newEnd = shiftIsoDate(current, delta);
    if (newEnd < pickStart) return false;
    return !rangeOverlapsBookings(pickStart, newEnd, bookings, editingId);
  }

  useEffect(() => {
    if (!pickStart) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") cancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [pickStart, cancel]);

  useEffect(() => {
    if (!actioningId) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActioningId(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [actioningId]);

  useEffect(() => {
    if (!isDragging) return;
    const onUp = () => commitDragEnd();
    const onCancel = () => {
      setIsDragging(false);
      dragStartPoint.current = null;
      hasMovedDuringDrag.current = false;
    };
    const onMove = (event: PointerEvent) => {
      const point = dragStartPoint.current;
      if (point) {
        const distance = Math.hypot(event.clientX - point.x, event.clientY - point.y);
        if (distance >= DRAG_COMMIT_DISTANCE_PX) {
          hasMovedDuringDrag.current = true;
        }
      }
      const element = document.elementFromPoint(event.clientX, event.clientY);
      if (!element) return;
      let current: Element | null = element;
      while (current && !current.hasAttribute("data-iso")) {
        current = current.parentElement;
      }
      const iso = current?.getAttribute("data-iso");
      if (iso && iso !== hovered) hoverDate(iso);
    };
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("pointermove", onMove);
    return () => {
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("pointermove", onMove);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging, hovered, pickStart, pickEnd, cells]);

  return {
    cells,
    preview,
    previewRows,
    exitingPreviewRows,
    exitingPreviewAvatar,
    baseRowCount: baseCells.length / 7,
    scrollRows: resolvedNextRows,
    conflict,
    pickStart,
    pickEnd,
    isDragging,
    actioningId,
    setActioningId,
    editingId,
    paymentReview,
    setPaymentReview,
    setHovered: hoverDate,
    cancel,
    confirm,
    pickDate,
    editBooking,
    clearHovered: () => setHovered(null),
    adjustStart,
    adjustEnd,
    canAdjustStart,
    canAdjustEnd,
  };
}
