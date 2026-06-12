const STORAGE_KEY = "ordina.recent-open-orders";
const MAX_RECENT = 20;

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getRecentOrderIds(limit = 6): string[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is string => typeof value === "string" && value.trim().length > 0).slice(0, Math.max(0, limit));
  } catch {
    return [];
  }
}

export function recordRecentOrder(orderNumber: string) {
  if (!canUseStorage()) return;
  const normalized = orderNumber.trim();
  if (!normalized) return;

  try {
    const prev = getRecentOrderIds(MAX_RECENT);
    const next = [normalized, ...prev.filter((id) => id !== normalized)].slice(0, MAX_RECENT);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage errors (private mode/quota/etc).
  }
}
