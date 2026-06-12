"use client";
import Pusher from "pusher-js";

const KEY = process.env.NEXT_PUBLIC_PUSHER_KEY!;
const CLUSTER = process.env.NEXT_PUBLIC_PUSHER_CLUSTER!;

let _pusher: Pusher | null = null;

export function getPusher(): Pusher {
  if (!_pusher) {
    if (!KEY || !CLUSTER) {
      console.warn("Pusher: saknar NEXT_PUBLIC_PUSHER_KEY/CLUSTER i .env");
    }
    _pusher = new Pusher(KEY, {
      cluster: CLUSTER,
      // optional:
      // enableStats: false,
    });
  }
  return _pusher;
}
