"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { calculateProfilePreviewFrame, processProfileImage } from "@/lib/image";

const ACCEPTED_IMAGE_TYPES = "image/jpeg,image/png,image/webp,image/gif";

type DraftPhoto = { blob: Blob; url: string };

export function AvatarPhotoEditor({
  initial,
  color,
  imageUrl,
  disabled = false,
  isSaving = false,
  size = "normal",
  onDraftChange,
  onSave,
  onRemove,
}: {
  initial: string;
  color: string;
  imageUrl?: string | null;
  disabled?: boolean;
  isSaving?: boolean;
  size?: "compact" | "normal";
  onDraftChange?: (draft: DraftPhoto | null) => void;
  onSave?: (blob: Blob) => Promise<void> | void;
  onRemove?: () => void;
}) {
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [sourceSize, setSourceSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [draftUrl, setDraftUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [isCropping, setIsCropping] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const closeTimerRef = useRef<number | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  const avatarSize = size === "compact" ? 72 : 78;
  const isBusy = disabled || isSaving || isCropping;
  const shownImageUrl = draftUrl ?? imageUrl;
  const isAddPlaceholder = !shownImageUrl && initial === "+";
  const previewFrame = sourceSize
    ? calculateProfilePreviewFrame(sourceSize.width, sourceSize.height, {
        zoom,
        x,
        y,
      })
    : null;

  useEffect(() => {
    return () => {
      if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    };
  }, [sourceUrl]);

  useEffect(() => {
    return () => {
      if (draftUrl) URL.revokeObjectURL(draftUrl);
    };
  }, [draftUrl]);

  useEffect(() => {
    if (!sourceUrl) return;
    const id = window.setTimeout(() => setDialogVisible(true), 0);
    return () => window.clearTimeout(id);
  }, [sourceUrl]);

  useEffect(() => {
    if (!sourceUrl) return;
    const main = document.querySelector("main");
    if (!main) return;
    const el = main as HTMLElement;
    el.style.willChange = "transform";
    el.style.backfaceVisibility = "hidden";
    el.style.transformOrigin = "center center";
    el.style.transition =
      "transform 420ms cubic-bezier(0.16, 0.84, 0.44, 1)";
    const raf = requestAnimationFrame(() => {
      el.style.transform = "scale3d(0.97, 0.97, 1)";
    });
    return () => {
      cancelAnimationFrame(raf);
      el.style.transform = "scale3d(1, 1, 1)";
    };
  }, [sourceUrl]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const nextFile = e.currentTarget.files?.[0] ?? null;
    e.currentTarget.value = "";
    if (!nextFile) return;

    setError(null);
    setSourceFile(nextFile);
    setSourceSize(null);
    setSourceUrl((oldUrl) => {
      if (oldUrl) URL.revokeObjectURL(oldUrl);
      return URL.createObjectURL(nextFile);
    });
    setZoom(1);
    setX(0);
    setY(0);
    setDialogVisible(false);
  }

  function clearDraft() {
    setDraftUrl((oldUrl) => {
      if (oldUrl) URL.revokeObjectURL(oldUrl);
      return null;
    });
    onDraftChange?.(null);
  }

  function removePhoto() {
    if (draftUrl) {
      clearDraft();
      return;
    }
    onRemove?.();
  }

  function closeDialog() {
    setDialogVisible(false);
    dragRef.current = null;
    const main = document.querySelector("main") as HTMLElement | null;
    if (main) main.style.transform = "scale3d(1, 1, 1)";
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => {
      setSourceFile(null);
      setSourceSize(null);
      setSourceUrl((oldUrl) => {
        if (oldUrl) URL.revokeObjectURL(oldUrl);
        return null;
      });
      setZoom(1);
      setX(0);
      setY(0);
      setIsCropping(false);
      setIsDragging(false);
      closeTimerRef.current = null;
    }, 260);
  }

  async function useCroppedPhoto() {
    if (!sourceFile) return;
    setIsCropping(true);
    setError(null);
    try {
      const blob = await processProfileImage(sourceFile, { zoom, x, y });
      if (onSave) {
        await onSave(blob);
      } else {
        const nextUrl = URL.createObjectURL(blob);
        setDraftUrl((oldUrl) => {
          if (oldUrl) URL.revokeObjectURL(oldUrl);
          return nextUrl;
        });
        onDraftChange?.({ blob, url: nextUrl });
      }
      closeDialog();
    } catch {
      setError("Couldn't read that image");
      setIsCropping(false);
    }
  }

  function startDrag(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: x,
      originY: y,
    };
    setIsDragging(true);
  }

  function moveDrag(e: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const scale = 160;
    setX(clamp(drag.originX + (e.clientX - drag.startX) / scale, -1, 1));
    setY(clamp(drag.originY + (e.clientY - drag.startY) / scale, -1, 1));
  }

  function endDrag(e: React.PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === e.pointerId) {
      dragRef.current = null;
      setIsDragging(false);
    }
  }

  return (
    <>
      <div className="inline-flex flex-col items-start gap-1.5">
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES}
          className="hidden"
          onChange={pickFile}
        />

        <button
          type="button"
          disabled={isBusy}
          onClick={() => {
            if (shownImageUrl) removePhoto();
            else fileInputRef.current?.click();
          }}
          aria-label={
            shownImageUrl ? "Remove profile photo" : "Add profile photo"
          }
          className="group relative grid shrink-0 place-items-center overflow-hidden rounded-full border border-rule bg-paper shadow-control transition-colors duration-200 hover:bg-soft focus:outline-none focus-visible:bg-soft disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            width: avatarSize,
            height: avatarSize,
            boxShadow: shownImageUrl
              ? "var(--theme-shadow-control), inset 0 0 0 1px color-mix(in srgb, var(--color-ink) 3%, transparent)"
              : undefined,
          }}
        >
          <AvatarPreview
            initial={initial}
            color={color}
            imageUrl={shownImageUrl}
          />
          {shownImageUrl ? (
            <span className="absolute inset-0 bg-paper/72 opacity-0 backdrop-blur-[1px] transition-opacity duration-[420ms] ease-[cubic-bezier(0.16,0.84,0.44,1)] group-hover:opacity-100 group-focus-visible:opacity-100" />
          ) : null}
          {!shownImageUrl && !isAddPlaceholder ? (
            <span className="absolute inset-0 bg-soft opacity-0 transition-opacity duration-[420ms] ease-[cubic-bezier(0.16,0.84,0.44,1)] group-hover:opacity-100 group-focus-visible:opacity-100" />
          ) : null}
          <span
            className={
              !shownImageUrl
                ? "absolute inset-0 flex flex-col items-center justify-center gap-1 text-ink"
                : "absolute inset-0 grid place-items-center text-ink"
            }
          >
            {!shownImageUrl ? (
              <span className="translate-y-[7px] text-[18px] leading-none opacity-0 [filter:blur(10px)] transition-[opacity,filter,transform] duration-[420ms] ease-[cubic-bezier(0.16,0.84,0.44,1)] group-hover:-translate-y-[2px] group-hover:opacity-100 group-hover:[filter:blur(0)] group-focus-visible:-translate-y-[2px] group-focus-visible:opacity-100 group-focus-visible:[filter:blur(0)]">
                +
              </span>
            ) : null}
            <span
              className={
                shownImageUrl
                  ? "text-[11px] font-medium leading-none opacity-0 [filter:blur(10px)] transition-[opacity,filter] duration-[420ms] ease-[cubic-bezier(0.16,0.84,0.44,1)] group-hover:opacity-100 group-hover:[filter:blur(0)] group-focus-visible:opacity-100 group-focus-visible:[filter:blur(0)]"
                  : "text-[11px] font-medium leading-none opacity-0 [filter:blur(10px)] transition-[opacity,filter] duration-[420ms] ease-[cubic-bezier(0.16,0.84,0.44,1)] group-hover:opacity-100 group-hover:[filter:blur(0)] group-focus-visible:opacity-100 group-focus-visible:[filter:blur(0)]"
              }
            >
              {shownImageUrl ? "Remove" : "Photo"}
            </span>
          </span>
        </button>
      </div>

      {typeof document !== "undefined" && sourceUrl
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Crop profile photo"
              data-profile-photo-dialog
              className="fixed inset-0 z-[70] flex flex-col"
              style={{
                background:
                  "radial-gradient(ellipse at center, color-mix(in srgb, var(--color-paper) 32%, transparent) 0%, color-mix(in srgb, var(--color-paper) 58%, transparent) 100%)",
                opacity: dialogVisible ? 1 : 0,
                backdropFilter: dialogVisible ? "blur(4px)" : "blur(0px)",
                WebkitBackdropFilter: dialogVisible
                  ? "blur(4px)"
                  : "blur(0px)",
                transition:
                  "opacity 260ms cubic-bezier(0.16, 0.84, 0.44, 1), backdrop-filter 260ms cubic-bezier(0.16, 0.84, 0.44, 1), -webkit-backdrop-filter 260ms cubic-bezier(0.16, 0.84, 0.44, 1)",
              }}
              onPointerDown={(e) => {
                if (e.target === e.currentTarget && !isCropping) closeDialog();
              }}
            >
              <div
                className="flex items-center justify-end gap-3 px-4 pt-4 pb-2 sm:px-6 sm:pt-5 sm:pb-3 animate-blur-fade"
                style={{ animationDelay: "60ms" }}
                onPointerDown={(e) => {
                  if (e.target === e.currentTarget && !isCropping) {
                    closeDialog();
                  }
                }}
              >
                <button
                  type="button"
                  disabled={isCropping}
                  onClick={closeDialog}
                  aria-label="close"
                  className="grid h-9 w-9 sm:h-10 sm:w-10 place-items-center rounded-full border border-rule bg-paper/90 text-[18px] sm:text-[20px] leading-none text-ink shadow-control transition-colors hover:bg-ink hover:text-paper disabled:cursor-not-allowed disabled:opacity-50"
                >
                  ×
                </button>
              </div>

              <div
                className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-6 sm:px-12 sm:pb-10 animate-blur-fade"
                style={{ animationDelay: "120ms" }}
                onPointerDown={(e) => {
                  if (e.target === e.currentTarget && !isCropping) {
                    closeDialog();
                  }
                }}
              >
                <div className="w-full max-w-[320px] rounded-[12px] border border-rule bg-paper p-4 shadow-photo">
                  <div className="mb-3 text-[15px] font-medium tracking-[-0.005em]">
                    Crop photo
                  </div>

                  <div
                    onPointerDown={startDrag}
                    onPointerMove={moveDrag}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                    className="relative mx-auto mb-4 h-[224px] w-[224px] touch-none cursor-grab overflow-hidden rounded-full border border-rule bg-soft active:cursor-grabbing"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={sourceUrl}
                      alt=""
                      draggable={false}
                      className="absolute max-h-none max-w-none select-none"
                      onLoad={(e) => {
                        setSourceSize({
                          width: e.currentTarget.naturalWidth,
                          height: e.currentTarget.naturalHeight,
                        });
                      }}
                      style={{
                        width: previewFrame
                          ? `${previewFrame.widthPercent}%`
                          : "100%",
                        height: previewFrame
                          ? `${previewFrame.heightPercent}%`
                          : "100%",
                        left: previewFrame ? `${previewFrame.leftPercent}%` : 0,
                        top: previewFrame ? `${previewFrame.topPercent}%` : 0,
                        transition: isDragging
                          ? "none"
                          : "left 120ms ease, top 120ms ease, width 120ms ease, height 120ms ease",
                      }}
                    />
                  </div>

                  <label className="block pb-2 text-[10px] uppercase tracking-[0.14em] text-faint">
                    Zoom
                    <input
                      type="range"
                      min={1}
                      max={3}
                      step={0.05}
                      value={zoom}
                      disabled={isCropping}
                      onChange={(e) => setZoom(Number(e.currentTarget.value))}
                      className="profile-zoom-slider mt-2 h-3 w-full disabled:cursor-not-allowed disabled:opacity-50"
                      style={{
                        "--profile-zoom-progress": `${((zoom - 1) / 2) * 100}%`,
                      } as React.CSSProperties}
                    />
                  </label>

                  <div className="mt-2 min-h-[16px] text-[11px] italic text-faint">
                    {error}
                  </div>

                  <div className="mt-3 flex justify-end gap-2">
                    <button
                      type="button"
                      disabled={isCropping}
                      onClick={closeDialog}
                      className="rounded-full px-3 py-1.5 text-[12px] font-medium text-muted transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isCropping}
                      onClick={useCroppedPhoto}
                      className="rounded-full bg-ink px-3.5 py-1.5 text-[12px] font-medium text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      {isCropping || isSaving ? "Saving..." : "Use photo"}
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function AvatarPreview({
  initial,
  color,
  imageUrl,
}: {
  initial: string;
  color: string;
  imageUrl?: string | null;
}) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={imageUrl} alt="" className="h-full w-full object-cover" />
    );
  }

  if (initial === "+") {
    return <span className="h-full w-full bg-soft" />;
  }

  return (
    <span
      className="grid h-full w-full place-items-center bg-soft text-[24px] font-semibold leading-none text-[#faf8f4]"
      style={{ backgroundColor: color.startsWith("var(") ? undefined : color }}
    >
      {initial}
    </span>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
