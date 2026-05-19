"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { Person } from "@/lib/data";
import {
  setIdentity,
  updateMyProfile,
  uploadProfileImage,
  removeProfileImage,
} from "@/app/actions";
import { PALETTE } from "@/lib/palette";

export function IdentityPicker({
  people,
  currentId,
}: {
  people: Person[];
  currentId: string;
}) {
  const [open, setOpen] = useState(false);
  const [renderMenu, setRenderMenu] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [view, setView] = useState<"profile" | "switch">("profile");

  useEffect(() => {
    if (open) {
      setRenderMenu(true);
      // Wait for the closed-state paint before flipping to visible so
      // the transition has something to interpolate from.
      const t = window.setTimeout(() => setMenuVisible(true), 0);
      return () => window.clearTimeout(t);
    }
    if (!renderMenu) return;
    setMenuVisible(false);
    const t = window.setTimeout(() => setRenderMenu(false), 220);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const [optimisticId, setOptimisticId] = useState(currentId);
  const [optimisticName, setOptimisticName] = useState<string | null>(null);
  const [optimisticColor, setOptimisticColor] = useState<string | null>(null);
  const [optimisticImageUrl, setOptimisticImageUrl] = useState<
    string | null | undefined
  >(undefined);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isPending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const baseCurrent =
    people.find((p) => p.id === optimisticId) ??
    people.find((p) => p.id === currentId) ??
    people[0];

  const current: Person = {
    ...baseCurrent,
    first: optimisticName ?? baseCurrent.first,
    color: optimisticColor ?? baseCurrent.color,
    initial: (optimisticName ?? baseCurrent.first).charAt(0).toUpperCase(),
    imageUrl:
      optimisticImageUrl === undefined
        ? baseCurrent.imageUrl
        : optimisticImageUrl,
  };

  useEffect(() => {
    setOptimisticName(null);
    setOptimisticColor(null);
    setOptimisticImageUrl(undefined);
  }, [baseCurrent.id, baseCurrent.first, baseCurrent.color, baseCurrent.imageUrl]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) setView("profile");
  }, [open]);

  useEffect(() => {
    if (!savedFlash) return;
    const t = setTimeout(() => setSavedFlash(false), 1400);
    return () => clearTimeout(t);
  }, [savedFlash]);

  function commitName(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed || trimmed === baseCurrent.first) return;
    setOptimisticName(trimmed);
    setError(null);
    startTransition(async () => {
      const result = await updateMyProfile({ first: trimmed });
      if ("error" in result) {
        setError(result.error);
        setOptimisticName(null);
      } else {
        setSavedFlash(true);
      }
    });
  }

  function pickColor(c: string) {
    if (c === baseCurrent.color) return;
    setOptimisticColor(c);
    setError(null);
    startTransition(async () => {
      const result = await updateMyProfile({ color: c });
      if ("error" in result) {
        setError(result.error);
        setOptimisticColor(null);
      } else {
        setSavedFlash(true);
      }
    });
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.currentTarget.files?.[0];
    e.currentTarget.value = "";
    if (!file) return;
    setError(null);
    // Local preview while the upload runs
    const localUrl = URL.createObjectURL(file);
    setOptimisticImageUrl(localUrl);
    setIsUploadingImage(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const result = await uploadProfileImage(formData);
      if ("error" in result) {
        setError(result.error);
        setOptimisticImageUrl(undefined);
      } else {
        setOptimisticImageUrl(result.url);
        setSavedFlash(true);
      }
    } catch {
      setError("Upload failed");
      setOptimisticImageUrl(undefined);
    } finally {
      setIsUploadingImage(false);
      URL.revokeObjectURL(localUrl);
    }
  }

  function handleRemoveImage() {
    setOptimisticImageUrl(null);
    setError(null);
    startTransition(async () => {
      const result = await removeProfileImage();
      if ("error" in result) {
        setError(result.error);
        setOptimisticImageUrl(undefined);
      } else {
        setSavedFlash(true);
      }
    });
  }

  function switchTo(id: string) {
    if (id === current.id) {
      setOpen(false);
      return;
    }
    setOptimisticId(id);
    setOpen(false);
    startTransition(async () => {
      await setIdentity(id);
    });
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="inline-flex items-center gap-2.5 rounded-full border border-rule py-1 pl-1.5 pr-3.5 text-[12px] transition-colors hover:border-ink data-[open=true]:border-ink"
        data-open={open}
      >
        <AvatarCircle person={current} size={26} fontSize={12} />
        <span>{current.first}</span>
        <span
          className={
            open
              ? "rotate-180 text-[10px] text-faint transition-transform"
              : "text-[10px] text-faint transition-transform"
          }
        >
          ▾
        </span>
      </button>

      {renderMenu ? (
        <div
          role="dialog"
          aria-label="Your profile"
          className="absolute right-0 top-[calc(100%+8px)] z-20 w-[304px] overflow-hidden rounded-[12px] border border-rule bg-paper shadow-[0_16px_40px_-16px_rgba(60,40,20,0.18),0_2px_4px_-2px_rgba(60,40,20,0.05)] origin-top-right"
          style={{
            opacity: menuVisible ? 1 : 0,
            transform: menuVisible
              ? "translateY(0) scale(1)"
              : "translateY(-6px) scale(0.96)",
            transition:
              "opacity 220ms cubic-bezier(0.22, 0.61, 0.36, 1), transform 220ms cubic-bezier(0.22, 0.61, 0.36, 1)",
          }}
        >
          {view === "profile" ? (
            <ProfileView
              current={current}
              error={error}
              savedFlash={savedFlash}
              isPending={isPending}
              isUploadingImage={isUploadingImage}
              nameInputRef={nameInputRef}
              fileInputRef={fileInputRef}
              onCommitName={commitName}
              onPickColor={pickColor}
              onFileChange={handleFileChange}
              onRemoveImage={handleRemoveImage}
              onOpenSwitch={() => setView("switch")}
            />
          ) : (
            <SwitchView
              people={people}
              currentId={current.id}
              isPending={isPending}
              onPick={switchTo}
              onBack={() => setView("profile")}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}

function ProfileView({
  current,
  error,
  savedFlash,
  isPending,
  isUploadingImage,
  nameInputRef,
  fileInputRef,
  onCommitName,
  onPickColor,
  onFileChange,
  onRemoveImage,
  onOpenSwitch,
}: {
  current: Person;
  error: string | null;
  savedFlash: boolean;
  isPending: boolean;
  isUploadingImage: boolean;
  nameInputRef: React.RefObject<HTMLInputElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onCommitName: (name: string) => void;
  onPickColor: (color: string) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: () => void;
  onOpenSwitch: () => void;
}) {
  return (
    <div className="p-5">
      <div className="mb-5 flex items-center gap-3.5">
        <AvatarCircle person={current} size={52} fontSize={20} />
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.16em] text-faint">
            You
          </div>
          <div className="truncate text-[15px] font-medium">{current.first}</div>
        </div>
      </div>

      <Section label="Your name">
        <input
          ref={nameInputRef}
          type="text"
          key={current.first}
          defaultValue={current.first}
          onBlur={(e) => onCommitName(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.currentTarget.blur();
            } else if (e.key === "Escape") {
              e.currentTarget.value = current.first;
              e.currentTarget.blur();
            }
          }}
          maxLength={64}
          className="w-full rounded-[8px] border border-rule bg-paper px-3 py-2 text-[13px] font-medium tracking-[-0.005em] transition-colors focus:border-ink focus:outline-none"
        />
      </Section>

      <Section label="Colour">
        <div className="grid grid-cols-6 gap-2">
          {PALETTE.map((c) => {
            const isSelected = c === current.color;
            return (
              <button
                key={c}
                type="button"
                onClick={() => onPickColor(c)}
                aria-label={`color ${c}`}
                aria-pressed={isSelected}
                className="grid h-[28px] w-[28px] place-items-center"
              >
                <span
                  className="h-[24px] w-[24px] rounded-full transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c,
                    boxShadow: isSelected
                      ? `0 0 0 2px var(--color-paper), 0 0 0 3.5px ${c}`
                      : undefined,
                  }}
                />
              </button>
            );
          })}
        </div>
      </Section>

      <Section label="Profile photo">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={onFileChange}
        />
        {current.imageUrl ? (
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current.imageUrl}
              alt=""
              className="h-[44px] w-[44px] shrink-0 rounded-full object-cover"
            />
            <button
              type="button"
              disabled={isUploadingImage}
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 rounded-[8px] border border-rule px-3 py-1.5 text-[12px] text-ink transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isUploadingImage ? "Uploading…" : "Replace"}
            </button>
            <button
              type="button"
              disabled={isUploadingImage || isPending}
              onClick={onRemoveImage}
              className="rounded-[8px] px-2 py-1.5 text-[12px] text-muted transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Remove image"
            >
              Remove
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={isUploadingImage}
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full items-center gap-3 rounded-[8px] border border-dashed border-rule px-3 py-2.5 text-left text-[12px] text-muted transition-colors hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="grid h-[24px] w-[24px] place-items-center rounded-full border border-dashed border-rule text-[14px] leading-none text-faint">
              +
            </span>
            <span className="flex-1">
              {isUploadingImage ? "Uploading…" : "Add a photo"}
            </span>
          </button>
        )}
      </Section>

      <div className="-mt-1 mb-2 flex h-[16px] items-center text-[11px]">
        {error ? (
          <span className="italic text-faint">{error}</span>
        ) : savedFlash ? (
          <span className="text-muted">Saved</span>
        ) : isPending || isUploadingImage ? (
          <span className="text-muted">Saving…</span>
        ) : null}
      </div>

      <div className="-mx-2 border-t border-soft pt-2">
        <button
          type="button"
          onClick={onOpenSwitch}
          className="flex w-full items-center justify-between rounded-[8px] px-2 py-2 text-left text-[12px] text-muted transition-colors hover:bg-soft hover:text-ink"
        >
          <span>
            Not {current.first}? <span className="text-faint">Switch person</span>
          </span>
          <span className="text-[14px] leading-none text-faint">›</span>
        </button>
      </div>
    </div>
  );
}

function SwitchView({
  people,
  currentId,
  isPending,
  onPick,
  onBack,
}: {
  people: Person[];
  currentId: string;
  isPending: boolean;
  onPick: (id: string) => void;
  onBack: () => void;
}) {
  return (
    <div className="p-2">
      <button
        type="button"
        onClick={onBack}
        className="mb-1 flex w-full items-center gap-2 rounded-[6px] px-2 py-1.5 text-[12px] text-muted transition-colors hover:bg-soft hover:text-ink"
      >
        <span className="text-[14px] leading-none">‹</span>
        <span>Back</span>
      </button>
      <div className="mx-2 my-1 h-px bg-soft" />
      <div className="px-2 pb-2 pt-1 text-[10px] uppercase tracking-[0.14em] text-faint">
        Switch to
      </div>
      <div className="max-h-[280px] overflow-y-auto">
        {people.map((p) => {
          const isMe = p.id === currentId;
          return (
            <button
              key={p.id}
              type="button"
              disabled={isPending}
              onClick={() => onPick(p.id)}
              className="flex w-full items-center gap-2.5 rounded-[6px] px-2 py-1.5 text-left text-[12px] transition-colors hover:bg-soft disabled:cursor-not-allowed disabled:opacity-50"
            >
              <AvatarCircle person={p} size={26} fontSize={11} />
              <span className="flex-1 font-medium">{p.first}</span>
              {isMe ? (
                <span
                  className="h-[6px] w-[6px] rounded-full"
                  style={{ backgroundColor: p.color }}
                  aria-hidden
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AvatarCircle({
  person,
  size,
  fontSize,
}: {
  person: Person;
  size: number;
  fontSize: number;
}) {
  if (person.imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={person.imageUrl}
        alt=""
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full font-medium text-paper transition-colors"
      style={{
        width: size,
        height: size,
        fontSize,
        backgroundColor: person.color,
      }}
    >
      {person.initial}
    </span>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <div className="mb-2 text-[10px] uppercase tracking-[0.16em] text-faint">
        {label}
      </div>
      {children}
    </div>
  );
}
