"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { FormEvent } from "react";
import { createPerson, uploadProfileImage } from "@/app/actions";
import { PALETTE } from "@/lib/palette";
import { AvatarPhotoEditor } from "./AvatarPhotoEditor";

export function AddPersonForm({
  compact = false,
  nameFocusDelayMs = 0,
  adaptiveEmptyInitial = false,
  onCancel,
  onCreated,
}: {
  compact?: boolean;
  nameFocusDelayMs?: number;
  adaptiveEmptyInitial?: boolean;
  onCancel: () => void;
  onCreated: (id: string) => void;
}) {
  const [first, setFirst] = useState("");
  const [color, setColor] = useState<string | undefined>(undefined);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      nameInputRef.current?.focus({ preventScroll: true });
    }, nameFocusDelayMs);
    return () => window.clearTimeout(timer);
  }, [nameFocusDelayMs]);

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!first.trim()) {
      setError("Name can't be empty");
      return;
    }
    startTransition(async () => {
      const result = await createPerson({ first, color });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      if (photoBlob) {
        const formData = new FormData();
        formData.append(
          "file",
          new File([photoBlob], "profile.jpg", { type: "image/jpeg" }),
        );
        const imageResult = await uploadProfileImage(formData);
        if ("error" in imageResult) {
          setError(`Added, but photo wasn't saved: ${imageResult.error}`);
          return;
        }
      }
      onCreated(result.id);
    });
  }

  return (
    <form
      onSubmit={submit}
      className={compact ? "rounded-[8px] bg-soft/35 p-2" : "space-y-4"}
    >
      <div className="pl-1.5 text-[14px] font-medium tracking-[-0.005em]">
        Add your profile
      </div>
      <div className="grid grid-cols-[84px_minmax(0,1fr)] items-start gap-3">
        <div className="justify-self-center pt-2">
          <AvatarPhotoEditor
            initial={(first.trim().charAt(0) || "+").toUpperCase()}
            color={color ?? "var(--color-muted)"}
            initialClassName={
              adaptiveEmptyInitial && !color ? "text-ink" : "text-[#faf8f4]"
            }
            disabled={isPending}
            size="compact"
            onDraftChange={(draft) => setPhotoBlob(draft?.blob ?? null)}
          />
        </div>
        <div className="min-w-0 space-y-3 pt-1 pr-2">
          <label className="block">
            <span className="mb-1.5 block text-[10px] uppercase tracking-[0.14em] text-faint">
              Name
            </span>
            <input
              ref={nameInputRef}
              value={first}
              onChange={(e) => setFirst(e.currentTarget.value)}
              maxLength={64}
              placeholder="First name"
              disabled={isPending}
              className="w-full rounded-[8px] border border-rule bg-paper px-3 py-2 text-[13px] font-medium tracking-[-0.005em] transition-colors placeholder:text-faint focus:border-ink focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            />
          </label>

          <div>
            <div className="mb-1.5 text-[10px] uppercase tracking-[0.14em] text-faint">
              Colour
            </div>
            <div className="grid w-full grid-cols-6 justify-items-center gap-x-2 gap-y-1">
              {PALETTE.slice(0, compact ? 6 : PALETTE.length).map((c) => {
                const selected = c === color;
                return (
                  <button
                    key={c}
                    type="button"
                    disabled={isPending}
                    onClick={() => setColor(selected ? undefined : c)}
                    aria-label={`color ${c}`}
                    aria-pressed={selected}
                    className="grid h-[26px] w-[26px] place-items-center disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span
                      className="h-[20px] w-[20px] rounded-full transition-transform hover:scale-110"
                      style={{
                        backgroundColor: c,
                        boxShadow: selected
                          ? `0 0 0 2px var(--color-paper), 0 0 0 3.5px ${c}`
                          : undefined,
                      }}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[84px_minmax(0,1fr)] gap-3">
        <div />
        <div className="min-h-[18px] pr-2 text-[11px] leading-tight">
          {error ? <span className="italic text-faint">{error}</span> : null}
        </div>
      </div>

      <div className="flex justify-end gap-2 pr-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="rounded-full px-3 py-1.5 text-[12px] font-medium text-muted transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-ink px-3.5 py-1.5 text-[12px] font-medium text-paper shadow-control transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-35"
        >
          {isPending ? "Adding..." : "Add"}
        </button>
      </div>
    </form>
  );
}
