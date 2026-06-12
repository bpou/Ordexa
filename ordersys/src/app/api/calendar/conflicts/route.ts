import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Track } from "@prisma/client";
import { normalizeTrack } from "@/lib/tracks";
import { getSessionAndRole, canAccessCalendarTrack } from "@/lib/calendar-access";
import type {
  ConflictDetectionRequest,
  ConflictDetectionResponse,
  EventConflict,
  BusinessHoursWarning,
  ConflictType,
  ConflictSeverity,
  BusinessHoursWarningLevel,
  BusinessHoursConfig,
} from "@/components/calendar/ConflictTypes";
import {
  getConflictType,
  calculateOverlapDuration,
  calculateOverlapPercentage,
  getConflictSeverityFromOverlap,
  isWithinBusinessHours,
  DEFAULT_BUSINESS_HOURS,
  generateConflictResolution,
} from "@/components/calendar/ConflictTypes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Default business hours configuration
const BUSINESS_HOURS_CONFIG: BusinessHoursConfig = {
  enabled: true,
  startHour: 8,
  endHour: 17,
  days: [1, 2, 3, 4, 5], // Monday-Friday
  warningThreshold: 30,
};

// Helper function to check business hours compliance
function checkBusinessHours(
  start: Date,
  end: Date,
  config: BusinessHoursConfig
): BusinessHoursWarning {
  const startWithinHours = isWithinBusinessHours(start, config);
  const endWithinHours = isWithinBusinessHours(end, config);
  
  if (startWithinHours && endWithinHours) {
    return {
      isOutsideHours: false,
      warningLevel: 'info',
      minutesOutside: 0,
      businessHoursConfig: config,
    };
  }
  
  // Calculate minutes outside business hours
  let minutesOutside = 0;
  
  if (!startWithinHours) {
    const startHour = start.getHours();
    const startMinute = start.getMinutes();
    const startTotalMinutes = startHour * 60 + startMinute;
    
    if (startTotalMinutes < config.startHour * 60) {
      minutesOutside += (config.startHour * 60) - startTotalMinutes;
    } else if (startTotalMinutes > config.endHour * 60) {
      minutesOutside += startTotalMinutes - (config.endHour * 60);
    }
  }
  
  if (!endWithinHours) {
    const endHour = end.getHours();
    const endMinute = end.getMinutes();
    const endTotalMinutes = endHour * 60 + endMinute;
    
    if (endTotalMinutes < config.startHour * 60) {
      minutesOutside += (config.startHour * 60) - endTotalMinutes;
    } else if (endTotalMinutes > config.endHour * 60) {
      minutesOutside += endTotalMinutes - (config.endHour * 60);
    }
  }
  
  // Determine warning level
  let warningLevel: BusinessHoursWarningLevel = 'warning';
  if (minutesOutside > config.warningThreshold * 2) {
    warningLevel = 'error';
  } else if (minutesOutside > config.warningThreshold) {
    warningLevel = 'warning';
  } else {
    warningLevel = 'info';
  }
  
  // Generate suggested time within business hours
  let suggestedTime;
  if (!startWithinHours || !endWithinHours) {
    const duration = (end.getTime() - start.getTime()) / (1000 * 60);
    const suggestedStart = new Date(start);
    const suggestedEnd = new Date(start);
    
    // Adjust to business hours
    const startHour = start.getHours();
    const startMinute = start.getMinutes();
    const startTotalMinutes = startHour * 60 + startMinute;
    
    if (startTotalMinutes < config.startHour * 60) {
      suggestedStart.setHours(config.startHour, 0, 0, 0);
    } else if (startTotalMinutes > config.endHour * 60) {
      // Move to next day
      suggestedStart.setDate(suggestedStart.getDate() + 1);
      suggestedStart.setHours(config.startHour, 0, 0, 0);
    }
    
    suggestedEnd.setTime(suggestedStart.getTime() + duration * 60 * 1000);
    
    // Make sure end is also within business hours
    const endHour = suggestedEnd.getHours();
    const endMinute = suggestedEnd.getMinutes();
    const endTotalMinutes = endHour * 60 + endMinute;
    
    if (endTotalMinutes > config.endHour * 60) {
      // Adjust end to business hours
      suggestedEnd.setHours(config.endHour, 0, 0, 0);
    }
    
    suggestedTime = {
      start: suggestedStart,
      end: suggestedEnd,
    };
  }
  
  return {
    isOutsideHours: true,
    warningLevel,
    minutesOutside,
    suggestedTime,
    businessHoursConfig: config,
  };
}

export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const body: ConflictDetectionRequest = await req.json();
    const { start, end, track, eventId, ignoreBusinessHours } = body;

    // Validate required fields
    if (!start || !end || !track) {
      return NextResponse.json(
        { error: "Missing required fields: start, end, track" },
        { status: 400 }
      );
    }

    // Parse dates
    const startDate = new Date(start);
    const endDate = new Date(end);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format" },
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

    // Fetch existing events for the track
    const existingEvents = await prisma.calendarEvent.findMany({
      where: { 
        track: normalizedTrack as Track,
        // Don't include the event being checked (for updates)
        ...(eventId && { id: { not: eventId } })
      },
      select: {
        id: true,
        title: true,
        start: true,
        end: true,
        track: true,
      },
      orderBy: { start: "asc" },
    });

    // Also fetch pending events from order tracks
    const pendingEvents = await prisma.orderTrack.findMany({
      where: {
        track: normalizedTrack as Track,
        plannedStartAt: { not: null },
        plannedEndAt: { not: null },
        status: { not: "AVSLUTAD" },
        // Don't include the event being checked (for updates)
        ...(eventId && { orderId: { not: eventId } })
      },
      select: {
        orderId: true,
        plannedStartAt: true,
        plannedEndAt: true,
        order: {
          select: {
            title: true,
          },
        },
      },
    });

    // Combine all events
    const allEvents = [
      ...existingEvents.map(event => ({
        id: event.id,
        title: event.title,
        start: event.start,
        end: event.end,
      })),
      ...pendingEvents.map(pending => ({
        id: `pending-${pending.orderId}`,
        title: pending.order?.title || `Order ${pending.orderId}`,
        start: pending.plannedStartAt!,
        end: pending.plannedEndAt!,
      })),
    ];

    // Detect conflicts
    const conflicts: EventConflict[] = [];
    
    for (const event of allEvents) {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      
      // Check if there's any overlap
      if (startDate < eventEnd && endDate > eventStart) {
        const conflictType = getConflictType(startDate, endDate, eventStart, eventEnd);
        const conflictDuration = calculateOverlapDuration(startDate, endDate, eventStart, eventEnd);
        const overlapPercentage = calculateOverlapPercentage(startDate, endDate, eventStart, eventEnd);
        const severity = getConflictSeverityFromOverlap(overlapPercentage);
        
        // Calculate overlapping time range
        const overlappingStart = new Date(Math.max(startDate.getTime(), eventStart.getTime()));
        const overlappingEnd = new Date(Math.min(endDate.getTime(), eventEnd.getTime()));
        
        // Generate resolution suggestion
        const suggestedResolution = generateConflictResolution(
          startDate,
          endDate,
          { start: eventStart, end: eventEnd, title: event.title },
          conflictType
        );
        
        const conflict: EventConflict = {
          eventId: String(event.id),
          eventTitle: event.title || "Okänd händelse",
          conflictType,
          severity,
          conflictDuration,
          overlappingStart,
          overlappingEnd,
          suggestedResolution: suggestedResolution || undefined,
        };
        
        conflicts.push(conflict);
      }
    }

    // Check business hours
    const businessHoursWarning = ignoreBusinessHours 
      ? {
          isOutsideHours: false,
          warningLevel: 'info' as BusinessHoursWarningLevel,
          minutesOutside: 0,
          businessHoursConfig: BUSINESS_HOURS_CONFIG,
        }
      : checkBusinessHours(startDate, endDate, BUSINESS_HOURS_CONFIG);

    // Determine if event can be created
    const hasErrorConflicts = conflicts.some(c => c.severity === 'error');
    const hasBusinessHoursError = businessHoursWarning.warningLevel === 'error';
    const canCreateEvent = !hasErrorConflicts && !hasBusinessHoursError;
    
    let blockedReason: string | undefined;
    if (hasErrorConflicts) {
      blockedReason = "Händelsen har allvarliga konflikter med befintliga händelser";
    } else if (hasBusinessHoursError) {
      blockedReason = "Händelsen är utanför tillåtna arbetstider";
    }

    const response: ConflictDetectionResponse = {
      conflicts,
      businessHoursWarning,
      canCreateEvent,
      blockedReason,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Conflict detection API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET endpoint for business hours configuration
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const track = searchParams.get("track");

    // Check authentication and authorization
    const { session, role } = await getSessionAndRole();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Return business hours configuration
    return NextResponse.json({
      businessHours: BUSINESS_HOURS_CONFIG,
    });
  } catch (error) {
    console.error("Business hours config API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}