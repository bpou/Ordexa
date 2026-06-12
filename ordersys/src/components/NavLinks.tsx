// components/NavLinks.tsx
import type { ComponentType } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  FilePlus2,
  Scissors,
  Drill,
  Wrench,
  Car,
  Calendar,
  User,
} from "lucide-react";
import { APP_TRACKS, TRACK_OVERVIEW_LABELS, TRACK_CALENDAR_LABELS, TRACK_SLUGS } from "@/lib/tracks";
type TrackIconRecord = Record<(typeof APP_TRACKS)[number], ComponentType<{ className?: string }>>;

const TRACK_OVERVIEW_ICONS: TrackIconRecord = {
  A: Scissors,
  B: Drill,
  C: Wrench,
  D: Car,
};

export default function NavLinks() {
  return (
    <nav className="space-y-1">
      <Link
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-foreground/90 hover:bg-brand-50 hover:text-brand-700 transition-colors"
        href="/"
      >
        <LayoutDashboard className="h-4 w-4 text-brand-600" />
        <span>Översikt</span>
      </Link>

      <Link
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-foreground/90 hover:bg-brand-50 hover:text-brand-700 transition-colors"
        href="/orders/new"
      >
        <FilePlus2 className="h-4 w-4 text-brand-600" />
        <span>Ny order</span>
      </Link>

      {APP_TRACKS.map((track) => {
        const Icon = TRACK_OVERVIEW_ICONS[track];
        return (
          <Link
            key={`track-${track}`}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-foreground/90 hover:bg-brand-50 hover:text-brand-700 transition-colors"
            href={`/orders/track/${track}`}
          >
            <Icon className="h-4 w-4 text-brand-600" />
            <span>{TRACK_OVERVIEW_LABELS[track]}</span>
          </Link>
        );
      })}

      {APP_TRACKS.map((track) => (
        <Link
          key={`calendar-${track}`}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-foreground/90 hover:bg-brand-50 hover:text-brand-700 transition-colors"
          href={`/calendar/${TRACK_SLUGS[track]}`}
        >
          <Calendar className="h-4 w-4 text-brand-600" />
          <span>{TRACK_CALENDAR_LABELS[track]}</span>
        </Link>
      ))}

      <Link
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-foreground/90 hover:bg-brand-50 hover:text-brand-700 transition-colors border-t border-neutral-200 pt-4 mt-2"
        href="/personal-calendar"
      >
        <User className="h-4 w-4 text-brand-600" />
        <span>Personlig kalender</span>
      </Link>
    </nav>
  );
}
