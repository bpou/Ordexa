"use client";

import { useMemo, useState } from "react";
import CalendarClient from "./CalendarClient";
import { APP_TRACKS, TRACK_NAMES, type AppTrack } from "@/lib/tracks";

type CalendarTracksViewProps = {
  initialTrack: AppTrack;
};

export default function CalendarTracksView({
  initialTrack,
}: CalendarTracksViewProps) {
  const [selectedTracks, setSelectedTracks] = useState<AppTrack[]>([
    initialTrack,
  ]);

  const sortedTracks = useMemo(() => {
    return APP_TRACKS.filter((track) => selectedTracks.includes(track));
  }, [selectedTracks]);

  const toggleTrack = (track: AppTrack) => {
    setSelectedTracks((prev) => {
      if (prev.includes(track)) {
        if (prev.length === 1) return prev;
        return prev.filter((item) => item !== track);
      }
      return [...prev, track];
    });
  };

  const gridClass =
    sortedTracks.length <= 1
      ? "grid-cols-1"
      : sortedTracks.length === 2
        ? "grid-cols-1 xl:grid-cols-2"
        : "grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3";

  return (
    <div className="flex w-full flex-col gap-4 py-4">
      <div className={`grid gap-4 ${gridClass}`}>
        {sortedTracks.map((track, index) => (
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
              toolbarAfterLongJobs={
                index === 0 ? (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {APP_TRACKS.map((optionTrack) => {
                      const active = sortedTracks.includes(optionTrack);
                      return (
                        <button
                          key={optionTrack}
                          type="button"
                          onClick={() => toggleTrack(optionTrack)}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-1 ${
                            active
                              ? "border-neutral-900 bg-neutral-900 text-white shadow-[0_6px_16px_-8px_rgba(23,23,23,0.7)]"
                              : "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400 hover:bg-neutral-100"
                          }`}
                          aria-pressed={active}
                          aria-label={`Visa spår ${optionTrack} sida vid sida`}
                        >
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${
                              active ? "bg-white/85" : "bg-neutral-300"
                            }`}
                            aria-hidden="true"
                          />
                          <span>{optionTrack}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : undefined
              }
            />
          </section>
        ))}
      </div>
    </div>
  );
}
