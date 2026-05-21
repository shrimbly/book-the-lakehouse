"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const SWIPE_DISTANCE_PX = 60;
const SWIPE_RATIO = 1.5; // |dx| must be at least this many times |dy|
const WHEEL_DISTANCE_PX = 120;
const WHEEL_INTENT_PX = 10;
const WHEEL_RATIO = 1.35;
const WHEEL_GESTURE_RESET_MS = 160;
const WHEEL_NAV_LOCK_MS = 700;

function monthHref(year: number, month: number): string {
  return `?m=${year}-${String(month + 1).padStart(2, "0")}`;
}

function adjacentMonth(
  year: number,
  month: number,
  direction: "next" | "prev",
): { year: number; month: number } {
  if (direction === "next") {
    return {
      year: month + 1 > 11 ? year + 1 : year,
      month: month + 1 > 11 ? 0 : month + 1,
    };
  }
  return {
    year: month - 1 < 0 ? year - 1 : year,
    month: month - 1 < 0 ? 11 : month - 1,
  };
}

function wheelPixels(event: WheelEvent): { dx: number; dy: number } {
  const multiplier = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 : 1;
  return {
    dx: event.deltaX * multiplier,
    dy: event.deltaY * multiplier,
  };
}

function shouldIgnoreGestureTarget(target: EventTarget | null): boolean {
  const element = target instanceof HTMLElement ? target : null;
  return !!element?.closest(
    [
      "a",
      "button",
      "input",
      "select",
      "textarea",
      "[role='dialog']",
      "[aria-modal='true']",
      "[data-noswipe]",
    ].join(","),
  );
}

export function MonthSwiper({
  year,
  month,
}: {
  year: number;
  month: number;
}) {
  const router = useRouter();

  // Warm the cache for the adjacent months so arrow / pill / swipe nav
  // lands on a prefetched RSC payload instead of a fresh server roundtrip.
  useEffect(() => {
    const next = adjacentMonth(year, month, "next");
    const prev = adjacentMonth(year, month, "prev");
    router.prefetch(monthHref(next.year, next.month));
    router.prefetch(monthHref(prev.year, prev.month));
  }, [year, month, router]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Touch devices only — desktop has its own arrow buttons / pills.
    if (!window.matchMedia("(pointer: coarse)").matches) return;

    let startX = 0;
    let startY = 0;
    let blocked = true;

    function onDown(e: PointerEvent) {
      if (e.pointerType !== "touch") return;
      startX = e.clientX;
      startY = e.clientY;
      const target = e.target as HTMLElement | null;
      // Don't hijack swipes that begin on calendar cells (drag-select)
      // or any element that opts out explicitly.
      blocked = !!(
        target?.closest("[data-iso]") || target?.closest("[data-noswipe]")
      );
    }

    function onUp(e: PointerEvent) {
      if (e.pointerType !== "touch") return;
      if (blocked) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.abs(dx) < SWIPE_DISTANCE_PX) return;
      if (Math.abs(dx) < Math.abs(dy) * SWIPE_RATIO) return;
      const target = adjacentMonth(year, month, dx < 0 ? "next" : "prev");
      router.push(monthHref(target.year, target.month));
    }

    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
    };
  }, [year, month, router]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const desktopPointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const desktopWidth = window.matchMedia("(min-width: 640px)");
    if (!desktopPointer.matches || !desktopWidth.matches) return;

    let accumulatedX = 0;
    let accumulatedY = 0;
    let lockedUntil = 0;
    let resetTimer: number | null = null;

    function resetGesture() {
      accumulatedX = 0;
      accumulatedY = 0;
      if (resetTimer != null) {
        window.clearTimeout(resetTimer);
        resetTimer = null;
      }
    }

    function scheduleReset() {
      if (resetTimer != null) window.clearTimeout(resetTimer);
      resetTimer = window.setTimeout(resetGesture, WHEEL_GESTURE_RESET_MS);
    }

    function pushMonth(direction: "next" | "prev") {
      const target = adjacentMonth(year, month, direction);
      router.push(monthHref(target.year, target.month));
      lockedUntil = window.performance.now() + WHEEL_NAV_LOCK_MS;
      resetGesture();
    }

    function onWheel(event: WheelEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (shouldIgnoreGestureTarget(event.target)) return;

      const { dx, dy } = wheelPixels(event);
      if (Math.abs(dx) < WHEEL_INTENT_PX) return;

      accumulatedX += dx;
      accumulatedY += dy;

      const horizontalIntent =
        Math.abs(accumulatedX) >= WHEEL_INTENT_PX &&
        Math.abs(accumulatedX) > Math.abs(accumulatedY) * WHEEL_RATIO;
      if (!horizontalIntent) {
        scheduleReset();
        return;
      }

      event.preventDefault();
      scheduleReset();

      if (window.performance.now() < lockedUntil) return;
      if (Math.abs(accumulatedX) < WHEEL_DISTANCE_PX) return;

      pushMonth(accumulatedX > 0 ? "next" : "prev");
    }

    window.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      window.removeEventListener("wheel", onWheel);
      resetGesture();
    };
  }, [year, month, router]);

  return null;
}
