"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { Person } from "@/lib/data";
import { setIdentity } from "@/app/actions";
import { siteName } from "@/lib/site";
import { AddPersonForm } from "./AddPersonForm";
import { ThemeToggle } from "./ThemeToggle";

const ADD_PERSON_PANEL_ANIMATION_MS = 420;

export function IdentityOnboarding({ people }: { people: Person[] }) {
  const [isPending, startTransition] = useTransition();
  const [pickingId, setPickingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addPanelState, setAddPanelState] = useState<
    "closed" | "opening" | "closing"
  >("closed");
  const addPanelRef = useRef<HTMLDivElement>(null);
  const adding = addPanelState !== "closed";

  useEffect(() => {
    if (addPanelState !== "opening") return;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const behavior = prefersReducedMotion ? "auto" : "smooth";
    const revealPageBottom = () => {
      const page = document.scrollingElement ?? document.documentElement;
      page.scrollTo({ top: page.scrollHeight, behavior });
    };
    const settledTimer = window.setTimeout(revealPageBottom, 460);
    return () => {
      window.clearTimeout(settledTimer);
    };
  }, [addPanelState]);

  useEffect(() => {
    if (addPanelState !== "closing") return;
    const timer = window.setTimeout(
      () => setAddPanelState("closed"),
      ADD_PERSON_PANEL_ANIMATION_MS,
    );
    return () => window.clearTimeout(timer);
  }, [addPanelState]);

  function pick(id: string) {
    if (isPending) return;
    setPickingId(id);
    setError(null);
    startTransition(async () => {
      const result = await setIdentity(id);
      if ("error" in result) {
        setError(result.error);
        setPickingId(null);
      }
    });
  }

  function closeAddPersonPanel() {
    setAddPanelState((current) =>
      current === "closed" ? "closed" : "closing",
    );
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12 sm:py-20">
      <div className="w-full max-w-[420px]">
        <div
          className="mb-8 sm:mb-12 flex items-center justify-between text-[12px] text-muted animate-blur-fade"
          style={{ animationDelay: "0ms" }}
        >
          <span>
            <span className="mr-2 inline-block h-[5px] w-[5px] -translate-y-[1px] rounded-full bg-ink" />
            {siteName}
          </span>
          <ThemeToggle />
        </div>
        <h1
          className="m-0 mb-2 text-[44px] sm:text-[56px] font-semibold leading-[0.95] tracking-[-0.04em] animate-blur-fade"
          style={{ animationDelay: "80ms" }}
        >
          Welcome
        </h1>
        <p
          className="mb-8 sm:mb-10 text-[14px] text-muted animate-blur-fade"
          style={{ animationDelay: "160ms" }}
        >
          Who&rsquo;s booking?
        </p>
        <div className="space-y-1">
          {people.map((p, i) => {
            const isPicking = pickingId === p.id && isPending;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => pick(p.id)}
                disabled={isPending}
                style={{ animationDelay: `${240 + i * 35}ms` }}
                className="flex w-full items-center gap-3 rounded-[10px] border border-rule bg-paper/70 px-3 py-2.5 text-left shadow-control transition-all hover:border-ink disabled:cursor-not-allowed disabled:opacity-50 animate-blur-fade"
              >
                {p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.imageUrl}
                    alt=""
                    className="h-9 w-9 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <span
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[13px] font-semibold text-[#faf8f4]"
                    style={{ backgroundColor: p.color }}
                  >
                    {p.initial}
                  </span>
                )}
                <span className="flex-1 text-[14px] font-medium">
                  {p.first}
                </span>
                {isPicking ? (
                  <span className="text-[11px] text-muted">setting…</span>
                ) : null}
              </button>
            );
          })}
        </div>
        <div
          style={{ animationDelay: `${240 + people.length * 35}ms` }}
          className="animate-blur-fade"
        >
          {adding ? (
            <div
              ref={addPanelRef}
              className={[
                "identity-add-person-panel mt-3 overflow-hidden rounded-[10px] border border-dashed border-rule",
                addPanelState === "closing"
                  ? "identity-add-person-panel-closing"
                  : "",
              ].join(" ")}
            >
              <div className="identity-onboarding-add-person p-3">
                <AddPersonForm
                  adaptiveEmptyInitial
                  nameFocusDelayMs={460}
                  onCancel={closeAddPersonPanel}
                  onCreated={(id) => pick(id)}
                />
              </div>
            </div>
          ) : (
            <button
              type="button"
              disabled={isPending}
              onClick={() => setAddPanelState("opening")}
              className="mt-3 flex w-full items-center gap-3 rounded-[10px] border border-dashed border-rule bg-paper/70 px-3 py-2.5 text-left text-[13px] text-muted shadow-control transition-colors hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="grid h-9 w-9 place-items-center rounded-full border border-dashed border-rule text-[16px] font-medium text-faint shrink-0">
                +
              </span>
              <span className="flex-1">Add someone</span>
            </button>
          )}
        </div>
        {error ? (
          <p className="mt-4 text-[12px] italic text-faint">{error}</p>
        ) : null}
      </div>
    </main>
  );
}
