import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Track } from "@prisma/client";
import { normalizeTrack } from "@/lib/tracks";
import { getSessionAndRole, canAccessCalendarTrack } from "@/lib/calendar-access";
import type { AppTrack } from "@/lib/tracks";
import { pusherServer } from "@/lib/pusher-server";
import {
  ensureTrackOutlookSubscription,
  upsertTrackEventToOutlook,
} from "@/lib/outlook";
import type {
  EventCreationData,
  EventConflict,
  BusinessHoursWarning,
} from "@/components/calendar/drag-drop-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

interface CreateEventRequest {
  title: string;
  start: string; // ISO string
  end: string; // ISO string
  track: string;
  description?: string;
  location?: string;
  orderId?: string;
  orderDetails?: {
    customerName: string;
    customerNumber: string;
    orderTitle: string;
    estimatedDuration: number;
  };
  conflicts: EventConflict[];
  conflictResolution?: 'override' | 'reschedule' | 'split';
  businessHoursWarning: BusinessHoursWarning;
  ignoreBusinessHours: boolean;
}

interface CreateEventResponse {
  eventId: string;
  status: 'created' | 'created_with_warnings' | 'failed';
  warnings?: string[];
  conflictsResolved: boolean;
  message: string;
}

export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const body: CreateEventRequest = await req.json();
    const {
      title,
      start: startTime,
      end: endTime,
      track,
      description,
      location,
      orderId,
      orderDetails,
      conflicts,
      conflictResolution,
      businessHoursWarning,
      ignoreBusinessHours,
    } = body;

    // Validate required fields
    if (!title || !startTime || !endTime || !track) {
      return NextResponse.json(
        { error: "Missing required fields: title, start, end, track" },
        { status: 400 }
      );
    }

    // Parse dates
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format" },
        { status: 400 }
      );
    }

    // Validate date range
    if (start >= end) {
      return NextResponse.json(
        { error: "Start time must be before end time" },
        { status: 400 }
      );
    }

    // Normalize and validate track
    const normalizedTrack = normalizeTrack(track);
    if (!normalizedTrack) {
      return NextResponse.json(
        { error: "Invalid track" },
        { status: 400 }
      );
    }

    // Check authentication and authorization
    const { session, role } = await getSessionAndRole();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!role || !canAccessCalendarTrack(role, normalizedTrack as Track)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
      await ensureTrackOutlookSubscription(normalizedTrack as Track, req.nextUrl.origin);
    } catch (error) {
      console.error(
        `Failed to ensure Outlook subscription for track ${normalizedTrack}:`,
        error
      );
    }

    // Check for conflicts again (server-side validation)
    const conflictCheckResponse = await fetch(`${req.nextUrl.origin}/api/calendar/conflicts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': req.headers.get('Cookie') || '',
      },
      body: JSON.stringify({
        start,
        end,
        track: normalizedTrack,
        ignoreBusinessHours,
      }),
    });

    if (!conflictCheckResponse.ok) {
      console.error('Conflict check failed:', conflictCheckResponse.statusText);
      // Continue anyway, but log the error
    }

    const conflictCheckResult = conflictCheckResponse.ok ? await conflictCheckResponse.json() : null;
    const serverConflicts = conflictCheckResult?.conflicts || [];
    const canCreateEvent = conflictCheckResult?.canCreateEvent !== false;

    // Collect warnings
    const warnings: string[] = [];
    let conflictsResolved = false;

    // Handle conflicts
    if (serverConflicts.length > 0) {
      const hasErrorConflicts = serverConflicts.some((c: any) => c.severity === 'error');
      
      if (hasErrorConflicts && conflictResolution !== 'override') {
        return NextResponse.json(
          { 
            error: "Cannot create event due to severe conflicts",
            conflicts: serverConflicts,
            blockedReason: "Händelsen har allvarliga konflikter. Välj 'åsidosätt' för att skapa ändå."
          },
          { status: 409 }
        );
      }

      warnings.push(`${serverConflicts.length} konflikt${serverConflicts.length > 1 ? 'er' : ''} hittades`);
      
      if (conflictResolution === 'override') {
        conflictsResolved = true;
        warnings.push('Konflikter åsidosatta');
      }
    }

    // Handle business hours warning
    if (businessHoursWarning.isOutsideHours && !ignoreBusinessHours) {
      return NextResponse.json(
        { 
          error: "Event is outside business hours",
          businessHoursWarning,
          blockedReason: "Händelsen är utanför arbetstid. Markera 'ignorera arbetstid' för att skapa ändå."
        },
        { status: 409 }
      );
    }

    if (businessHoursWarning.isOutsideHours && ignoreBusinessHours) {
      warnings.push('Skapad utanför arbetstid');
    }

    // Create the calendar event
    // Note: CalendarEvent requires an orderId, so we need to create or link to an order
    let targetOrderId = orderId;
    
    // If no orderId provided, we can't create a CalendarEvent
    // In a real implementation, you might want to create a dummy order or use PersonalCalendarEvent instead
    if (!targetOrderId) {
      return NextResponse.json(
        { error: "Calendar events must be linked to an order" },
        { status: 400 }
      );
    }

    const calendarEvent = await prisma.calendarEvent.create({
      data: {
        title,
        start,
        end,
        track: normalizedTrack as Track,
        orderId: targetOrderId,
        notes: description || location ? `${description ? description + '\n' : ''}${location ? 'Plats: ' + location : ''}` : undefined,
      },
    });

    // If this is linked to an order, update the order track with planned times
    if (orderId) {
      try {
        await prisma.orderTrack.upsert({
          where: {
            orderId_track: {
              orderId,
              track: normalizedTrack as Track,
            },
          },
          update: {
            plannedStartAt: start,
            plannedEndAt: end,
          },
          create: {
            orderId,
            track: normalizedTrack as Track,
            plannedStartAt: start,
            plannedEndAt: end,
            status: 'PAGAENDE',
          },
        });
      } catch (orderTrackError) {
        console.error('Failed to update order track:', orderTrackError);
        warnings.push('Kunde inte koppla till ordern');
      }
    }

    try {
      await upsertTrackEventToOutlook(calendarEvent.id);
    } catch (error) {
      console.error(`Failed to sync new track event ${calendarEvent.id} to Outlook:`, error);
      warnings.push("Outlook-synk misslyckades");
    }

    try {
      await pusherServer.trigger(
        `track-${normalizedTrack}-calendar`,
        "calendar:refresh",
        {
          source: "ordexa",
          at: new Date().toISOString(),
          track: normalizedTrack,
        }
      );
    } catch (error) {
      console.error(`Failed to push track calendar refresh for ${normalizedTrack}:`, error);
    }

    // Prepare response
    const response: CreateEventResponse = {
      eventId: calendarEvent.id,
      status: warnings.length > 0 ? 'created_with_warnings' : 'created',
      warnings: warnings.length > 0 ? warnings : undefined,
      conflictsResolved,
      message: warnings.length > 0 
        ? `Händelse skapad med ${warnings.length} varning${warnings.length > 1 ? 'ar' : ''}`
        : 'Händelse skapad framgångsrikt',
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error("Event creation API error:", error);
    
    // Handle specific database errors
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint')) {
        return NextResponse.json(
          { error: "Event with this time already exists" },
          { status: 409 }
        );
      }
      
      if (error.message.includes('Foreign key constraint')) {
        return NextResponse.json(
          { error: "Invalid order reference" },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET endpoint for event creation options/configuration
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const track = searchParams.get("track");

    // Check authentication and authorization
    const { session, role } = await getSessionAndRole();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Return event creation configuration
    return NextResponse.json({
      conflictResolutions: ['override', 'reschedule', 'split'],
      maxEventDuration: 24 * 60, // 24 hours in minutes
      minEventDuration: 15, // 15 minutes
      businessHours: {
        enabled: true,
        startHour: 8,
        endHour: 17,
        days: [1, 2, 3, 4, 5], // Monday-Friday
        warningThreshold: 30,
      },
      tracks: ['A', 'B', 'C', 'D'],
    });
  } catch (error) {
    console.error("Event creation config API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
