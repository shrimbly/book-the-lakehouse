import { cookies } from "next/headers";

export const GATE_COOKIE = "kuratau-gate";

export async function isGatePassed(): Promise<boolean> {
  const c = await cookies();
  return c.get(GATE_COOKIE)?.value === "ok";
}
