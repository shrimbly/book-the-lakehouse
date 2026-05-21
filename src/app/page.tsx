import Link from "next/link";
import { MONTH_NAMES } from "@/lib/calendar";
import { fetchCalendarData } from "@/lib/data-source";
import { getCurrentIdentityId } from "@/lib/identity";
import { isGatePassed } from "@/lib/gate";
import { IdentityPicker } from "@/components/IdentityPicker";
import { IdentityOnboarding } from "@/components/IdentityOnboarding";
import { PinGate } from "@/components/PinGate";
import { Calendar } from "@/components/Calendar";
import { MonthSwiper } from "@/components/MonthSwiper";
import { MonthTitle } from "@/components/MonthTitle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { siteFooterText, siteRepoUrl } from "@/lib/site";
import { getPaymentConfig } from "@/lib/payment";
import { isMaryId } from "@/lib/mary";

function parseMonthParam(value: string | string[] | undefined): [number, number] {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw && /^\d{4}-\d{2}$/.test(raw)) {
    const [y, mo] = raw.split("-").map(Number);
    if (mo >= 1 && mo <= 12) return [y, mo - 1];
  }
  const now = new Date();
  return [now.getFullYear(), now.getMonth()];
}

const monthHref = (y: number, m: number) =>
  `?m=${y}-${String(m + 1).padStart(2, "0")}`;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ m?: string | string[] }>;
}) {
  const { m } = await searchParams;
  const [year, month] = parseMonthParam(m);

  if (!(await isGatePassed())) {
    return <PinGate />;
  }

  const { people, bookings, photos, today } = await fetchCalendarData(year, month);
  const identityId = await getCurrentIdentityId();
  const me = identityId ? people.find((p) => p.id === identityId) : undefined;
  const paymentConfig = getPaymentConfig();
  const footerLinkText = "Book the lakehouse";
  const footerSuffix = siteFooterText.startsWith(footerLinkText)
    ? siteFooterText.slice(footerLinkText.length).trimStart()
    : "";

  if (!me) {
    return <IdentityOnboarding people={people} />;
  }

  return (
    <main className="flex-1 px-4 sm:px-10 pt-4 sm:pt-8 pb-4 sm:pb-6">
      <MonthSwiper year={year} month={month} />
      <div className="mx-auto max-w-[1200px]">
        <header className="mb-6 sm:mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 sm:gap-8">
          <MonthTitle
            month={month}
            months={MONTH_NAMES}
            className="text-[52px] font-semibold leading-[0.88] tracking-[-0.05em] sm:tracking-[-0.06em]"
          />
          <div className="flex flex-col items-end gap-2 sm:gap-6">
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <IdentityPicker
                people={people}
                currentId={me.id}
                showMaryMode={isMaryId(me.id)}
              />
            </div>
            <div className="inline-flex items-center gap-2.5 sm:gap-3.5 pb-0 sm:pb-1.5">
              <YearArrow
                href={monthHref(year - 1, month)}
                label="previous year"
              >
                ‹
              </YearArrow>
              <span
                key={`year-${year}`}
                className="text-[18px] sm:text-[22px] font-medium tabular-nums tracking-[-0.01em] animate-blur-fade"
              >
                {year}
              </span>
              <YearArrow href={monthHref(year + 1, month)} label="next year">
                ›
              </YearArrow>
            </div>
          </div>
        </header>

        <nav className="mb-0 sm:mb-0 flex items-center justify-between gap-1 pb-2 sm:pb-2 text-[13px] sm:text-[12px] overflow-x-auto">
          {MONTH_NAMES.map((name, idx) => {
            const isCurrent = idx === month;
            return (
              <Link
                key={name}
                href={monthHref(year, idx)}
                className={
                  isCurrent
                    ? "rounded-full bg-ink px-3 sm:px-2.5 py-1.5 sm:py-1 font-medium text-paper shrink-0"
                    : "rounded-full px-2 sm:px-1.5 py-1.5 sm:py-1 text-muted transition-colors hover:text-ink shrink-0"
                }
              >
                {name.slice(0, 3)}
              </Link>
            );
          })}
        </nav>

        <div key={`cal-${year}-${month}`} className="animate-blur-fade">
          <Calendar
            year={year}
            month={month}
            initialBookings={bookings}
            initialPhotos={photos}
            people={people}
            meId={me.id}
            today={today}
            paymentConfig={paymentConfig}
          />
        </div>

        <footer className="mt-16 sm:mt-24 flex items-center justify-center text-[12px] text-muted">
          <span
            className="mr-2 inline-block h-[5px] w-[5px] -translate-y-[1px] rounded-full bg-ink"
            aria-hidden
          />
          <Link
            href={siteRepoUrl}
            target="_blank"
            rel="noreferrer"
            className="transition-colors hover:text-ink"
          >
            {footerLinkText}
          </Link>
          {footerSuffix ? <span className="ml-1">{footerSuffix}</span> : null}
        </footer>
      </div>
    </main>
  );
}

function YearArrow({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="grid h-8 w-8 place-items-center rounded-full border border-rule text-[13px] text-muted transition-colors hover:border-ink hover:bg-ink hover:text-paper"
    >
      {children}
    </Link>
  );
}
