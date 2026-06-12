import { describe, expect, it, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { prismaMock, resetPrismaMock } from "../utils/prisma-mock";

const {
  createFortnoxOrderMock,
  uploadFortnoxOrderConfirmationMock,
  getServerSessionMock,
} = vi.hoisted(() => ({
  createFortnoxOrderMock: vi.fn(async () => ({
    documentNumber: "FNX-9000",
  })),
  uploadFortnoxOrderConfirmationMock: vi.fn(async () => ({
    key: "fortnox/FNX-9000.pdf",
    fileId: "fnx-pdf-1",
  })),
  getServerSessionMock: vi.fn(async () => ({
    user: {
      id: "user-123",
      name: "Integration Tester",
      email: "tester@example.com",
      role: "ADMIN",
    },
  })),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("next-auth", () => ({
  getServerSession: getServerSessionMock,
}));
vi.mock("@/lib/fortnox", () => ({
  createFortnoxOrder: createFortnoxOrderMock,
  uploadFortnoxOrderConfirmation: uploadFortnoxOrderConfirmationMock,
}));

import { POST as createOrderHandler } from "@/app/api/orders/route";
import { createFortnoxOrder, uploadFortnoxOrderConfirmation } from "@/lib/fortnox";

describe("POST /api/orders", () => {
  beforeEach(() => {
    resetPrismaMock();
    vi.clearAllMocks();
    createFortnoxOrderMock.mockResolvedValue({ documentNumber: "FNX-9000" });
    uploadFortnoxOrderConfirmationMock.mockResolvedValue({
      key: "fortnox/FNX-9000.pdf",
      fileId: "fnx-pdf-1",
    });
    getServerSessionMock.mockResolvedValue({
      user: {
        id: "user-123",
        name: "Integration Tester",
        email: "tester@example.com",
        role: "ADMIN",
      },
    });
  });

  it("creates an order, persists calendar tracks, and syncs with Fortnox", async () => {
    const manualStart = new Date("2025-10-19T08:00:00.000Z");
    const manualEnd = new Date("2025-10-19T09:30:00.000Z");

    const body = {
      title: "Skylt montage",
      customerName: "ACME AB",
      tracks: ["A"],
      autoSchedule: false,
      manualA: {
        start: manualStart.toISOString(),
        end: manualEnd.toISOString(),
      },
      customerNumber: "10001",
      deliveryName: "ACME HQ",
      deliveryStreet: "Industrigatan 1",
      deliveryZip: "12345",
      deliveryCity: "Stockholm",
      fortnox: {
        OrderRows: [
          {
            ArticleNumber: "SKYLT-01",
            Description: "Skylt montage",
            OrderedQuantity: 2,
            Price: 1995,
            Unit: "st",
          },
        ],
      },
    };

    const request = new NextRequest("http://localhost/api/orders", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    });

    const response = await createOrderHandler(request);
    expect(response.status).toBe(200);

    const payload = await response.json();
    expect(payload.ok).toBe(true);
    expect(payload.fortnox.documentNumber).toBe("FNX-9000");
    expect(payload.schedule.A).toEqual({
      start: manualStart.toISOString(),
      end: manualEnd.toISOString(),
    });

    expect(createFortnoxOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        CustomerNumber: "10001",
        OrderRows: [
          expect.objectContaining({
            ArticleNumber: "SKYLT-01",
            OrderedQuantity: 2,
            Price: 1995,
          }),
        ],
      }),
      undefined
    );

    expect(prismaMock.order.create).toHaveBeenCalledTimes(1);
    const orderCreateCall = prismaMock.order.create.mock.calls[0]?.[0];
    const trackCreate = orderCreateCall?.data?.tracks?.create?.[0];
    expect(trackCreate?.track).toBe("A");
    expect(trackCreate?.plannedStartAt).toBeInstanceOf(Date);
    expect(trackCreate?.plannedStartAt?.toISOString()).toBe(manualStart.toISOString());
    expect(trackCreate?.plannedEndAt?.toISOString()).toBe(manualEnd.toISOString());

    const eventCreate = orderCreateCall?.data?.events?.create?.[0];
    expect(eventCreate?.title).toBe("Skylt montage - ACME AB");
    expect(eventCreate?.track).toBe("A");

    expect(prismaMock.fortnoxOrderLink.create).toHaveBeenCalledWith({
      data: { orderId: "FNX-9000", documentNumber: "FNX-9000" },
    });

    expect(uploadFortnoxOrderConfirmation).toHaveBeenCalledWith("FNX-9000", undefined);
    expect(payload.file).toEqual({
      key: "fortnox/FNX-9000.pdf",
      id: "fnx-pdf-1",
    });
    expect(getServerSessionMock).toHaveBeenCalled();
  });
});
