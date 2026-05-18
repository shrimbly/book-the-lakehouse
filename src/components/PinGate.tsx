"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { unlockPin } from "@/app/actions";

const LENGTH = 4;

export function PinGate() {
  const [digits, setDigits] = useState<string[]>(Array(LENGTH).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  function submit(pin: string) {
    setError(null);
    startTransition(async () => {
      const result = await unlockPin(pin);
      if ("error" in result) {
        setError(result.error);
        setDigits(Array(LENGTH).fill(""));
        refs.current[0]?.focus();
      }
    });
  }

  function handleChange(index: number, raw: string) {
    const v = raw.replace(/\D/g, "");
    if (!v) {
      const next = [...digits];
      next[index] = "";
      setDigits(next);
      return;
    }
    // Support paste of full pin
    if (v.length === LENGTH) {
      const arr = v.split("");
      setDigits(arr);
      submit(v);
      refs.current[LENGTH - 1]?.blur();
      return;
    }
    const d = v.slice(-1);
    const next = [...digits];
    next[index] = d;
    setDigits(next);
    setError(null);
    if (index < LENGTH - 1) {
      refs.current[index + 1]?.focus();
    } else if (next.every((x) => x !== "")) {
      submit(next.join(""));
    }
  }

  function handleKeyDown(
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) {
    if (e.key === "Backspace") {
      if (digits[index]) return;
      if (index === 0) return;
      e.preventDefault();
      const next = [...digits];
      next[index - 1] = "";
      setDigits(next);
      refs.current[index - 1]?.focus();
    } else if (e.key === "ArrowLeft" && index > 0) {
      refs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < LENGTH - 1) {
      refs.current[index + 1]?.focus();
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12 sm:py-20">
      <div className="w-full max-w-[360px]">
        <div
          className="mb-8 sm:mb-12 flex items-center text-[12px] text-muted animate-blur-fade"
          style={{ animationDelay: "0ms" }}
        >
          <span className="mr-2 inline-block h-[5px] w-[5px] -translate-y-[1px] rounded-full bg-ink" />
          Kuratau Bach
        </div>
        <h1
          className="m-0 mb-2 text-[36px] sm:text-[44px] font-semibold leading-[0.95] tracking-[-0.04em] animate-blur-fade"
          style={{ animationDelay: "80ms" }}
        >
          What&rsquo;s the pin?
        </h1>
        <p
          className="mb-7 sm:mb-9 text-[14px] text-muted animate-blur-fade"
          style={{ animationDelay: "160ms" }}
        >
          Four digits to enter.
        </p>
        <div
          className="flex gap-2 sm:gap-3 animate-blur-fade"
          style={{ animationDelay: "240ms" }}
        >
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={LENGTH}
              value={d}
              disabled={isPending}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className="h-[60px] w-[52px] sm:h-[68px] sm:w-[60px] rounded-[10px] border border-rule bg-paper text-center text-[28px] sm:text-[32px] font-medium tabular-nums tracking-[-0.02em] transition-colors focus:border-ink focus:outline-none disabled:opacity-50"
              aria-label={`digit ${i + 1}`}
            />
          ))}
        </div>
        <div className="mt-4 text-[12px] leading-tight min-h-[18px]">
          {error ? (
            <span className="italic text-faint">{error}</span>
          ) : isPending ? (
            <span className="text-muted">Unlocking…</span>
          ) : null}
        </div>
      </div>
    </main>
  );
}
