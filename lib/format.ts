/**
 * Pure formatting helpers. No React, no chain access — safe to unit-test.
 * Everything returns plain strings/numbers so results are React-safe.
 */

/** "GAJEHCEV…IVXD" style truncation for addresses, hashes, tx ids. */
export function shortAddress(
  value: string,
  head = 5,
  tail = 5,
): string {
  if (!value) return "";
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

export const shortHash = (hash: string): string => shortAddress(hash, 6, 6);

/** Buffer → hex string (no 0x); hex strings pass through normalized. */
export function hex(value: Buffer | Uint8Array | string): string {
  if (typeof value === "string") return value.replace(/^0x/, "").toLowerCase();
  return Buffer.from(value).toString("hex");
}

/**
 * i128 token amount (stroops) → human string. Uses BigInt math only.
 *   formatAmount("425000000") → "42.5"
 */
export function formatAmount(amount: string | bigint, decimals = 7): string {
  const value = BigInt(amount);
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const base = 10n ** BigInt(decimals);
  const whole = (abs / base).toString();
  const frac = (abs % base).toString().padStart(decimals, "0").replace(/0+$/, "");
  return `${negative ? "-" : ""}${whole}${frac ? `.${frac}` : ""}`;
}

/** Human amount input → i128 stroops string. Throws on invalid input. */
export function parseAmountToI128(input: string, decimals = 7): string {
  const trimmed = input.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) throw new Error("Enter a positive amount.");
  const [whole, frac = ""] = trimmed.split(".");
  if (frac.length > decimals) {
    throw new Error(`At most ${decimals} decimal places are supported.`);
  }
  const paddedFrac = frac.padEnd(decimals, "0");
  return `${whole}${paddedFrac}`.replace(/^0+(?=\d)/, "");
}

function splitDuration(seconds: number): { d: number; h: number; m: number } {
  const d = Math.floor(seconds / 86_400);
  const h = Math.floor((seconds % 86_400) / 3_600);
  const m = Math.floor((seconds % 3_600) / 60);
  return { d, h, m };
}

/** "in 23h 42m" / "in 5d" / "just now" for a future epoch (seconds). */
export function timeUntil(epochSec: number, nowSec = Date.now() / 1000): string {
  const delta = Math.floor(epochSec - nowSec);
  if (delta <= 0) return "expired";
  const { d, h, m } = splitDuration(delta);
  if (d > 0) return `in ${d}d${h > 0 ? ` ${h}h` : ""}`;
  if (h > 0) return `in ${h}h${m > 0 ? ` ${m}m` : ""}`;
  if (m > 0) return `in ${m}m`;
  return "in seconds";
}

/** Short past-tense label: "just now" / "18m ago" / "5h ago" / "3d ago". */
export function relativeTime(epochSec: number, nowSec = Date.now() / 1000): string {
  const delta = Math.max(0, Math.floor(nowSec - epochSec));
  if (delta < 60) return "just now";
  if (delta < 3_600) return `${Math.floor(delta / 60)}m ago`;
  if (delta < 86_400) return `${Math.floor(delta / 3_600)}h ago`;
  if (delta < 7 * 86_400) return `${Math.floor(delta / 86_400)}d ago`;
  return formatDate(epochSec);
}

/** "22 Aug 2026, 14:05" */
export function formatDate(epochSec: number): string {
  return new Date(epochSec * 1000).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function timeGreeting(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour < 5) return "Working late";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** Minimal RFC-style CSV builder (quotes cells containing , " or \n). */
export function toCsv(headers: string[], rows: (string | number)[][]): string {
  const escape = (cell: string | number) => {
    const s = String(cell);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [
    headers.map(escape).join(","),
    ...rows.map((row) => row.map(escape).join(",")),
  ].join("\n");
}
