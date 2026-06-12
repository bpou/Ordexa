import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock, resetPrismaMock } from "../utils/prisma-mock";

const { getServerSessionMock } = vi.hoisted(() => ({
  getServerSessionMock: vi.fn(async () => ({
    user: { id: "user-123", role: "ADMIN" },
  })),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("next-auth", () => ({
  getServerSession: getServerSessionMock,
}));

import {
  POST as createFreeEvent,
  GET as listFreeEvents,
} from "@/app/api/free-events/route";
import {
  PATCH as updateFreeEvent,
  DELETE as deleteFreeEvent,
} from "@/app/api/free-events/[id]/route";

describe("Free events API", () => {
  beforeEach(() => {
    resetPrismaMock();
    vi.clearAllMocks();
    getServerSessionMock.mockResolvedValue({ user: { id: "user-123", role: "ADMIN" } });
  });

  it("handles personal free-event CRUD", async () => {
    const start = new Date("2025-10-20T09:00:00.000Z").toISOString();
    const end = new Date("2025-10-20T10:30:00.000Z").toISOString();

    const createRequest = new Request("http://localhost/api/free-events", {
      method: "POST",
      body: JSON.stringify({
        track: "A",
        title: "Free slot",
        visibility: "PERSONAL",
        label: "KAN_FLYTTAS",
        repeat: "none",
        start,
        end,
      }),
      headers: { "content-type": "application/json" },
    });

    const createResponse = await createFreeEvent(createRequest);
    expect(createResponse.status).toBe(200);
    const createPayload = await createResponse.json();
    expect(createPayload.ok).toBe(true);
    const createdId = createPayload.created.id;

    expect(prismaMock.personalCalendarEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: "Free slot",
        track: "A",
        visibility: "PERSONAL",
        ownerUserId: "user-123",
      }),
    });

    const patchRequest = new Request(`http://localhost/api/free-events/${createdId}`, {
      method: "PATCH",
      body: JSON.stringify({
        title: "Updated slot",
        visibility: "PUBLIC",
      }),
      headers: { "content-type": "application/json" },
    });
    const patchResponse = await updateFreeEvent(patchRequest, {
      params: Promise.resolve({ id: createdId }),
    });
    expect(patchResponse.status).toBe(200);
    const patchPayload = await patchResponse.json();
    expect(patchPayload.updated.title).toBe("Updated slot");
    expect(patchPayload.updated.visibility).toBe("PUBLIC");

    const listResponse = await listFreeEvents(
      new Request("http://localhost/api/free-events?track=A", { method: "GET" })
    );
    const listPayload = await listResponse.json();
    expect(listPayload.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: createdId,
          title: "Updated slot",
          extendedProps: expect.objectContaining({
            visibility: "PUBLIC",
            label: "KAN_FLYTTAS",
          }),
        }),
      ])
    );

    const deleteResponse = await deleteFreeEvent(
      new Request(`http://localhost/api/free-events/${createdId}`, { method: "DELETE" }),
      {
        params: Promise.resolve({ id: createdId }),
      }
    );
    expect(deleteResponse.status).toBe(200);
    const deletePayload = await deleteResponse.json();
    expect(deletePayload).toEqual({ ok: true, deleted: true });
    expect(prismaMock.personalCalendarEvent.delete).toHaveBeenCalledWith({
      where: { id: createdId },
    });
  });
});
