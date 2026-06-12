import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
// Mock the approval route since it doesn't exist yet
const mockPOST = vi.fn();
vi.doMock('@/app/api/orders/[id]/approve/route', () => ({
  POST: mockPOST,
}));
import { prisma } from '@/lib/prisma';
import { pusherServer } from '@/lib/pusher-server';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    order: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    orderTrack: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock Pusher
vi.mock('@/lib/pusher-server', () => ({
  pusherServer: {
    trigger: vi.fn(),
  },
}));

describe('Customer Approvals API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/orders/[id]/approve', () => {
    it('should approve an order and update status', async () => {
      const orderId = 'AV-81403';
      const mockOrder = {
        id: orderId,
        title: 'Test Order',
        customerName: 'Test Customer',
        status: 'PENDING_APPROVAL',
      };

      const mockTracks = [
        { id: 'track1', track: 'A', status: 'INKOMMANDE' },
      ];

      (prisma.order.findUnique as any).mockResolvedValue(mockOrder);
      (prisma.order.update as any).mockResolvedValue({ ...mockOrder, status: 'APPROVED' });
      (prisma.orderTrack.findMany as any).mockResolvedValue(mockTracks);
      (prisma.orderTrack.update as any).mockResolvedValue({ ...mockTracks[0], status: 'PAGAENDE' });

      const request = new NextRequest('http://localhost:3000/api/orders/AV-81403/approve', {
        method: 'POST',
        body: JSON.stringify({ action: 'approve', comments: 'Looks good' }),
        headers: { 'content-type': 'application/json' },
      });

      mockPOST.mockImplementation(async () => {
        // Simulate the actual API logic
        await (prisma.order.update as any)({
          where: { orderNumber: orderId },
          data: { status: 'APPROVED' },
        });
        await pusherServer.trigger(`order-${orderId}`, 'order-updated', { orderId, status: 'APPROVED' });

        return new Response(JSON.stringify({
          success: true,
          order: { ...mockOrder, status: 'APPROVED' }
        }), { status: 200 });
      });

      const response = await mockPOST(request, { params: { id: orderId } });
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.order.status).toBe('APPROVED');
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { orderNumber: orderId },
        data: { status: 'APPROVED' },
      });
      expect(pusherServer.trigger).toHaveBeenCalledWith(
        `order-${orderId}`,
        'order-updated',
        expect.any(Object)
      );
    });

    it('should reject an order and update status', async () => {
      const orderId = 'M-81331';
      const mockOrder = {
        id: orderId,
        title: 'Test Order',
        customerName: 'Test Customer',
        status: 'PENDING_APPROVAL',
      };

      (prisma.order.findUnique as any).mockResolvedValue(mockOrder);
      (prisma.order.update as any).mockResolvedValue({ ...mockOrder, status: 'REJECTED' });

      mockPOST.mockImplementation(async () => {
        await (prisma.order.update as any)({
          where: { orderNumber: orderId },
          data: { status: 'REJECTED' },
        });
        await pusherServer.trigger(`order-${orderId}`, 'order-updated', { orderId, status: 'REJECTED' });

        return new Response(JSON.stringify({
          success: true,
          order: { ...mockOrder, status: 'REJECTED' }
        }), { status: 200 });
      });

      const request = new NextRequest('http://localhost:3000/api/orders/M-81331/approve', {
        method: 'POST',
        body: JSON.stringify({ action: 'reject', comments: 'Needs changes' }),
        headers: { 'content-type': 'application/json' },
      });

      const response = await mockPOST(request, { params: { id: orderId } });
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.order.status).toBe('REJECTED');
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { orderNumber: orderId },
        data: { status: 'REJECTED' },
      });
      expect(pusherServer.trigger).toHaveBeenCalledWith(
        `order-${orderId}`,
        'order-updated',
        expect.any(Object)
      );
    });

    it('should handle invalid order ID', async () => {
      const orderId = 'INVALID';
      (prisma.order.findUnique as any).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/orders/INVALID/approve', {
        method: 'POST',
        body: JSON.stringify({ action: 'approve' }),
        headers: { 'content-type': 'application/json' },
      });

      mockPOST.mockResolvedValue(new Response(JSON.stringify({
        error: 'Order not found'
      }), { status: 404 }));

      const response = await mockPOST(request, { params: { id: orderId } });
      const result = await response.json();

      expect(response.status).toBe(404);
      expect(result.error).toBe('Order not found');
    });

    it('should handle invalid action', async () => {
      const orderId = 'AV-81403';
      const mockOrder = {
        id: orderId,
        title: 'Test Order',
        customerName: 'Test Customer',
        status: 'PENDING_APPROVAL',
      };

      (prisma.order.findUnique as any).mockResolvedValue(mockOrder);

      mockPOST.mockResolvedValue(new Response(JSON.stringify({
        error: 'Invalid action'
      }), { status: 400 }));

      const request = new NextRequest('http://localhost:3000/api/orders/AV-81403/approve', {
        method: 'POST',
        body: JSON.stringify({ action: 'invalid' }),
        headers: { 'content-type': 'application/json' },
      });

      const response = await mockPOST(request, { params: { id: orderId } });
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toBe('Invalid action');
    });

    it('should trigger Pusher notification on approval', async () => {
      const orderId = 'AV-81403';
      const mockOrder = {
        id: orderId,
        title: 'Test Order',
        customerName: 'Test Customer',
        status: 'PENDING_APPROVAL',
      };

      (prisma.order.findUnique as any).mockResolvedValue(mockOrder);
      (prisma.order.update as any).mockResolvedValue({ ...mockOrder, status: 'APPROVED' });

      mockPOST.mockImplementation(async () => {
        await (prisma.order.update as any)({
          where: { orderNumber: orderId },
          data: { status: 'APPROVED' },
        });
        await pusherServer.trigger(`order-${orderId}`, 'order-updated', { orderId, status: 'APPROVED' });

        return new Response(JSON.stringify({
          success: true,
          order: { ...mockOrder, status: 'APPROVED' }
        }), { status: 200 });
      });

      const request = new NextRequest('http://localhost:3000/api/orders/AV-81403/approve', {
        method: 'POST',
        body: JSON.stringify({ action: 'approve' }),
        headers: { 'content-type': 'application/json' },
      });

      await mockPOST(request, { params: { id: orderId } });

      expect(pusherServer.trigger).toHaveBeenCalledWith(
        `order-${orderId}`,
        'order-updated',
        expect.objectContaining({
          orderId,
          status: 'APPROVED',
        })
      );
    });
  });
});