const fallbackName = "Book the lakehouse";
const fallbackHomeKind = "lakehouse";
const fallbackBuilderName = "Willie";

function fromEnv(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export const siteName = fromEnv(
  process.env.NEXT_PUBLIC_HOME_NAME,
  fallbackName,
);

export const siteHomeKind = fromEnv(
  process.env.NEXT_PUBLIC_HOME_KIND,
  fallbackHomeKind,
);

export const siteBuilderName = fromEnv(
  process.env.NEXT_PUBLIC_BUILT_BY,
  fallbackBuilderName,
);

export const siteDescription = fromEnv(
  process.env.NEXT_PUBLIC_SITE_DESCRIPTION,
  "A private family booking calendar for the lakehouse.",
);

export const siteFooterText = fromEnv(
  process.env.NEXT_PUBLIC_FOOTER_TEXT,
  `Book the ${siteHomeKind} · built by ${siteBuilderName}`,
);

export const siteCookiePrefix =
  slugify(
    fromEnv(process.env.COOKIE_PREFIX, process.env.NEXT_PUBLIC_HOME_SLUG ?? siteName),
  ) || "holiday-home";
