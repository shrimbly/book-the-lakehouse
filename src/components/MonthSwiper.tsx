"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const SWIPE_DISTANCE_PX = 60;
const SWIPE_RATIO = 1.5; // |dx| must be at least this many times |dy|
const WHEEL_DISTANCE_PX = 120;
const WHEEL_INTENT_PX = 10;
const WHEEL_RATIO = 1.35;
const WHEEL_GESTURE_RESET_MS = 260;
const MONTH_NAV_LOCK_MS = 1200;
const MONTH_GESTURE_CLASS = "month-gesture-preview";
const MONTH_GESTURE_TRANSLATE_PX = 14;
const MONTH_GESTURE_BLUR_PX = 0.45;
const MONTH_GESTURE_RELEASE_MS = 300;
const MONTH_GESTURE_RELEASE_HOLD_MS = 100;
const MONTH_GESTURE_PAN_DELAY = 0.24;

let monthNavigationLockedUntil = 0;

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

function isMonthNavigationLocked(): boolean {
  return window.performance.now() < monthNavigationLockedUntil;
}

function lockMonthNavigation() {
  monthNavigationLockedUntil = window.performance.now() + MONTH_NAV_LOCK_MS;
}

function clampProgress(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function setGesturePreview(progress: number, direction = 0) {
  const main = mainElement();
  if (!main) return;
  const clamped = clampProgress(progress);
  main.classList.toggle(MONTH_GESTURE_CLASS, clamped > 0);
  if (clamped > 0) {
    const panProgress = clampProgress(
      (clamped - MONTH_GESTURE_PAN_DELAY) / (1 - MONTH_GESTURE_PAN_DELAY),
    );
    const translateProgress = panProgress ** 1.45;
    const blurProgress = 1 - (1 - clamped) ** 1.35;
    const signedDirection = direction < 0 ? -1 : 1;
    const translate =
      translateProgress * MONTH_GESTURE_TRANSLATE_PX * signedDirection;
    const blur = blurProgress * MONTH_GESTURE_BLUR_PX;
    main.style.setProperty("--month-gesture-x", `${translate.toFixed(2)}px`);
    main.style.setProperty("--month-gesture-blur", `${blur.toFixed(2)}px`);
  } else {
    main.style.removeProperty("--month-gesture-x");
    main.style.removeProperty("--month-gesture-blur");
  }
}

function mainElement(): HTMLElement | null {
  return document.querySelector("main") as HTMLElement | null;
}

function clearGesturePreview() {
  const main = mainElement();
  if (!main) return;
  main.classList.remove(MONTH_GESTURE_CLASS);
  main.style.removeProperty("--month-gesture-x");
  main.style.removeProperty("--month-gesture-blur");
}

function releaseThenNavigate(afterRelease: () => void): number[] {
  const releaseTimer = window.setTimeout(() => {
    const main = mainElement();
    if (!main) {
      afterRelease();
      return;
    }
    main.classList.add(MONTH_GESTURE_CLASS);
    main.style.setProperty("--month-gesture-x", "0px");
    main.style.setProperty("--month-gesture-blur", "0px");
  }, MONTH_GESTURE_RELEASE_HOLD_MS);
  const navigationTimer = window.setTimeout(() => {
    clearGesturePreview();
    afterRelease();
  }, MONTH_GESTURE_RELEASE_HOLD_MS + MONTH_GESTURE_RELEASE_MS);
  return [releaseTimer, navigationTimer];
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
    let navigationTimers: number[] = [];

    function onDown(e: PointerEvent) {
      if (e.pointerType !== "touch") return;
      startX = e.clientX;
      startY = e.clientY;
      setGesturePreview(0);
      blocked = shouldIgnoreGestureTarget(e.target);
    }

    function onMove(e: PointerEvent) {
      if (e.pointerType !== "touch") return;
      if (blocked) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const horizontalIntent = Math.abs(dx) > Math.abs(dy) * SWIPE_RATIO;
      if (horizontalIntent) e.preventDefault();
      setGesturePreview(
        horizontalIntent ? Math.abs(dx) / SWIPE_DISTANCE_PX : 0,
        dx,
      );
    }

    function onUp(e: PointerEvent) {
      if (e.pointerType !== "touch") return;
      if (blocked) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const shouldNavigate =
        Math.abs(dx) >= SWIPE_DISTANCE_PX &&
        Math.abs(dx) >= Math.abs(dy) * SWIPE_RATIO &&
        !isMonthNavigationLocked();
      if (!shouldNavigate) {
        setGesturePreview(0);
        return;
      }
      if (Math.abs(dx) < SWIPE_DISTANCE_PX) return;
      if (Math.abs(dx) < Math.abs(dy) * SWIPE_RATIO) return;
      const target = adjacentMonth(year, month, dx < 0 ? "next" : "prev");
      setGesturePreview(1, dx);
      lockMonthNavigation();
      navigationTimers = releaseThenNavigate(() => {
        router.push(monthHref(target.year, target.month));
      });
    }

    function onCancel(e: PointerEvent) {
      if (e.pointerType !== "touch") return;
      setGesturePreview(0);
    }

    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      navigationTimers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [year, month, router]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const desktopPointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const desktopWidth = window.matchMedia("(min-width: 640px)");
    if (!desktopPointer.matches || !desktopWidth.matches) return;

    let accumulatedX = 0;
    let accumulatedY = 0;
    let resetTimer: number | null = null;
    let navigationTimers: number[] = [];

    function resetGesture() {
      accumulatedX = 0;
      accumulatedY = 0;
      setGesturePreview(0);
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
      if (resetTimer != null) {
        window.clearTimeout(resetTimer);
        resetTimer = null;
      }
      accumulatedX = 0;
      accumulatedY = 0;
      setGesturePreview(1, direction === "next" ? -1 : 1);
      lockMonthNavigation();
      navigationTimers = releaseThenNavigate(() => {
        router.push(monthHref(target.year, target.month));
      });
    }

    function onWheel(event: WheelEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (shouldIgnoreGestureTarget(event.target)) return;

      const { dx, dy } = wheelPixels(event);
      if (Math.abs(dx) < WHEEL_INTENT_PX) return;

      const eventHasHorizontalIntent = Math.abs(dx) > Math.abs(dy) * WHEEL_RATIO;
      if (eventHasHorizontalIntent) event.preventDefault();
      if (eventHasHorizontalIntent && isMonthNavigationLocked()) return;

      accumulatedX += dx;
      accumulatedY += dy;

      const horizontalIntent =
        Math.abs(accumulatedX) >= WHEEL_INTENT_PX &&
        Math.abs(accumulatedX) > Math.abs(accumulatedY) * WHEEL_RATIO;
      if (!horizontalIntent) {
        scheduleReset();
        return;
      }

      setGesturePreview(
        Math.abs(accumulatedX) / WHEEL_DISTANCE_PX,
        accumulatedX > 0 ? -1 : 1,
      );
      scheduleReset();

      if (Math.abs(accumulatedX) < WHEEL_DISTANCE_PX) return;

      pushMonth(accumulatedX > 0 ? "next" : "prev");
    }

    window.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      window.removeEventListener("wheel", onWheel);
      if (resetTimer != null) window.clearTimeout(resetTimer);
      navigationTimers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [year, month, router]);

  return null;
}
