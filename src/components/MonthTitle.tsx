"use client";

import { useEffect, useState } from "react";

// Cross-fades between month names so the swap doesn't feel abrupt.
// The outgoing label stays mounted briefly (absolutely positioned over
// the incoming one) and runs a blur-fade-out animation while the
// incoming label runs blur-fade-flat.
export function MonthTitle({
  month,
  months,
  className,
}: {
  month: number;
  months: string[];
  className?: string;
}) {
  const [current, setCurrent] = useState(month);
  const [outgoing, setOutgoing] = useState<number | null>(null);

  // Detect the prop change and snapshot the outgoing label.
  useEffect(() => {
    if (month === current) return;
    setOutgoing(current);
    setCurrent(month);
  }, [month, current]);

  // Schedule the outgoing label's removal on its own effect so the
  // timeout isn't cancelled by the unrelated state changes above.
  useEffect(() => {
    if (outgoing === null) return;
    const t = window.setTimeout(() => setOutgoing(null), 520);
    return () => window.clearTimeout(t);
  }, [outgoing]);

  return (
    <h1 className={`relative m-0 inline-block ${className ?? ""}`}>
      {/* Reserve layout for the current label; outgoing overlays it. */}
      <span
        key={`cur-${current}`}
        className="block"
        style={{
          animation:
            "blur-fade-flat 720ms cubic-bezier(0.16, 0.84, 0.44, 1) both",
        }}
      >
        {months[current]}
      </span>
      {outgoing !== null ? (
        <span
          key={`out-${outgoing}`}
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            animation:
              "blur-fade-out 480ms cubic-bezier(0.4, 0, 0.6, 1) both",
          }}
        >
          {months[outgoing]}
        </span>
      ) : null}
    </h1>
  );
}
