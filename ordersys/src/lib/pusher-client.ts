"use client";
import Pusher from "pusher-js";

const KEY = process.env.NEXT_PUBLIC_PUSHER_KEY;
const CLUSTER = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

let _pusher: Pusher | null = null;
let warnedMissingConfig = false;

export function getPusher(): Pusher | null {
  if (!_pusher) {
    if (!KEY || !CLUSTER) {
      if (!warnedMissingConfig) {
        console.warn("Pusher: saknar NEXT_PUBLIC_PUSHER_KEY/CLUSTER i .env");
        warnedMissingConfig = true;
      }
      return null;
    }
    _pusher = new Pusher(KEY, {
      cluster: CLUSTER,
    });
  }
  return _pusher;
}
