"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const SWIPE_DISTANCE_PX = 60;
const SWIPE_RATIO = 1.5; // |dx| must be at least this many times |dy|

function monthHref(year: number, month: number): string {
  return `?m=${year}-${String(month + 1).padStart(2, "0")}`;
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
    const next = {
      y: month + 1 > 11 ? year + 1 : year,
      m: month + 1 > 11 ? 0 : month + 1,
    };
    const prev = {
      y: month - 1 < 0 ? year - 1 : year,
      m: month - 1 < 0 ? 11 : month - 1,
    };
    router.prefetch(monthHref(next.y, next.m));
    router.prefetch(monthHref(prev.y, prev.m));
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
      if (dx < 0) {
        const nm = month + 1 > 11 ? 0 : month + 1;
        const ny = month + 1 > 11 ? year + 1 : year;
        router.push(monthHref(ny, nm));
      } else {
        const nm = month - 1 < 0 ? 11 : month - 1;
        const ny = month - 1 < 0 ? year - 1 : year;
        router.push(monthHref(ny, nm));
      }
    }

    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
    };
  }, [year, month, router]);

  return null;
}
