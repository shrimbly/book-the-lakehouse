export type PaymentConfig = {
  costPerNight: number;
  currency: string;
  accountName: string;
  accountNumber: string;
  reference: string;
  note: string;
};

function getEnv(name: string): string {
  return process.env[name]?.trim() ?? "";
}

export function getPaymentConfig(): PaymentConfig | null {
  const rawCost = getEnv("BOOKING_COST_PER_NIGHT");
  if (!rawCost) return null;

  const costPerNight = Number(rawCost);
  if (!Number.isFinite(costPerNight) || costPerNight <= 0) {
    return null;
  }

  return {
    costPerNight,
    currency: getEnv("BOOKING_COST_CURRENCY") || "NZD",
    accountName: getEnv("PAYMENT_ACCOUNT_NAME"),
    accountNumber: getEnv("PAYMENT_ACCOUNT_NUMBER"),
    reference: getEnv("PAYMENT_REFERENCE"),
    note: getEnv("PAYMENT_NOTE"),
  };
}
