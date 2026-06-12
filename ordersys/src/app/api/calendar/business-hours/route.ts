import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { requireRoles } from '@/lib/requireRoles';
import type { BusinessHoursConfig } from '@/components/calendar/ConflictTypes';
import { DEFAULT_BUSINESS_HOURS } from '@/components/calendar/ConflictTypes';

// GET /api/calendar/business-hours - Get business hours configuration
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // For now, we'll use a simple approach with User preferences
    // In a future implementation, you might want to add a dedicated table for business hours
    
    // Get track from query parameters (optional)
    const { searchParams } = new URL(request.url);
    const track = searchParams.get('track');

    // Try to get business hours configuration from user preferences or use default
    let businessHoursConfig: BusinessHoursConfig = DEFAULT_BUSINESS_HOURS;

    // For track-specific configuration, we could use OrderTrack data in the future
    // For now, we'll return the default configuration
    
    return NextResponse.json(businessHoursConfig);
  } catch (error) {
    console.error('Failed to get business hours configuration:', error);
    return NextResponse.json(
      { error: 'Failed to get business hours configuration' },
      { status: 500 }
    );
  }
}

// POST /api/calendar/business-hours - Update business hours configuration
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin permissions
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      select: { role: true }
    });

    if (!user || !['ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const config = body;

    // Validate configuration
    const validationResult = validateBusinessHoursConfig(config);
    if (!validationResult.isValid) {
      return NextResponse.json(
        { error: validationResult.error },
        { status: 400 }
      );
    }

    // For now, we'll just return the config since we don't have a dedicated table
    // In a future implementation, you might want to add a UserSettings or SystemConfig table
    
    return NextResponse.json(config);
  } catch (error) {
    console.error('Failed to update business hours configuration:', error);
    return NextResponse.json(
      { error: 'Failed to update business hours configuration' },
      { status: 500 }
    );
  }
}

// PUT /api/calendar/business-hours - Reset business hours to default
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin permissions
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      select: { role: true }
    });

    if (!user || !['ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // For now, we'll just return the default configuration
    // In a future implementation, you might want to clear the configuration from a dedicated table
    
    return NextResponse.json(DEFAULT_BUSINESS_HOURS);
  } catch (error) {
    console.error('Failed to reset business hours configuration:', error);
    return NextResponse.json(
      { error: 'Failed to reset business hours configuration' },
      { status: 500 }
    );
  }
}

// DELETE /api/calendar/business-hours - Delete business hours configuration
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin permissions
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      select: { role: true }
    });

    if (!user || !['ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // For now, we'll just return success since we don't have a dedicated table
    // In a future implementation, you might want to clear the configuration from a dedicated table

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete business hours configuration:', error);
    return NextResponse.json(
      { error: 'Failed to delete business hours configuration' },
      { status: 500 }
    );
  }
}

// Validation function for business hours configuration
function validateBusinessHoursConfig(config: any): { isValid: boolean; error?: string } {
  // Check required fields
  if (typeof config !== 'object' || config === null) {
    return { isValid: false, error: 'Configuration must be an object' };
  }

  // Validate enabled field
  if (typeof config.enabled !== 'boolean') {
    return { isValid: false, error: 'enabled field must be a boolean' };
  }

  if (config.enabled) {
    // Validate startHour
    if (typeof config.startHour !== 'number' ||
        config.startHour < 0 ||
        config.startHour > 23 ||
        !Number.isInteger(config.startHour)) {
      return { isValid: false, error: 'startHour must be an integer between 0 and 23' };
    }

    // Validate endHour
    if (typeof config.endHour !== 'number' ||
        config.endHour < 0 ||
        config.endHour > 23 ||
        !Number.isInteger(config.endHour)) {
      return { isValid: false, error: 'endHour must be an integer between 0 and 23' };
    }

    // Validate time range
    if (config.startHour >= config.endHour) {
      return { isValid: false, error: 'startHour must be less than endHour' };
    }

    // Validate days
    if (!Array.isArray(config.days) || config.days.length === 0) {
      return { isValid: false, error: 'days must be a non-empty array' };
    }

    for (const day of config.days) {
      if (typeof day !== 'number' ||
          day < 0 ||
          day > 6 ||
          !Number.isInteger(day)) {
        return { isValid: false, error: 'days must contain integers between 0 and 6 (Sunday-Saturday)' };
      }
    }

    // Remove duplicates and sort
    config.days = [...new Set(config.days as number[])].sort((a, b) => a - b);

    // Validate warningThreshold
    if (typeof config.warningThreshold !== 'number' ||
        config.warningThreshold < 0 ||
        !Number.isInteger(config.warningThreshold)) {
      return { isValid: false, error: 'warningThreshold must be a non-negative integer' };
    }
  }

  return { isValid: true };
}

// Helper function to get business hours for a specific track
export async function getBusinessHoursForTrack(trackId: string): Promise<BusinessHoursConfig> {
  try {
    // For now, we'll just return the default configuration
    // In a future implementation, you might want to store track-specific configurations
    return DEFAULT_BUSINESS_HOURS;
  } catch (error) {
    console.error('Failed to get business hours for track:', error);
    return DEFAULT_BUSINESS_HOURS;
  }
}