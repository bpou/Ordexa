import { Prisma, Track, TrackStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type HistoryDb = typeof prisma | Prisma.TransactionClient;

type HistoryActor = {
  id?: string | null;
  name?: string | null;
  email?: string | null;
};

export type OrderHistoryType =
  | "billing"
  | "comment"
  | "file"
  | "fortnox"
  | "notes"
  | "order"
  | "status"
  | "task"
  | "time";

const TRACK_LABELS: Record<Track, string> = {
  A: "Atelje",
  B: "Verkstad",
  C: "Montage",
  D: "Bildekor",
  SHARED: "Delad",
};

const STATUS_LABELS: Record<TrackStatus, string> = {
  INKOMMANDE: "Inkommande",
  PAGAENDE: "Pågående",
  LEVERANS: "Leverans",
  AVSLUTAD: "Avslutad",
  PALACK: "På lås",
};

export function orderHistoryActorName(actor: HistoryActor | null | undefined) {
  return actor?.name || actor?.email || "Okänd användare";
}

export function trackHistoryLabel(track: Track) {
  return TRACK_LABELS[track] ?? track;
}

export function statusHistoryLabel(status: TrackStatus) {
  return STATUS_LABELS[status] ?? status;
}

export async function createOrderHistoryEvent({
  db = prisma,
  orderId,
  type,
  title,
  description,
  actor,
  metadata,
}: {
  db?: HistoryDb;
  orderId: string;
  type: OrderHistoryType;
  title: string;
  description: string;
  actor?: HistoryActor | null;
  metadata?: Prisma.InputJsonValue;
}) {
  return db.orderHistoryEvent.create({
    data: {
      orderId,
      type,
      title,
      description,
      actorId: actor?.id ?? null,
      actorName: actor ? orderHistoryActorName(actor) : null,
      metadata: metadata ?? Prisma.JsonNull,
    },
  });
}
