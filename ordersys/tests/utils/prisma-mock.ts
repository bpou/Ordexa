import { randomUUID } from "crypto";
import { vi } from "vitest";

type OrderTrackCreate = {
  track: string;
  colorHex?: string | null;
  plannedStartAt?: Date | null;
  plannedEndAt?: Date | null;
  status?: string;
};

type CalendarEventCreate = {
  track: string;
  start: Date;
  end: Date;
  title: string;
  notes: string | null;
};

type OrderRecord = {
  orderNumber: string;
  title: string;
  customerName?: string | null;
  dueDate?: Date | null;
  deliveryMethod?: string | null;
  deliveryAddress?: string | null;
  createdById?: string | null;
  createdByName?: string | null;
  tracks: OrderTrackCreate[];
  events: CalendarEventCreate[];
  createdAt?: Date;
};

type PersonalEventRecord = {
  id: string;
  title: string;
  start: Date | null;
  end: Date | null;
  allDay: boolean;
  label: string | null;
  track: string;
  visibility: string;
  ownerUserId: string | null;
  startRecur?: Date | null;
  endRecur?: Date | null;
  startTime?: string | null;
  endTime?: string | null;
  weeklyDays?: string[] | null;
};

type FileRecord = {
  id: string;
  orderId: string;
  filename: string;
  url: string;
  track: string;
  createdAt: Date;
};

const store = {
  orders: new Map<string, OrderRecord>(),
  personalEvents: new Map<string, PersonalEventRecord>(),
  files: new Map<string, FileRecord>(),
  fortnoxLinks: new Map<string, { orderId: string; documentNumber: string }>(),
};

function cloneEvent(event: PersonalEventRecord) {
  return { ...event };
}

export const prismaMock = {
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  calendarEvent: {
    findMany: vi.fn(async () => [] as Array<{ start: Date; end: Date }>),
  },
  order: {
    create: vi.fn(async ({ data }: { data: any }) => {
      const orderNumber = data.orderNumber ?? randomUUID();
      const record: OrderRecord = {
        orderNumber,
        title: data.title,
        customerName: data.customerName ?? null,
        dueDate: data.dueDate ?? null,
        deliveryMethod: data.deliveryMethod ?? null,
        deliveryAddress: data.deliveryAddress ?? null,
        createdById: data.createdById ?? null,
        createdByName: data.createdByName ?? null,
        tracks: Array.isArray(data.tracks?.create)
          ? data.tracks.create.map((track: OrderTrackCreate) => ({ ...track }))
          : [],
        events: Array.isArray(data.events?.create)
          ? data.events.create.map((event: CalendarEventCreate) => ({ ...event }))
          : [],
        createdAt: new Date(),
      };
      store.orders.set(orderNumber, record);
      return {
        ...record,
        updatedAt: new Date(),
      };
    }),
    findMany: vi.fn(async ({ where, include, orderBy }: any = {}) => {
      const orders = Array.from(store.orders.values());
      let filtered = orders;

      if (where?.tracks?.some) {
        const someCondition = where.tracks.some;
        filtered = filtered.filter(order =>
          order.tracks.some(track =>
            (!someCondition.track || track.track === someCondition.track) &&
            (!someCondition.status || track.status === someCondition.status)
          )
        );
      }

      if (orderBy?.createdAt === "desc") {
        filtered.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      }

      return filtered.map(order => ({
        ...order,
        tracks: include?.tracks ? order.tracks : undefined,
        fortnox: include?.fortnox ? null : undefined,
        events: include?.events ? order.events : undefined,
        files: include?.files ? [] : undefined,
        createdBy: include?.createdBy ? null : undefined,
      }));
    }),
  },
  fortnoxOrderLink: {
    create: vi.fn(async ({ data }: { data: { orderId: string; documentNumber: string } }) => {
      store.fortnoxLinks.set(data.orderId, { ...data });
      return { ...data };
    }),
  },
  personalCalendarEvent: {
    create: vi.fn(async ({ data }: { data: any }) => {
      const id = data.id ?? randomUUID();
      const record: PersonalEventRecord = {
        id,
        title: data.title,
        start: data.start ?? null,
        end: data.end ?? null,
        allDay: !!data.allDay,
        label: data.label ?? null,
        track: data.track,
        visibility: data.visibility ?? "PUBLIC",
        ownerUserId: data.ownerUserId ?? null,
        startRecur: data.startRecur ?? null,
        endRecur: data.endRecur ?? null,
        startTime: data.startTime ?? null,
        endTime: data.endTime ?? null,
        weeklyDays: data.weeklyDays ?? null,
      };
      store.personalEvents.set(id, record);
      return { ...record };
    }),
    findMany: vi.fn(async ({ where }: { where?: any } = {}) => {
      const rows = Array.from(store.personalEvents.values());
      const filtered = rows.filter((row) => {
        if (where?.track && row.track !== where.track) {
          return false;
        }
        if (Array.isArray(where?.OR) && where.OR.length > 0) {
          return where.OR.some((clause: any) => {
            if (clause.visibility === "PUBLIC") {
              return row.visibility === "PUBLIC";
            }
            if (clause.visibility === "PERSONAL") {
              if (row.visibility !== "PERSONAL") return false;
              if (clause.ownerUserId && row.ownerUserId !== clause.ownerUserId) {
                return false;
              }
              return true;
            }
            return false;
          });
        }
        return true;
      });
      return filtered
        .map(cloneEvent)
        .sort((a, b) => {
          const aTime = a.start?.getTime() ?? Number.POSITIVE_INFINITY;
          const bTime = b.start?.getTime() ?? Number.POSITIVE_INFINITY;
          return aTime - bTime;
        });
    }),
    findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
      const row = store.personalEvents.get(where.id);
      return row ? { ...row } : null;
    }),
    update: vi.fn(async ({ where, data }: { where: { id: string }; data: any }) => {
      const existing = store.personalEvents.get(where.id);
      if (!existing) {
        throw new Error("Record not found");
      }
      const updated: PersonalEventRecord = {
        ...existing,
        ...data,
        start: data.start ?? existing.start,
        end: data.end ?? existing.end,
        visibility: data.visibility ?? existing.visibility,
        ownerUserId:
          data.ownerUserId !== undefined ? data.ownerUserId : existing.ownerUserId,
      };
      store.personalEvents.set(where.id, updated);
      return { ...updated };
    }),
    delete: vi.fn(async ({ where }: { where: { id: string } }) => {
      const existing = store.personalEvents.get(where.id);
      if (!existing) {
        throw new Error("Record not found");
      }
      store.personalEvents.delete(where.id);
      return { ...existing };
    }),
  },
  file: {
    create: vi.fn(async ({ data }: { data: any }) => {
      const id = data.id ?? randomUUID();
      const record: FileRecord = {
        id,
        orderId: data.orderId,
        filename: data.filename,
        url: data.url,
        track: data.track,
        createdAt: new Date(),
      };
      store.files.set(id, record);
      return { ...record };
    }),
    findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
      const row = store.files.get(where.id);
      return row ? { ...row } : null;
    }),
    delete: vi.fn(async ({ where }: { where: { id: string } }) => {
      const existing = store.files.get(where.id);
      if (!existing) {
        throw new Error("Record not found");
      }
      store.files.delete(where.id);
      return { ...existing };
    }),
  },
};

function clearMockState(target: Record<string, unknown>) {
  for (const value of Object.values(target)) {
    if (typeof value === "function" && "mockClear" in value) {
      (value as any).mockClear();
    } else if (value && typeof value === "object") {
      clearMockState(value as Record<string, unknown>);
    }
  }
}

export function resetPrismaMock() {
  store.orders.clear();
  store.personalEvents.clear();
  store.files.clear();
  store.fortnoxLinks.clear();
  clearMockState(prismaMock);
}

export type PrismaMock = typeof prismaMock;
