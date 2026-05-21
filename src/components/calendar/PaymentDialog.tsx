"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import type { Person } from "@/lib/data";
import { nightsBetween } from "@/lib/iso-date";
import type { PaymentConfig } from "@/lib/payment";
import {
  BottomOverlayShell,
  CloseIconButton,
  OverlayBackdrop,
  fmtDay,
  useAnimatedClose,
} from "./overlayPrimitives";

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

export function PaymentDialog({
  start,
  end,
  person,
  payment,
  onCancel,
  onConfirm,
}: {
  start: string;
  end: string;
  person: Person;
  payment: PaymentConfig;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const { isClosing, close, closeWith } = useAnimatedClose(onCancel);
  const nights = nightsBetween(start, end);
  const total = nights * payment.costPerNight;
  const amount = formatPrice(total, payment.currency);
  const transferReference = `${person.first} - ${nights} night${
    nights === 1 ? "" : "s"
  }`;
  const accountNumberForCopy = payment.accountNumber.replace(/\D/g, "");

  async function copyValue(key: string, value: string) {
    if (!navigator.clipboard) return;
    await navigator.clipboard.writeText(value);
    setCopied(key);
    window.setTimeout(() => setCopied(null), 1400);
  }

  return (
    <>
      <OverlayBackdrop
        onPointerDown={close}
        isClosing={isClosing}
        zIndexClass="z-40"
      />
      <BottomOverlayShell isClosing={isClosing} zIndexClass="z-50">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="payment-title"
          className="pointer-events-auto relative w-full max-w-[calc(100vw-1.5rem)] rounded-[12px] sm:w-[460px] sm:rounded-[14px] border border-rule bg-paper shadow-card"
        >
          <CloseIconButton onClick={close} className="absolute right-3 top-3" />
          <div className="px-4 py-4 pr-12 sm:px-5 sm:py-5 sm:pr-12">
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
                onClick={() => closeWith(onConfirm)}
                disabled={isClosing}
                className="whitespace-nowrap rounded-full bg-ink px-4 py-1.5 text-[12px] font-medium text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-25"
              >
                OK
              </button>
            </div>
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
