const STORAGE_KEY = "ordina:new-entry-transfer";
const EXPIRATION_MS = 5 * 60 * 1000;

export type EntryTransferEnvelope = {
  from: "quote" | "order";
  to: "quote" | "order";
  ts: number;
  data: Record<string, unknown>;
};

type TransferInput = Pick<EntryTransferEnvelope, "from" | "to" | "data">;

export function stashEntryTransfer({ from, to, data }: TransferInput) {
  if (typeof window === "undefined") return;

  const envelope: EntryTransferEnvelope = {
    from,
    to,
    data,
    ts: Date.now(),
  };

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

export function popEntryTransfer(expectedTo: EntryTransferEnvelope["to"]) {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as EntryTransferEnvelope;
    if (parsed.to !== expectedTo) return null;

    if (Date.now() - (parsed.ts ?? 0) > EXPIRATION_MS) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    window.localStorage.removeItem(STORAGE_KEY);
    return parsed;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}
