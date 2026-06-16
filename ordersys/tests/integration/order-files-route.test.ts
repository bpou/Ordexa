import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prismaMock, resetPrismaMock } from "../utils/prisma-mock";

const {
  getServerSessionMock,
  uploadStoredFileMock,
  deleteStoredFileMock,
  pusherTriggerMock,
} = vi.hoisted(() => ({
  getServerSessionMock: vi.fn(async () => ({
    user: { id: "user-123", role: "ADMIN" },
  })),
  uploadStoredFileMock: vi.fn(async ({ key }: { key: string }) => ({
    key,
    url: `https://mock-s3/${key}`,
    expiresAt: Date.now() + 600_000,
  })),
  deleteStoredFileMock: vi.fn(async () => undefined),
  pusherTriggerMock: vi.fn(async () => undefined),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("next-auth", () => ({
  getServerSession: getServerSessionMock,
}));
vi.mock("@/lib/file-storage", () => ({
  uploadStoredFile: uploadStoredFileMock,
  deleteStoredFile: deleteStoredFileMock,
}));
vi.mock("@/lib/pusher-server", () => ({
  pusherServer: {
    trigger: pusherTriggerMock,
  },
}));

import { POST as uploadFile } from "@/app/api/orders/[id]/files/route";
import { DELETE as deleteFile } from "@/app/api/orders/[id]/files/[fileId]/route";

describe("Order file routes", () => {
  beforeEach(() => {
    resetPrismaMock();
    vi.clearAllMocks();
    getServerSessionMock.mockResolvedValue({ user: { id: "user-123", role: "ADMIN" } });
  });

  it("uploads and deletes an order file via S3", async () => {
    const orderId = "ORD-100";
    await prismaMock.order.create({
      data: {
        orderNumber: orderId,
        title: "Test order",
      },
    });

    const form = new FormData();
    const fileName = "Nästa steg.pdf";
    const file = new File([Buffer.from("test")], fileName, { type: "application/pdf" });
    form.append("file", file);
    form.append("track", "a");

    const uploadRequest = new NextRequest(`http://localhost/api/orders/${orderId}/files`, {
      method: "POST",
      body: form,
      // Node fetch requires duplex when streaming bodies (typings lag behind).
      duplex: "half",
    } as any);

    const uploadResponse = await uploadFile(uploadRequest, {
      params: Promise.resolve({ id: orderId }),
    });

    expect(uploadResponse.status).toBe(200);
    const uploadPayload = await uploadResponse.json();
    expect(uploadPayload.ok).toBe(true);
    expect(uploadPayload.file.filename).toBe("nasta-steg.pdf");
    expect(uploadPayload.file.track).toBe("A");

    expect(uploadStoredFileMock).toHaveBeenCalledWith(
      expect.objectContaining({
        key: expect.stringMatching(/^orders\/ORD-100\//),
        contentType: "application/pdf",
      })
    );
    expect(prismaMock.file.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orderId,
        filename: "nasta-steg.pdf",
        track: "A",
      }),
    });
    expect(pusherTriggerMock).toHaveBeenCalledWith(
      `order-${orderId}`,
      "file:created",
      expect.objectContaining({
        filename: "nasta-steg.pdf",
      })
    );

    const createdId = uploadPayload.file.id;
    const deleteRequest = new NextRequest(
      `http://localhost/api/orders/${orderId}/files/${createdId}`,
      { method: "DELETE" }
    );
    const deleteResponse = await deleteFile(
      deleteRequest,
      {
        params: Promise.resolve({ id: orderId, fileId: createdId }),
      }
    );
    expect(deleteResponse.status).toBe(200);
    const deletePayload = await deleteResponse.json();
    expect(deletePayload).toEqual({ ok: true });
    expect(deleteStoredFileMock).toHaveBeenCalledWith(
      expect.stringMatching(/^orders\/ORD-100\//)
    );
    expect(prismaMock.file.delete).toHaveBeenCalledWith({
      where: { id: createdId },
    });
    expect(pusherTriggerMock).toHaveBeenCalledWith(
      `order-${orderId}`,
      "file:deleted",
      { id: createdId }
    );
  });
});
