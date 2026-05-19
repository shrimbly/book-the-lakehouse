import { getCurrentIdentityId } from "@/lib/identity";

function configuredMaryIds(): string[] {
  const raw = process.env.MARY_IDS?.trim();
  if (!raw) return ["mary"];
  return raw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

export function isMaryId(personId: string | null | undefined): boolean {
  if (!personId) return false;
  return configuredMaryIds().includes(personId);
}

export async function getCurrentMaryId(): Promise<string | null> {
  const id = await getCurrentIdentityId();
  return isMaryId(id) ? id : null;
}
