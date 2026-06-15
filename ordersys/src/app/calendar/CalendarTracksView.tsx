"use client";

import CalendarClient from "./CalendarClient";
import { TRACK_NAMES, type AppTrack } from "@/lib/tracks";

type CalendarTracksViewProps = {
  initialTrack: AppTrack;
};

export default function CalendarTracksView({
  initialTrack,
}: CalendarTracksViewProps) {
  return (
    <div className="flex w-full flex-col gap-4 py-4">
      <div className="grid gap-4">
        {[initialTrack].map((track) => (
          <section
            key={track}
            className="rounded-2xl border border-neutral-200 bg-white shadow-sm"
          >
            <header className="border-b border-neutral-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-neutral-800">
                Spår {track}: {TRACK_NAMES[track]}
              </h2>
            </header>
            <CalendarClient
              track={track}
              showTrackSwitcher={false}
            />
          </section>
        ))}
      </div>
    </div>
  );
}
