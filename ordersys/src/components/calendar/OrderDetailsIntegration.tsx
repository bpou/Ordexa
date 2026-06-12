"use client";

import { useState, useEffect } from "react";

interface OrderDetails {
  customerName: string;
  customerNumber: string;
  orderTitle: string;
  estimatedDuration: number;
  orderId?: string;
  articles?: Array<{
    articleNumber: string;
    description: string;
    quantity: number;
  }>;
  tracks?: string[];
  location?: string;
  notes?: string;
}

interface OrderDetailsIntegrationProps {
  orderDetails: OrderDetails;
  onOrderDataChange?: (orderDetails: OrderDetails) => void;
  readOnly?: boolean;
}

export function OrderDetailsIntegration({
  orderDetails,
  onOrderDataChange,
  readOnly = false,
}: OrderDetailsIntegrationProps) {
  const [localOrderDetails, setLocalOrderDetails] = useState(orderDetails);

  // Update local state when props change
  useEffect(() => {
    setLocalOrderDetails(orderDetails);
  }, [orderDetails]);

  // Handle order details changes
  const handleOrderDetailsChange = (updates: Partial<OrderDetails>) => {
    const updatedDetails = { ...localOrderDetails, ...updates };
    setLocalOrderDetails(updatedDetails);
    onOrderDataChange?.(updatedDetails);
  };

  // Format duration
  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours === 0) return `${mins} min`;
    if (mins === 0) return `${hours} h`;
    return `${hours} h ${mins} min`;
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-neutral-900">Orderdetaljer</h3>
      
      {/* Customer Information */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Kundnamn
          </label>
          <div className="px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg">
            {localOrderDetails.customerName}
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Kundnummer
          </label>
          <div className="px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg">
            {localOrderDetails.customerNumber}
          </div>
        </div>
      </div>

      {/* Order Information */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Ordertitel
          </label>
          <div className="px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg">
            {localOrderDetails.orderTitle}
          </div>
        </div>

        {localOrderDetails.orderId && (
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
            Order-ID
            </label>
            <div className="px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg font-mono text-sm">
              {localOrderDetails.orderId}
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Beräknad varaktighet
          </label>
          <div className="px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg">
            {formatDuration(localOrderDetails.estimatedDuration)}
          </div>
        </div>
      </div>

      {/* Articles */}
      {localOrderDetails.articles && localOrderDetails.articles.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Artiklar ({localOrderDetails.articles.length})
          </label>
          <div className="space-y-2">
            {localOrderDetails.articles.map((article, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-neutral-50 border border-neutral-200 rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-neutral-900 truncate">
                    {article.description}
                  </div>
                  <div className="text-xs text-neutral-600">
                    Art. nr: {article.articleNumber}
                  </div>
                </div>
                <div className="ml-3 text-sm font-medium text-neutral-700">
                  {article.quantity} st
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tracks */}
      {localOrderDetails.tracks && localOrderDetails.tracks.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Spår
          </label>
          <div className="flex flex-wrap gap-2">
            {localOrderDetails.tracks.map((track, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-neutral-100 border border-neutral-300 rounded-lg text-sm font-medium text-neutral-700"
              >
                Spår {track}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Location */}
      {localOrderDetails.location && (
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Plats
          </label>
          <div className="px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg">
            {localOrderDetails.location}
          </div>
        </div>
      )}

      {/* Notes */}
      {localOrderDetails.notes && (
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Anteckningar
          </label>
          <div className="px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm">
            {localOrderDetails.notes}
          </div>
        </div>
      )}

      {/* Editable fields (if not read-only) */}
      {!readOnly && onOrderDataChange && (
        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <h4 className="font-medium text-amber-900 mb-2">Justera orderdetaljer</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-amber-700 mb-1">
                Plats
              </label>
              <input
                type="text"
                value={localOrderDetails.location || ''}
                onChange={(e) => handleOrderDetailsChange({ location: e.target.value })}
                className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
                placeholder="Ange plats för händelsen"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-amber-700 mb-1">
                Anteckningar för kalenderhändelse
              </label>
              <textarea
                value={localOrderDetails.notes || ''}
                onChange={(e) => handleOrderDetailsChange({ notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white resize-none"
                placeholder="Lägg till anteckningar som ska synas i kalendern..."
              />
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-2">
          <span className="text-blue-600 text-sm">ℹ️</span>
          <div className="text-sm text-blue-800">
            <div className="font-medium">Orderkoppling</div>
            <div className="mt-1">
              Denna händelse kommer att kopplas till order {localOrderDetails.orderId || localOrderDetails.customerNumber}.
              {localOrderDetails.estimatedDuration && (
                <span> Beräknad varaktighet: {formatDuration(localOrderDetails.estimatedDuration)}.</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to create order details from various sources
export function createOrderDetailsFromSource(source: {
  customer?: { name: string; number: string };
  order?: { title: string; id: string };
  articles?: Array<{ articleNumber: string; description: string; quantity: number }>;
  tracks?: string[];
  estimatedDuration?: number;
  location?: string;
  notes?: string;
}): OrderDetails {
  return {
    customerName: source.customer?.name || '',
    customerNumber: source.customer?.number || '',
    orderTitle: source.order?.title || '',
    orderId: source.order?.id,
    articles: source.articles || [],
    tracks: source.tracks || [],
    estimatedDuration: source.estimatedDuration || 60, // Default 1 hour
    location: source.location || '',
    notes: source.notes || '',
  };
}