"use client";

import React from "react";
import clsx from "clsx";

type CalendarSkinProps = {
  framed?: boolean;
  rounded?: "md" | "lg" | "xl" | "2xl" | "3xl" | "full";
  shadow?: boolean;
  children: React.ReactNode;
};

export default function CalendarSkin({
  framed = true,
  rounded = "xl",
  shadow = true,
  children,
}: CalendarSkinProps) {
  return (
    <div
      className={clsx(
        framed && "border border-neutral-200 overflow-hidden bg-white",
        framed && `rounded-${rounded}`,
        framed && shadow && "shadow-sm"
      )}
    >
      <style jsx global>{`
        :root {
          --ordina-grid-color: #c6c6c6;
          --ordina-grid-color-minor: #e5e5e5;
          --ordina-axis-width: 110px;
          --ordina-accent: rgba(15, 23, 42, 0.16);
          --ordina-accent-width: 12px;
          --ordina-divider: rgba(15, 23, 42, 0.24);

          --fc-border-color: var(--ordina-grid-color);
          --fc-page-bg-color: transparent;
          --fc-today-bg-color: #fffbeb;
          --fc-button-text-color: #0f172a;
          --fc-button-bg-color: #f1f5f9;
          --fc-button-border-color: #e2e8f0;
          --fc-button-hover-bg-color: #e2e8f0;
          --fc-button-hover-border-color: #cbd5e1;
          --fc-button-active-bg-color: #e2e8f0;
          --fc-button-active-border-color: #cbd5e1;
          --fc-slot-min-height: 60px;
        }

        /* timestamp column sizing */
        th.fc-timegrid-slot-label,
        td.fc-timegrid-slot-label,
        th.fc-timegrid-axis,
        td.fc-timegrid-axis,
        col.fc-timegrid-slot-label-col,
        col.fc-timegrid-axis-col {
          width: var(--ordina-axis-width) !important;
          min-width: var(--ordina-axis-width) !important;
          max-width: var(--ordina-axis-width) !important;
        }

        .fc .fc-timegrid-axis,
        .fc .fc-timegrid-slot-label {
          background: rgb(var(--color-card));
          box-shadow: none !important;
        }

        .fc .fc-timegrid-axis {
          border-right: 1px solid #e5e5e5 !important;
        }

        .fc .fc-timegrid-slot-label {
          border-right: none !important;
        }

        .fc .fc-timegrid-axis-frame,
        .fc .fc-timegrid-slot-label-frame {
          display: flex;
          align-items: flex-start;
          justify-content: flex-end;
        }

        .fc .fc-timegrid-axis-cushion,
        .fc .fc-timegrid-slot-label-cushion {
          display: flex !important;
          align-items: flex-start !important;
          justify-content: flex-end !important;
          text-align: right !important;
          padding-right: 0.75rem !important;
          font-weight: 600 !important;
          color: #111827 !important;
          position: relative !important;
          top: calc(var(--fc-slot-min-height) * 0.2) !important;
          transform: translateY(-50%) !important;
          margin-top: -35px !important;
        }

        .fc-col-header {
          border-bottom: 2px solid #e5e5e5 !important;
        }

        .fc-timegrid-body .fc-timegrid-col {
          border-right: 1px solid #e5e5e5 !important;
        }
        .fc-timegrid-body .fc-timegrid-col:last-child {
          border-right: 1px solid #e5e5e5 !important;
        }

        .fc-col-header-cell {
          border-right: 1px solid #e5e5e5 !important;
        }
        .fc-col-header-cell:last-child {
          border-right: 1px solid #e5e5e5 !important;
        }

        .fc-daygrid-body .fc-daygrid-day {
          border-right: 1px solid #e5e5e5 !important;
        }
        .fc-daygrid-body .fc-daygrid-day:last-child {
          border-right: 1px solid #e5e5e5 !important;
        }

        .fc .fc-scrollgrid,
        .fc .fc-timegrid,
        .fc .fc-daygrid {
          border-radius: 0.75rem;
          overflow: hidden;
        }

        .fc .fc-scroller {
          scrollbar-width: none;
          -ms-overflow-style: none;
          width: 100% !important;
          max-width: 100% !important;
          padding-right: 0 !important;
          margin-right: 0 !important;
        }

        .fc .fc-scroller-harness {
          margin-right: 0 !important;
        }

        .fc .fc-scrollgrid-sync-table {
          margin-right: 0 !important;
        }

        .fc .fc-scroller::-webkit-scrollbar {
          display: none;
        }

        .fc .fc-toolbar {
          margin-bottom: 0.5rem;
        }

        .fc .fc-button {
          border-radius: 9999px;
          font-weight: 600;
          padding: 0.375rem 0.75rem;
          box-shadow: none;
        }

        .fc-daygrid-event {
          border-radius: 0.75rem;
          padding: 2px 6px;
        }

        .fc .fc-daygrid-event,
        .fc .fc-timegrid-event {
          transition: transform 160ms ease, box-shadow 160ms ease;
        }

        .fc .fc-daygrid-event:hover,
        .fc .fc-timegrid-event:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 20px -12px rgb(15 23 42 / 0.25),
            0 6px 10px -8px rgb(15 23 42 / 0.2);
        }

        .fc .fc-highlight {
          background-color: rgba(250, 204, 21, 0.18);
        }

        /* Keep native row geometry, but make hour/half-hour lines visible */
        .fc .fc-timegrid-slot,
        .fc .fc-timegrid-slot-label {
          border-top: 1px solid var(--ordina-grid-color) !important;
        }

        .fc .fc-timegrid-slot-lane,
        .fc .fc-timegrid-slot-label-frame {
          position: relative;
        }

        .fc .fc-timegrid-slot-lane::after,
        .fc .fc-timegrid-slot-label-frame::after {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          top: 50%;
          border-top: 1px solid var(--ordina-grid-color-minor);
          pointer-events: none;
        }

        .fc .fc-timegrid .fc-scrollgrid {
          table-layout: fixed !important;
        }

        .fc .fc-timegrid-body,
        .fc .fc-timegrid-axis {
          flex-shrink: 0 !important;
        }

        .fc .fc-timegrid-col:not(:last-child),
        .fc .fc-timegrid-divider {
          border-right: 1px solid var(--ordina-grid-color) !important;
        }

        .ordina-calendar-event {
          position: relative;
          display: flex;
          flex-direction: column;
          height: 100%;
          border-radius: 0.95rem;
          border: 1px solid transparent;
          overflow: hidden;
          transition:
            transform 150ms ease,
            box-shadow 150ms ease,
            border-color 150ms ease,
            filter 150ms ease;
          will-change: transform, box-shadow, filter;
          background-clip: padding-box;
        }

        .ordina-calendar-event::before {
          content: "";
          position: absolute;
          inset-block: 0;
          inset-inline-start: 0;
          width: var(--ordina-accent-width, 12px);
          background: var(--ordina-accent, rgba(15, 23, 42, 0.16));
          pointer-events: none;
        }

        .ordina-calendar-event::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(
            140deg,
            rgba(255, 255, 255, 0.35) 0%,
            rgba(255, 255, 255, 0.18) 35%,
            rgba(0, 0, 0, 0.05) 100%
          );
          mix-blend-mode: soft-light;
          opacity: 0.7;
          transition: opacity 150ms ease;
          pointer-events: none;
        }

        .ordina-calendar-event .ordina-calendar-event-inner {
          position: relative;
          z-index: 1;
        }

        .ordina-calendar-event .ordina-calendar-event-inner::after {
          content: "";
          position: absolute;
          inset-block: 0;
          inset-inline-start: calc(var(--ordina-accent-width, 12px));
          width: 1px;
          background: var(--ordina-divider, rgba(15, 23, 42, 0.24));
          opacity: 0.25;
          pointer-events: none;
        }

        .ordina-calendar-event--interactive {
          cursor: grab;
        }

        .ordina-calendar-event.fc-event-dragging,
        .ordina-calendar-event.fc-event-resizing,
        .ordina-calendar-event.fc-event-selected,
        .ordina-calendar-event.fc-event-mirror {
          transform: scale(1.02);
          box-shadow:
            0 20px 36px -18px rgba(15, 23, 42, 0.45),
            0 12px 24px -20px rgba(15, 23, 42, 0.35);
          border-color: rgba(15, 23, 42, 0.2);
          filter: saturate(1.15);
          cursor: grabbing;
        }

        .ordina-calendar-event.fc-event-mirror {
          opacity: 0.92;
        }

        .ordina-calendar-event:hover {
          transform: none !important;
          box-shadow: none !important;
          filter: none !important;
        }

        .ordina-calendar-event:hover::after {
          opacity: 0.7;
        }

        .fc-timegrid-col.fc-day-today .fc-timegrid-col-frame {
          outline: 2px solid #facc15;
          outline-offset: -2px;
          background-color: #fffbeb;
        }

        .fc-day-sat,
        .fc-day-sun {
          background-color: #fafafa;
        }

        .fc-timeGridWeek-view .fc-day-sat .fc-timegrid-col-frame,
        .fc-timeGridWeek-view .fc-day-sun .fc-timegrid-col-frame {
          background-color: #fafafa;
        }

        .fc .fc-col-header-cell-cushion {
          padding: 0.25rem 0.5rem;
          border-radius: 9999px;
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          gap: 0.1rem;
          font-weight: 600;
          color: var(--color-brand-600, #059669);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .fc .fc-col-header {
          position: sticky;
          top: 0;
          z-index: 5;
          background: white;
        }
      `}</style>

      {children}
    </div>
  );
}



