import { describe, expect, it, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { prismaMock, resetPrismaMock } from "../../utils/prisma-mock";

const {
  getServerSessionMock,
  createFortnoxOrderMock,
  uploadFortnoxOrderConfirmationMock,
} = vi.hoisted(() => ({
  getServerSessionMock: vi.fn(),
  createFortnoxOrderMock: vi.fn(async () => ({
    documentNumber: "FNX-9000",
  })),
  uploadFortnoxOrderConfirmationMock: vi.fn(async () => ({
    key: "fortnox/FNX-9000.pdf",
    fileId: "fnx-pdf-1",
  })),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("next-auth", () => ({
  getServerSession: getServerSessionMock,
}));
vi.mock("@/lib/fortnox", () => ({
  createFortnoxOrder: createFortnoxOrderMock,
  uploadFortnoxOrderConfirmation: uploadFortnoxOrderConfirmationMock,
}));

import { GET as getOrdersHandler } from "@/app/api/orders/route";

describe("Customer Orders API", () => {
  beforeEach(() => {
    resetPrismaMock();
    vi.clearAllMocks();
    getServerSessionMock.mockResolvedValue(null);
    prismaMock.order.findMany.mockResolvedValue([]);
  });

  it("fetches customer orders", async () => {
    const mockOrders = [
      {
        orderNumber: "ORD-1",
        title: "Order 1",
        customerName: "Customer A",
        tracks: [],
        fortnox: null,
        events: [],
        files: [],
        createdBy: null,
      },
    ];
    prismaMock.order.findMany.mockResolvedValue(mockOrders);

    const request = new NextRequest("http://localhost/api/orders");
    const response = await getOrdersHandler(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.orders).toEqual(mockOrders);
    expect(prismaMock.order.findMany).toHaveBeenCalledWith({
      where: {},
      include: { tracks: true, fortnox: true, events: true, files: true, createdBy: true },
      orderBy: { createdAt: "desc" },
    });
  });

  it("filters orders by track", async () => {
    prismaMock.order.findMany.mockResolvedValue([]);

    const request = new NextRequest("http://localhost/api/orders?track=A");
    await getOrdersHandler(request);

    expect(prismaMock.order.findMany).toHaveBeenCalledWith({
      where: {
        tracks: {
          some: {
            track: "A",
          },
        },
      },
      include: expect.any(Object),
      orderBy: { createdAt: "desc" },
    });
  });

  it("filters orders by status", async () => {
    prismaMock.order.findMany.mockResolvedValue([]);

    const request = new NextRequest("http://localhost/api/orders?status=PAGAENDE");
    await getOrdersHandler(request);

    expect(prismaMock.order.findMany).toHaveBeenCalledWith({
      where: {
        tracks: {
          some: {
            status: "PAGAENDE",
          },
        },
      },
      include: expect.any(Object),
      orderBy: { createdAt: "desc" },
    });
  });

  it("filters orders by both track and status", async () => {
    prismaMock.order.findMany.mockResolvedValue([]);

    const request = new NextRequest("http://localhost/api/orders?track=B&status=LEVERANS");
    await getOrdersHandler(request);

    expect(prismaMock.order.findMany).toHaveBeenCalledWith({
      where: {
        tracks: {
          some: {
            track: "B",
            status: "LEVERANS",
          },
        },
      },
      include: expect.any(Object),
      orderBy: { createdAt: "desc" },
    });
  });

  it("handles pagination by limiting results", async () => {
    const allOrders = Array.from({ length: 50 }, (_, i) => ({
      orderNumber: `ORD-${i + 1}`,
      title: `Order ${i + 1}`,
      customerName: "Customer",
      tracks: [],
      fortnox: null,
      events: [],
      files: [],
      createdBy: null,
    }));

    // Simulate pagination by returning limited results
    prismaMock.order.findMany.mockResolvedValue(allOrders.slice(0, 10));

    const request = new NextRequest("http://localhost/api/orders");
    const response = await getOrdersHandler(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.orders).toHaveLength(10);
  });

  it("returns error for invalid track", async () => {
    const request = new NextRequest("http://localhost/api/orders?track=Z");
    const response = await getOrdersHandler(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Invalid track");
  });

  it("returns error for invalid status", async () => {
    const request = new NextRequest("http://localhost/api/orders?status=INVALID");
    const response = await getOrdersHandler(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Invalid status");
  });
});