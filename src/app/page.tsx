import Link from "next/link";
import { MONTH_NAMES } from "@/lib/calendar";
import { fetchCalendarData } from "@/lib/data-source";
import { getCurrentIdentityId } from "@/lib/identity";
import { isGatePassed } from "@/lib/gate";
import { IdentityPicker } from "@/components/IdentityPicker";
import { IdentityOnboarding } from "@/components/IdentityOnboarding";
import { PinGate } from "@/components/PinGate";
import { Calendar } from "@/components/Calendar";

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

  const { people, bookings, today } = await fetchCalendarData(year, month);
  const identityId = await getCurrentIdentityId();
  const me = identityId ? people.find((p) => p.id === identityId) : undefined;

  if (!me) {
    return <IdentityOnboarding people={people} />;
  }

  return (
    <main className="flex-1 px-4 sm:px-10 pt-4 sm:pt-8 pb-24 sm:pb-20">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-4 sm:-mb-2 flex items-center justify-end gap-3">
          <IdentityPicker people={people} currentId={me.id} />
        </div>

        <header className="mb-6 sm:mb-8 grid grid-cols-[1fr_auto] items-end gap-4 sm:gap-8">
          <h1
            key={`title-${month}`}
            className="m-0 text-[44px] sm:text-[clamp(72px,12vw,200px)] font-semibold leading-[0.88] tracking-[-0.05em] sm:tracking-[-0.06em] animate-blur-fade"
          >
            {MONTH_NAMES[month]}
          </h1>
          <div className="inline-flex items-center gap-2.5 sm:gap-3.5 pb-1 sm:pb-3.5">
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
        </header>

        <nav className="mb-6 sm:mb-10 flex items-center justify-between gap-1 border-b border-soft pb-3 sm:pb-5 text-[13px] sm:text-[12px] overflow-x-auto">
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
            people={people}
            meId={me.id}
            today={today}
          />
        </div>

        <footer className="mt-16 sm:mt-24 flex items-center justify-center text-[12px] text-muted">
          <span
            className="mr-2 inline-block h-[5px] w-[5px] -translate-y-[1px] rounded-full bg-ink"
            aria-hidden
          />
          Book the Kuratau bach · built by Willie
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
