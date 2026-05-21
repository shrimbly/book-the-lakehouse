"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import type { Person } from "@/lib/data";

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const DOW_SUN_FIRST = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const EXIT_ANIMATION_MS = 180;

export function fmtDay(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  return `${DOW_SUN_FIRST[date.getDay()]} ${date.getDate()} ${
    MONTH_SHORT[date.getMonth()]
  }`;
}

export function useAnimatedClose(onClose: () => void): {
  isClosing: boolean;
  close: () => void;
  closeWith: (afterClose: () => void) => void;
} {
  const [isClosing, setIsClosing] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  function runClose(afterClose: () => void) {
    if (isClosing) return;
    setIsClosing(true);
    timerRef.current = window.setTimeout(afterClose, EXIT_ANIMATION_MS);
  }

  return {
    isClosing,
    close: () => runClose(onClose),
    closeWith: runClose,
  };
}

export function CloseIconButton({
  onClick,
  className = "",
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Close"
      className={[
        "pointer-events-auto grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-soft hover:text-ink",
        className,
      ].join(" ")}
    >
      <X size={14} strokeWidth={2.25} />
    </button>
  );
}

export function PersonChip({ person }: { person: Person }) {
  if (person.imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={person.imageUrl}
        alt=""
        className="h-[30px] w-[30px] sm:h-[34px] sm:w-[34px] shrink-0 rounded-[5px] sm:rounded-[6px] object-cover"
      />
    );
  }

  return (
    <div
      className="grid h-[30px] w-[30px] sm:h-[34px] sm:w-[34px] shrink-0 place-items-center rounded-[5px] sm:rounded-[6px] text-[11px] sm:text-[12px] font-semibold text-paper"
      style={{ backgroundColor: person.color }}
    >
      {person.initial}
    </div>
  );
}

export function OverlayBackdrop({
  onPointerDown,
  isClosing,
  zIndexClass = "z-20",
}: {
  onPointerDown: () => void;
  isClosing: boolean;
  zIndexClass?: string;
}) {
  return (
    <div
      aria-hidden
      onPointerDown={onPointerDown}
      className={[
        `fixed inset-0 ${zIndexClass} bg-ink/35`,
        isClosing ? "animate-backdrop-fade-out" : "animate-backdrop-fade",
      ].join(" ")}
    />
  );
}

export function BottomOverlayShell({
  children,
  isClosing,
  zIndexClass = "z-30",
}: {
  children: ReactNode;
  isClosing: boolean;
  zIndexClass?: string;
}) {
  return (
    <div
      className={[
        `pointer-events-none fixed inset-x-0 bottom-10 sm:bottom-14 ${zIndexClass} flex justify-center px-3 sm:px-4`,
        isClosing ? "animate-toast-pop-out" : "animate-toast-pop",
      ].join(" ")}
    >
      {children}
    </div>
  );
}
