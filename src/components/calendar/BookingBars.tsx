"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, ChevronLeft, ChevronRight, Copy, Trash2 } from "lucide-react";
import type { Booking, Person } from "@/lib/data";
import { nightsBetween } from "@/lib/iso-date";
import type { PaymentConfig } from "@/lib/payment";
import {
  BottomOverlayShell,
  CloseIconButton,
  OverlayBackdrop,
  PersonChip,
  fmtDay,
  useAnimatedClose,
} from "./overlayPrimitives";

const EDIT_EXPANSION_DELAY_MS = 260;

function formatPrice(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
    }).format(value);
  } catch {
    return value.toFixed(Number.isInteger(value) ? 0 : 2);
  }
}

export function ConfirmBar({
  start,
  end,
  locked,
  person,
  conflict,
  pending,
  onCancel,
  onConfirm,
  onAdjustStart,
  onAdjustEnd,
  canAdjustStart,
  canAdjustEnd,
  mode = "create",
  hasChanges = true,
  payment,
  paymentMode = false,
  onPaymentConfirm,
}: {
  start: string;
  end: string;
  locked: boolean;
  person: Person;
  conflict: string | null;
  pending?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  onAdjustStart: (delta: number) => void;
  onAdjustEnd: (delta: number) => void;
  canAdjustStart: (delta: number) => boolean;
  canAdjustEnd: (delta: number) => boolean;
  mode?: "create" | "edit";
  hasChanges?: boolean;
  payment?: PaymentConfig | null;
  paymentMode?: boolean;
  onPaymentConfirm?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const { isClosing, close, closeWith } = useAnimatedClose(onCancel);
  const showPaymentDetails = paymentMode && !!payment;
  const shouldMorphToPayment =
    mode === "create" && locked && !!payment && !paymentMode;
  const canEdit = locked && !showPaymentDetails;
  const nights = nightsBetween(start, end);
  const total = payment ? nights * payment.costPerNight : 0;
  const amount = payment ? formatPrice(total, payment.currency) : "";
  const transferReference = `${person.first} - ${nights} night${
    nights === 1 ? "" : "s"
  }`;
  const accountNumberForCopy = payment?.accountNumber.replace(/\D/g, "") ?? "";
  const confirmLabel =
    mode === "edit"
      ? pending
        ? "Saving…"
        : "Save"
      : pending
        ? "Saving…"
        : "Confirm";

  useEffect(() => {
    const card = cardRef.current;
    const content = contentRef.current;
    if (!card || !content) return;
    const measuredCard = card;
    const measuredContent = content;

    function measure() {
      measuredCard.style.setProperty(
        "--booking-flow-height",
        `${measuredContent.scrollHeight}px`,
      );
    }

    measure();
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(measuredContent);
    window.addEventListener("resize", measure);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  async function copyValue(key: string, value: string) {
    if (!navigator.clipboard) return;
    await navigator.clipboard.writeText(value);
    setCopied(key);
    window.setTimeout(() => setCopied(null), 1400);
  }

  function handleConfirm() {
    if (shouldMorphToPayment) {
      onConfirm();
      return;
    }
    closeWith(onConfirm);
  }

  useEffect(() => {
    if (mode !== "edit" || !locked) return;
    let firstFrame: number | null = null;
    let secondFrame: number | null = null;
    const timer = window.setTimeout(() => {
      firstFrame = window.requestAnimationFrame(() => {
        secondFrame = window.requestAnimationFrame(() => setEditing(true));
      });
    }, EDIT_EXPANSION_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
      if (firstFrame !== null) window.cancelAnimationFrame(firstFrame);
      if (secondFrame !== null) window.cancelAnimationFrame(secondFrame);
    };
  }, [locked, mode]);

  return (
    <>
      {locked ? (
        <OverlayBackdrop
          onPointerDown={close}
          isClosing={isClosing}
        />
      ) : null}
      <BottomOverlayShell isClosing={isClosing}>
        <div
          ref={cardRef}
          role={showPaymentDetails ? "dialog" : undefined}
          aria-modal={showPaymentDetails ? true : undefined}
          aria-labelledby={showPaymentDetails ? "payment-title" : undefined}
          className={[
            "booking-confirm-card flex w-full flex-col rounded-[12px] sm:rounded-[14px] border border-rule bg-paper shadow-card max-w-[calc(100vw-1.5rem)] sm:w-[480px] origin-bottom",
            locked || showPaymentDetails
              ? "is-locked pointer-events-auto"
              : "pointer-events-none",
            showPaymentDetails ? "is-payment" : "",
          ].join(" ")}
        >
          <div ref={contentRef}>
          {showPaymentDetails ? (
            <div className="booking-payment-content px-4 py-4 sm:px-5 sm:py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2
                    id="payment-title"
                    className="m-0 text-[15px] font-semibold tracking-[-0.01em] text-ink"
                  >
                    Stay cost
                  </h2>
                  <p className="mt-1 text-[12px] leading-snug text-muted">
                    {fmtDay(start)}
                    {start === end ? "" : ` to ${fmtDay(end)}`}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-[18px] font-semibold tracking-[-0.02em] text-ink">
                    {amount}
                  </div>
                  <div className="text-[11px] text-muted">
                    {nights} night{nights === 1 ? "" : "s"} at{" "}
                    {formatPrice(payment.costPerNight, payment.currency)}
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-[10px] border border-soft bg-soft/40 px-3 py-2.5 text-[12px] leading-relaxed text-ink">
                {payment.accountName ? (
                  <PaymentCopyRow
                    label="Name"
                    value={payment.accountName}
                    copied={copied === "name"}
                    onCopy={() => copyValue("name", payment.accountName)}
                  />
                ) : null}
                {payment.accountNumber ? (
                  <PaymentCopyRow
                    label="Account"
                    value={payment.accountNumber}
                    copied={copied === "account"}
                    tabular
                    onCopy={() => copyValue("account", accountNumberForCopy)}
                  />
                ) : null}
                <PaymentCopyRow
                  label="Reference"
                  value={transferReference}
                  copied={copied === "reference"}
                  onCopy={() => copyValue("reference", transferReference)}
                />
              </div>

              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => closeWith(onPaymentConfirm ?? onConfirm)}
                  disabled={isClosing}
                  className="whitespace-nowrap rounded-full bg-ink px-4 py-1.5 text-[12px] font-medium text-paper shadow-control transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-25"
                >
                  OK
                </button>
              </div>
            </div>
          ) : (
          <>
          <div className="flex items-center gap-x-2.5 gap-y-2 px-3 py-3 sm:gap-x-4 sm:px-4 sm:py-3">
            <PersonChip person={person} />
            <div className="flex min-w-0 flex-1 flex-col leading-tight">
              {locked ? (
                <StayDateText start={start} end={end} />
              ) : (
                <span className="truncate whitespace-nowrap text-[clamp(13px,3.75vw,15px)] font-semibold sm:text-[14px]">
                  Pick an end date
                </span>
              )}
              <span className="booking-confirm-meta text-[11px] text-muted">
                <span
                  className={[
                    "booking-confirm-meta-layer truncate",
                    locked ? "is-hidden" : "is-visible",
                  ].join(" ")}
                  aria-hidden={locked}
                >
                  starts {fmtDay(start)} · {person.first}
                </span>
                <span
                  className={[
                    "booking-confirm-meta-layer flex min-w-0 items-center gap-1.5",
                    locked ? "is-visible" : "is-hidden",
                  ].join(" ")}
                  aria-hidden={!locked}
                >
                  <span className="truncate">your stay · {person.first}</span>
                  <span
                    className="h-[3px] w-[3px] shrink-0 rounded-full bg-faint"
                    aria-hidden
                  />
                  <button
                    type="button"
                    onClick={() => setEditing((value) => !value)}
                    aria-expanded={editing}
                    tabIndex={locked ? 0 : -1}
                    className={[
                      "shrink-0 font-medium underline-offset-4 transition-colors hover:underline focus-visible:underline focus-visible:outline-none",
                      editing
                        ? "text-ink underline decoration-ink"
                        : "text-muted hover:text-ink",
                    ].join(" ")}
                  >
                    Edit
                  </button>
                </span>
              </span>
            </div>
            {conflict ? (
              <div className="hidden text-[11px] italic text-faint sm:ml-1 sm:block sm:max-w-[160px]">
                overlaps {conflict}&rsquo;s stay
              </div>
            ) : null}
            <div className="ml-auto flex shrink-0 items-center gap-2.5 sm:gap-1.5">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={
                  !locked || !!conflict || pending || !hasChanges || isClosing
                }
                className="pointer-events-auto whitespace-nowrap rounded-full bg-ink px-[clamp(12px,3.2vw,16px)] py-[clamp(6px,1.8vw,8px)] text-[clamp(12px,3.15vw,13px)] font-medium text-paper shadow-control transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-25"
              >
                {confirmLabel}
              </button>
              <CloseIconButton
                onClick={close}
                className="h-[clamp(30px,8vw,34px)] w-[clamp(30px,8vw,34px)]"
              />
            </div>
          </div>
          {canEdit ? (
            <EditControlsPanel editing={editing}>
              <NudgeRow
                label="Start"
                value={fmtDay(start)}
                onDec={() => onAdjustStart(-1)}
                onInc={() => onAdjustStart(1)}
                canDec={canAdjustStart(-1)}
                canInc={canAdjustStart(1)}
              />
              <NudgeRow
                label="End"
                value={fmtDay(end)}
                onDec={() => onAdjustEnd(-1)}
                onInc={() => onAdjustEnd(1)}
                canDec={canAdjustEnd(-1)}
                canInc={canAdjustEnd(1)}
              />
            </EditControlsPanel>
          ) : null}
          </>
          )}
          </div>
        </div>
      </BottomOverlayShell>
    </>
  );
}

function PaymentCopyRow({
  label,
  value,
  copied,
  tabular = false,
  onCopy,
}: {
  label: string;
  value: string;
  copied: boolean;
  tabular?: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="flex items-center gap-3 py-1">
      <span className="w-[64px] shrink-0 text-muted">{label}</span>
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <span
          className={[
            "min-w-0 truncate font-medium",
            tabular ? "tabular-nums" : "",
          ].join(" ")}
        >
          {value}
        </span>
        <button
          type="button"
          onClick={onCopy}
          className="grid h-5 w-5 shrink-0 place-items-center text-faint transition-colors hover:text-ink"
          aria-label={`Copy ${label.toLowerCase()}`}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
    </div>
  );
}

function EditControlsPanel({
  editing,
  children,
}: {
  editing: boolean;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const panel = panelRef.current;
    const content = contentRef.current;
    if (!panel || !content) return;
    const measuredPanel = panel;
    const measuredContent = content;

    function measure() {
      measuredPanel.style.setProperty(
        "--edit-panel-height",
        `${measuredContent.scrollHeight}px`,
      );
    }

    measure();
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(measuredContent);
    window.addEventListener("resize", measure);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <div
      ref={panelRef}
      className={["booking-edit-panel", editing ? "is-open" : ""].join(" ")}
      aria-hidden={!editing}
    >
      <div
        ref={contentRef}
        className="booking-edit-content border-t border-soft px-3 py-3 sm:px-4 sm:py-3.5 space-y-2"
      >
        {children}
      </div>
    </div>
  );
}

export function ChoiceBar({
  booking,
  person,
  deleting = false,
  pending,
  onCancel,
  onEdit,
  onDelete,
  onConfirmDelete,
}: {
  booking: Booking | null;
  person: Person;
  deleting?: boolean;
  pending?: boolean;
  onCancel: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onConfirmDelete?: () => void;
}) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const { isClosing, close, closeWith } = useAnimatedClose(onCancel);

  useEffect(() => {
    const card = cardRef.current;
    const content = contentRef.current;
    if (!card || !content) return;
    const measuredCard = card;
    const measuredContent = content;

    function measure() {
      measuredCard.style.setProperty(
        "--booking-flow-height",
        `${measuredContent.scrollHeight}px`,
      );
    }

    measure();
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(measuredContent);
    window.addEventListener("resize", measure);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  if (!booking) return null;

  const nights = nightsBetween(booking.start, booking.end);
  const sameDay = booking.start === booking.end;

  return (
    <>
      <OverlayBackdrop onPointerDown={close} isClosing={isClosing} />
      <BottomOverlayShell isClosing={isClosing}>
        <div
          ref={cardRef}
          className={[
            "booking-action-card pointer-events-auto w-full rounded-[12px] border border-rule bg-paper shadow-card max-w-[calc(100vw-1.5rem)] sm:w-[480px] sm:rounded-[14px]",
            deleting ? "is-deleting" : "",
          ].join(" ")}
        >
          <div
            ref={contentRef}
            className="flex items-center gap-x-2.5 gap-y-2 px-3 py-3 sm:gap-x-4 sm:px-4 sm:py-3"
          >
          <PersonChip person={person} />
          <div className="flex min-w-0 flex-1 flex-col leading-tight">
            <span className="booking-action-title">
              <span
                className={[
                  "booking-action-layer truncate text-[clamp(12px,3.55vw,14px)] font-medium sm:text-[13px]",
                  deleting ? "is-hidden" : "is-visible",
                ].join(" ")}
                aria-hidden={deleting}
              >
                {booking.start === booking.end
                  ? fmtDay(booking.start)
                  : `${fmtCompactDay(booking.start)} - ${fmtCompactDay(booking.end)}`}
              </span>
              <span
                className={[
                  "booking-action-layer truncate text-[13px] font-medium",
                  deleting ? "is-visible" : "is-hidden",
                ].join(" ")}
                aria-hidden={!deleting}
              >
                Remove this stay?
              </span>
            </span>
            <span className="booking-action-meta text-[11px] text-muted">
              <span
                className={[
                  "booking-action-layer flex min-w-0 items-center gap-1.5",
                  deleting ? "is-hidden" : "is-visible",
                ].join(" ")}
                aria-hidden={deleting}
              >
                <span className="truncate">your stay · {person.first}</span>
              <span
                className="h-[3px] w-[3px] shrink-0 rounded-full bg-faint"
                aria-hidden
              />
              <button
                type="button"
                onClick={() => closeWith(onEdit)}
                tabIndex={deleting ? -1 : 0}
                className="shrink-0 font-medium text-muted underline-offset-4 transition-colors hover:text-ink hover:underline focus-visible:text-ink focus-visible:underline focus-visible:outline-none"
              >
                Edit
              </button>
              </span>
              <span
                className={[
                  "booking-action-layer truncate",
                  deleting ? "is-visible" : "is-hidden",
                ].join(" ")}
                aria-hidden={!deleting}
              >
                {sameDay
                  ? fmtDay(booking.start)
                  : `${fmtDay(booking.start)} → ${fmtDay(booking.end)}`}
                {" · "}
                {nights} night{nights === 1 ? "" : "s"}
              </span>
            </span>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() =>
                deleting
                  ? closeWith(onConfirmDelete ?? onDelete)
                  : onDelete()
              }
              disabled={(deleting && pending) || isClosing}
              className={[
                "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-[clamp(10px,2.7vw,14px)] py-[clamp(6px,1.8vw,8px)] text-[clamp(12px,3.15vw,13px)] font-medium shadow-control transition-colors disabled:cursor-not-allowed disabled:opacity-25",
                deleting
                  ? "bg-ink text-paper hover:opacity-90"
                  : "border border-rule bg-paper/70 text-ink hover:border-ink",
              ].join(" ")}
            >
              {!deleting || !pending ? <Trash2 size={12} strokeWidth={2.25} /> : null}
              {deleting ? (pending ? "Removing…" : "Delete") : "Delete"}
            </button>
            <CloseIconButton
              onClick={close}
              className="h-[clamp(30px,8vw,34px)] w-[clamp(30px,8vw,34px)]"
            />
          </div>
          </div>
        </div>
      </BottomOverlayShell>
    </>
  );
}

export function DeleteBar({
  booking,
  person,
  pending,
  onCancel,
  onDelete,
}: {
  booking: Booking | null;
  person: Person;
  pending?: boolean;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const { isClosing, close, closeWith } = useAnimatedClose(onCancel);
  if (!booking) return null;

  const nights = nightsBetween(booking.start, booking.end);
  const sameDay = booking.start === booking.end;

  return (
    <>
      <OverlayBackdrop onPointerDown={close} isClosing={isClosing} />
      <BottomOverlayShell isClosing={isClosing}>
        <div className="pointer-events-auto flex w-full items-center gap-x-2.5 gap-y-2 rounded-[12px] border border-rule bg-paper px-3 py-3 shadow-card max-w-[calc(100vw-1.5rem)] sm:w-[480px] sm:gap-x-4 sm:rounded-[14px] sm:px-4 sm:py-3">
          <PersonChip person={person} />
          <div className="flex min-w-0 flex-1 flex-col leading-tight">
            <span className="truncate text-[13px] font-medium">
              Remove this stay?
            </span>
            <span className="truncate text-[11px] text-muted">
              {sameDay
                ? fmtDay(booking.start)
                : `${fmtDay(booking.start)} → ${fmtDay(booking.end)}`}
              {" · "}
              {nights} night{nights === 1 ? "" : "s"}
            </span>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => closeWith(onDelete)}
              disabled={pending || isClosing}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-ink px-[clamp(12px,3.2vw,16px)] py-[clamp(6px,1.8vw,8px)] text-[clamp(12px,3.15vw,13px)] font-medium text-paper shadow-control transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-25"
            >
              {!pending ? <Trash2 size={12} strokeWidth={2.25} /> : null}
              {pending ? "Removing…" : "Delete"}
            </button>
            <CloseIconButton
              onClick={close}
              className="h-[clamp(30px,8vw,34px)] w-[clamp(30px,8vw,34px)]"
            />
          </div>
        </div>
      </BottomOverlayShell>
    </>
  );
}

function StayDateText({ start, end }: { start: string; end: string }) {
  const sameDay = start === end;

  if (sameDay) {
    return (
      <span className="truncate whitespace-nowrap text-[clamp(12px,3.55vw,14px)] font-medium sm:text-[13px]">
        {fmtDay(start)}
      </span>
    );
  }

  return (
    <>
      <span className="hidden sm:block text-[13px] font-medium truncate">
        {fmtDay(start)}, to {fmtDay(end)}
      </span>
      <span className="truncate whitespace-nowrap text-[clamp(12px,3.55vw,14px)] font-medium sm:hidden">
        {fmtCompactDay(start)} - {fmtCompactDay(end)}
      </span>
    </>
  );
}

function fmtCompactDay(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  return `${date.getDate()} ${date.toLocaleString("en", { month: "short" })}`;
}

function NudgeRow({
  label,
  value,
  onDec,
  onInc,
  canDec,
  canInc,
}: {
  label: string;
  value: string;
  onDec: () => void;
  onInc: () => void;
  canDec: boolean;
  canInc: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.06em] text-muted w-[40px]">
        {label}
      </span>
      <span className="text-[12px] sm:text-[13px] font-medium tabular-nums flex-1">
        {value}
      </span>
      <NudgeButton
        onClick={onDec}
        disabled={!canDec}
        label={`${label} earlier`}
      >
        <ChevronLeft size={15} strokeWidth={2.25} />
      </NudgeButton>
      <NudgeButton onClick={onInc} disabled={!canInc} label={`${label} later`}>
        <ChevronRight size={15} strokeWidth={2.25} />
      </NudgeButton>
    </div>
  );
}

function NudgeButton({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="grid h-8 w-8 place-items-center rounded-full border border-rule bg-paper/70 text-[14px] text-muted shadow-control transition-colors hover:border-ink hover:bg-ink hover:text-paper disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-rule disabled:hover:bg-paper disabled:hover:text-muted"
    >
      {children}
    </button>
  );
}
