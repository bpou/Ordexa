"use client";
import { useEffect, useRef } from "react";
import { getPusher } from "@/lib/pusher-client";

export function useOrderRealtime<TCreated = any, TDeleted = { id: string }>(
  orderId: string,
  onCreated: (data: TCreated) => void,
  onDeleted?: (data: TDeleted) => void
) {
  // Håll senaste callbacks i refs så vi kan binda en gång utan att effekten måste ha dem som deps
  const createdRef = useRef(onCreated);
  const deletedRef = useRef(onDeleted);

  useEffect(() => { createdRef.current = onCreated; }, [onCreated]);
  useEffect(() => { deletedRef.current = onDeleted; }, [onDeleted]);

  useEffect(() => {
    if (!orderId) return;

    const p = getPusher();
    if (!p) return;
    const channelName = `order-${orderId}`;
    const ch = p.subscribe(channelName);

    const handleCreated = (data: TCreated) => createdRef.current?.(data);
    const handleDeleted = (data: TDeleted) => deletedRef.current?.(data);

    ch.bind("file:created", handleCreated);
    if (deletedRef.current) ch.bind("file:deleted", handleDeleted);

    return () => {
      ch.unbind("file:created", handleCreated);
      if (deletedRef.current) ch.unbind("file:deleted", handleDeleted);
      p.unsubscribe(channelName);
    };
  }, [orderId]);
}
