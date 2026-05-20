import { PALETTE, isPaletteColor } from "@/lib/palette";

export function normalizePersonName(first: string): string {
  return first.trim().replace(/\s+/g, " ");
}

export function validatePersonName(
  first: string,
): { ok: true; first: string } | { error: string } {
  const normalized = normalizePersonName(first);
  if (!normalized) return { error: "Name can't be empty" };
  if (normalized.length > 64) return { error: "Name too long" };
  return { ok: true, first: normalized };
}

export function slugifyPersonId(first: string): string {
  return (
    normalizePersonName(first)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "person"
  );
}

export function generatePersonId(first: string, existingIds: string[]): string {
  const base = slugifyPersonId(first);
  const used = new Set(existingIds);
  if (!used.has(base)) return base;

  for (let suffix = 2; suffix < 1000; suffix += 1) {
    const candidate = `${base}-${suffix}`;
    if (!used.has(candidate)) return candidate;
  }

  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

export function choosePersonColor(
  requested: string | undefined,
  existingColors: string[],
): string | { error: string } {
  if (requested !== undefined) {
    if (!isPaletteColor(requested)) {
      return { error: "That color isn't in the palette" };
    }
    return requested;
  }

  return (
    PALETTE.find((color) => !existingColors.includes(color)) ??
    PALETTE[existingColors.length % PALETTE.length]
  );
}
