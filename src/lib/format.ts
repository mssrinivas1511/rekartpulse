import { format, parseISO } from "date-fns";

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatINR(value: number): string {
  return inr.format(value ?? 0);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-IN").format(value ?? 0);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return format(parseISO(value), "d MMM, yyyy");
  } catch {
    return value;
  }
}

/** Matches the Rekart activity-log style: "Aug 7, 2026, 8:54 AM" */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return format(parseISO(value), "MMM d, yyyy, h:mm a");
  } catch {
    return value;
  }
}
