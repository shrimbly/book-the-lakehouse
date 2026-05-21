"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import type { Person } from "@/lib/data";
import {
  setIdentity,
  updateMyProfile,
  uploadProfileImage,
  removeProfileImage,
} from "@/app/actions";
import { PALETTE } from "@/lib/palette";
import { Pencil } from "lucide-react";
import { AddPersonForm } from "./AddPersonForm";
import { AvatarPhotoEditor } from "./AvatarPhotoEditor";

export function IdentityPicker({
  people,
  currentId,
  showMaryMode = false,
}: {
  people: Person[];
  currentId: string;
  showMaryMode?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [renderMenu, setRenderMenu] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [view, setView] = useState<"profile" | "switch" | "add">("profile");
  const [viewVisible, setViewVisible] = useState(true);
  const viewTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (open) {
      const renderTimer = window.setTimeout(() => setRenderMenu(true), 0);
      // Wait for the closed-state paint before flipping to visible so
      // the transition has something to interpolate from.
      const visibleTimer = window.setTimeout(() => setMenuVisible(true), 16);
      return () => {
        window.clearTimeout(renderTimer);
        window.clearTimeout(visibleTimer);
      };
    }
    if (!renderMenu) return;
    const hideTimer = window.setTimeout(() => setMenuVisible(false), 0);
    const unmountTimer = window.setTimeout(() => setRenderMenu(false), 220);
    return () => {
      window.clearTimeout(hideTimer);
      window.clearTimeout(unmountTimer);
    };
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
    const t = window.setTimeout(() => {
      setOptimisticName(null);
      setOptimisticColor(null);
      setOptimisticImageUrl(undefined);
    }, 0);
    return () => window.clearTimeout(t);
  }, [
    baseCurrent.id,
    baseCurrent.first,
    baseCurrent.color,
    baseCurrent.imageUrl,
  ]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (
        e.target instanceof Element &&
        e.target.closest("[data-profile-photo-dialog]")
      ) {
        return;
      }
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer, { capture: true });
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer, { capture: true });
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (open) return;
    const t = window.setTimeout(() => {
      setView("profile");
      setViewVisible(true);
    }, 220);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    return () => {
      if (viewTimerRef.current) window.clearTimeout(viewTimerRef.current);
    };
  }, []);

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

  async function handlePhotoSave(processed: Blob) {
    setError(null);

    const localUrl = URL.createObjectURL(processed);
    setOptimisticImageUrl(localUrl);
    setIsUploadingImage(true);
    const formData = new FormData();
    formData.append(
      "file",
      new File([processed], "profile.jpg", { type: "image/jpeg" }),
    );
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

  function showView(nextView: "profile" | "switch" | "add") {
    if (nextView === view) return;
    if (viewTimerRef.current) window.clearTimeout(viewTimerRef.current);
    setViewVisible(false);
    viewTimerRef.current = window.setTimeout(() => {
      setView(nextView);
      window.requestAnimationFrame(() => setViewVisible(true));
    }, 140);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Edit profile for ${current.first}`}
        className="inline-flex h-[34px] items-center gap-2 rounded-full border border-rule bg-paper/70 py-1 pl-1 pr-3 text-[13px] leading-none shadow-control transition-colors hover:border-ink data-[open=true]:border-ink"
        data-open={open}
      >
        <AvatarCircle person={current} size={26} fontSize={12} />
        <span>{current.first}</span>
      </button>

      {renderMenu ? (
        <div
          role="dialog"
          aria-label="Your profile"
          className="absolute right-0 top-[calc(100%+8px)] z-20 w-[304px] overflow-hidden rounded-[12px] border border-rule bg-paper shadow-card origin-top-right"
          style={{
            opacity: menuVisible ? 1 : 0,
            transform: menuVisible
              ? "translateY(0) scale(1)"
              : "translateY(-6px) scale(0.96)",
            transition:
              "opacity 220ms cubic-bezier(0.22, 0.61, 0.36, 1), transform 220ms cubic-bezier(0.22, 0.61, 0.36, 1)",
          }}
        >
          <div
            style={{
              opacity: viewVisible ? 1 : 0,
              transform: viewVisible ? "translateX(0)" : "translateX(-8px)",
              transition:
                "opacity 140ms cubic-bezier(0.4, 0, 0.6, 1), transform 140ms cubic-bezier(0.4, 0, 0.6, 1)",
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
                onCommitName={commitName}
                onPickColor={pickColor}
                onPhotoSave={handlePhotoSave}
                onRemoveImage={handleRemoveImage}
                onOpenSwitch={() => showView("switch")}
                showMaryMode={showMaryMode}
                onClose={() => setOpen(false)}
              />
            ) : (
              view === "switch" ? (
                <SwitchView
                  people={people}
                  currentId={current.id}
                  isPending={isPending}
                  onPick={switchTo}
                  onAdd={() => showView("add")}
                  onBack={() => showView("profile")}
                />
              ) : (
                <AddView
                  onBack={() => showView("switch")}
                  onCreated={(id) => {
                    setOptimisticId(id);
                    setOpen(false);
                  }}
                />
              )
            )}
          </div>
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
  onCommitName,
  onPickColor,
  onPhotoSave,
  onRemoveImage,
  onOpenSwitch,
  showMaryMode,
  onClose,
}: {
  current: Person;
  error: string | null;
  savedFlash: boolean;
  isPending: boolean;
  isUploadingImage: boolean;
  nameInputRef: React.RefObject<HTMLInputElement | null>;
  onCommitName: (name: string) => void;
  onPickColor: (color: string) => void;
  onPhotoSave: (blob: Blob) => Promise<void>;
  onRemoveImage: () => void;
  onOpenSwitch: () => void;
  showMaryMode: boolean;
  onClose: () => void;
}) {
  const [isEditingName, setIsEditingName] = useState(false);

  useEffect(() => {
    if (!isEditingName) return;
    const id = window.requestAnimationFrame(() => {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    });
    return () => window.cancelAnimationFrame(id);
  }, [isEditingName, nameInputRef]);

  return (
    <div className="p-5">
      <div className="mb-5 flex items-center gap-3.5">
        <AvatarPhotoEditor
          initial={current.initial}
          color={current.color}
          imageUrl={current.imageUrl}
          size="compact"
          disabled={isPending}
          isSaving={isUploadingImage}
          onSave={onPhotoSave}
          onRemove={onRemoveImage}
        />
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.16em] text-faint">
            You
          </div>
          <button
            type="button"
            onClick={() => setIsEditingName((value) => !value)}
            className="group mt-0.5 inline-flex max-w-full items-center gap-1.5 text-left text-[17px] font-medium tracking-[-0.005em] underline decoration-transparent decoration-[1px] underline-offset-[3px] transition-colors hover:decoration-ink focus:outline-none focus-visible:decoration-ink sm:text-[15px]"
          >
            <span className="truncate">{current.first}</span>
            <Pencil
              size={13}
              strokeWidth={1.8}
              className="shrink-0 text-ink opacity-0 [filter:blur(10px)] transition-[opacity,filter,transform] duration-[260ms] ease-[cubic-bezier(0.16,0.84,0.44,1)] group-hover:translate-x-0.5 group-hover:opacity-100 group-hover:[filter:blur(0)] group-focus-visible:translate-x-0.5 group-focus-visible:opacity-100 group-focus-visible:[filter:blur(0)]"
              aria-hidden
            />
          </button>
        </div>
      </div>

      <div
        className="grid transition-[grid-template-rows,opacity,filter,margin] duration-[260ms] ease-[cubic-bezier(0.16,0.84,0.44,1)]"
        style={{
          gridTemplateRows: isEditingName ? "1fr" : "0fr",
          opacity: isEditingName ? 1 : 0,
          filter: isEditingName ? "blur(0)" : "blur(8px)",
          marginBottom: isEditingName ? 16 : 0,
        }}
      >
        <div className="min-h-0 overflow-hidden">
          <Section label="Your name">
            <input
              ref={nameInputRef}
              type="text"
              key={current.first}
              defaultValue={current.first}
              onBlur={(e) => {
                onCommitName(e.currentTarget.value);
                setIsEditingName(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.currentTarget.blur();
                } else if (e.key === "Escape") {
                  e.currentTarget.value = current.first;
                  setIsEditingName(false);
                  e.currentTarget.blur();
                }
              }}
              maxLength={64}
              className="w-full rounded-[8px] border border-rule bg-paper px-3 py-2 text-[13px] font-medium tracking-[-0.005em] transition-colors focus:border-ink focus:outline-none"
            />
          </Section>
        </div>
      </div>

      <Section label="Colour">
        <div className="grid w-full grid-cols-6 justify-items-center gap-x-2 gap-y-1">
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
        <div className="px-2 pb-1 text-[10px] uppercase tracking-[0.14em] text-faint">
          Other
        </div>
        <button
          type="button"
          onClick={onOpenSwitch}
          className="mb-1 flex w-full items-center justify-between rounded-[8px] px-2 py-2 text-left text-[12px] text-muted transition-colors hover:bg-soft hover:text-ink"
        >
          <span>Switch person</span>
          <span className="text-[14px] leading-none text-faint">›</span>
        </button>
        {showMaryMode ? (
          <Link
            href="/mary"
            onClick={onClose}
            className="flex w-full items-center justify-between rounded-[8px] px-2 py-2 text-left text-[12px] text-muted transition-colors hover:bg-soft hover:text-ink"
          >
            <span>Mary mode</span>
            <span className="text-[14px] leading-none text-faint">›</span>
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function SwitchView({
  people,
  currentId,
  isPending,
  onPick,
  onAdd,
  onBack,
}: {
  people: Person[];
  currentId: string;
  isPending: boolean;
  onPick: (id: string) => void;
  onAdd: () => void;
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
      <div className="mx-2 my-1 h-px bg-soft" />
      <button
        type="button"
        disabled={isPending}
        onClick={onAdd}
        className="flex w-full items-center gap-2.5 rounded-[6px] px-2 py-1.5 text-left text-[12px] text-muted transition-colors hover:bg-soft hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full border border-dashed border-rule text-[14px] text-faint">
          +
        </span>
        <span className="flex-1 font-medium">Add someone</span>
      </button>
    </div>
  );
}

function AddView({
  onBack,
  onCreated,
}: {
  onBack: () => void;
  onCreated: (id: string) => void;
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
        Add someone
      </div>
      <div className="px-2 pb-2">
        <AddPersonForm compact onCancel={onBack} onCreated={onCreated} />
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
        className="block shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full font-medium leading-none text-[#faf8f4] transition-colors"
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
