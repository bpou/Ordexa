"use client";

import dynamic from "next/dynamic";
import type { AppTrack } from "@/lib/tracks";

const CalendarClient = dynamic(() => import("@/app/calendar/CalendarClient"), {
  ssr: false,
});

export default function CalendarMount(props: { track: AppTrack }) {
  return <CalendarClient {...props} />;
}