import Link from "next/link";
import { getCurrentMaryId } from "@/lib/mary";
import { getPaymentConfig } from "@/lib/payment";
import { fetchMaryData } from "@/lib/data-source";
import { MaryChecklist } from "@/components/MaryChecklist";
import { ThemeToggle } from "@/components/ThemeToggle";

export default async function MaryPage() {
  const maryId = await getCurrentMaryId();

  if (!maryId) {
    return (
      <main className="flex flex-1 items-center justify-center px-4 py-12 sm:py-20">
        <div className="w-full max-w-[420px]">
          <div className="mb-8 flex justify-end">
            <ThemeToggle />
          </div>
          <h1 className="m-0 mb-3 text-[42px] font-semibold leading-[0.95] tracking-[-0.04em]">
            Mary mode
          </h1>
          <p className="text-[14px] leading-relaxed text-muted">
            This view is for Marys. Choose a Mary identity on the calendar first.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex rounded-full bg-ink px-4 py-2 text-[13px] font-medium text-paper"
          >
            Back to calendar
          </Link>
        </div>
      </main>
    );
  }

  const payment = getPaymentConfig();
  const { stays, today, connected } = await fetchMaryData(payment);

  return (
    <main className="flex-1 px-4 pt-6 pb-20 sm:px-10 sm:pt-10">
      <div className="mx-auto max-w-[760px]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="m-0 text-[48px] font-semibold leading-[0.9] tracking-[-0.05em] sm:text-[72px]">
              Mary mode
            </h1>
            <p className="mt-4 max-w-[520px] text-[14px] leading-relaxed text-muted">
              A simple checklist for Marys to track stays and payment transfers.
            </p>
            {!connected ? (
              <p className="mt-2 max-w-[520px] text-[12px] leading-relaxed text-faint">
                Demo mode: connect a database to persist payment checks.
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <Link
              href="/"
              className="rounded-full border border-rule px-3 py-1.5 text-[12px] font-medium text-ink transition-colors hover:border-ink"
            >
              Calendar
            </Link>
          </div>
        </div>
        <MaryChecklist stays={stays} today={today} />
      </div>
    </main>
  );
}
