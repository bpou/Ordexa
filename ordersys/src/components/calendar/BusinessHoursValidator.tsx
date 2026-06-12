"use client";

import { useMemo, useCallback } from "react";
import type { 
  BusinessHoursConfig, 
  BusinessHoursWarning, 
  BusinessHoursWarningLevel 
} from "./ConflictTypes";
import { DEFAULT_BUSINESS_HOURS, isWithinBusinessHours } from "./ConflictTypes";

interface BusinessHoursValidationResult {
  isValid: boolean;
  warning: BusinessHoursWarning;
  suggestions: BusinessHoursSuggestion[];
}

interface BusinessHoursSuggestion {
  type: 'move' | 'resize' | 'split';
  title: string;
  description: string;
  suggestedStart: Date;
  suggestedEnd: Date;
  confidence: number; // 0-1
}

interface BusinessHoursValidatorProps {
  config?: BusinessHoursConfig;
}

// Main validator class for business hours
export class BusinessHoursValidator {
  private config: BusinessHoursConfig;

  constructor(config: BusinessHoursConfig = DEFAULT_BUSINESS_HOURS) {
    this.config = config;
  }

  // Update configuration
  updateConfig(config: BusinessHoursConfig): void {
    this.config = { ...this.config, ...config };
  }

  // Get current configuration
  getConfig(): BusinessHoursConfig {
    return this.config;
  }

  // Validate a time range against business hours
  validateTimeRange(start: Date, end: Date): BusinessHoursValidationResult {
    if (!this.config.enabled) {
      return {
        isValid: true,
        warning: {
          isOutsideHours: false,
          warningLevel: 'info',
          minutesOutside: 0,
          businessHoursConfig: this.config,
        },
        suggestions: [],
      };
    }

    const startWithinHours = isWithinBusinessHours(start, this.config);
    const endWithinHours = isWithinBusinessHours(end, this.config);

    // If both times are within business hours, it's valid
    if (startWithinHours && endWithinHours) {
      return {
        isValid: true,
        warning: {
          isOutsideHours: false,
          warningLevel: 'info',
          minutesOutside: 0,
          businessHoursConfig: this.config,
        },
        suggestions: [],
      };
    }

    // Calculate minutes outside business hours
    const minutesOutside = this.calculateMinutesOutside(start, end);
    
    // Determine warning level
    const warningLevel = this.determineWarningLevel(minutesOutside);
    
    // Generate suggestions
    const suggestions = this.generateSuggestions(start, end);

    return {
      isValid: false,
      warning: {
        isOutsideHours: true,
        warningLevel,
        minutesOutside,
        suggestedTime: suggestions.length > 0 ? {
          start: suggestions[0].suggestedStart,
          end: suggestions[0].suggestedEnd,
        } : undefined,
        businessHoursConfig: this.config,
      },
      suggestions,
    };
  }

  // Check if a specific time is within business hours
  isTimeWithinBusinessHours(date: Date): boolean {
    return isWithinBusinessHours(date, this.config);
  }

  // Calculate minutes outside business hours for a time range
  private calculateMinutesOutside(start: Date, end: Date): number {
    let minutesOutside = 0;
    const current = new Date(start);

    while (current < end) {
      if (!isWithinBusinessHours(current, this.config)) {
        minutesOutside++;
      }
      current.setTime(current.getTime() + 60 * 1000); // Add 1 minute
    }

    return minutesOutside;
  }

  // Determine warning level based on minutes outside
  private determineWarningLevel(minutesOutside: number): BusinessHoursWarningLevel {
    if (minutesOutside === 0) return 'info';
    if (minutesOutside <= this.config.warningThreshold) return 'info';
    if (minutesOutside <= this.config.warningThreshold * 2) return 'warning';
    return 'error';
  }

  // Generate suggestions for moving to business hours
  private generateSuggestions(start: Date, end: Date): BusinessHoursSuggestion[] {
    const suggestions: BusinessHoursSuggestion[] = [];
    const duration = (end.getTime() - start.getTime()) / (1000 * 60); // Duration in minutes

    // Suggestion 1: Move to next available business hours slot
    const moveSuggestion = this.generateMoveSuggestion(start, duration);
    if (moveSuggestion) {
      suggestions.push(moveSuggestion);
    }

    // Suggestion 2: Resize to fit within business hours
    const resizeSuggestion = this.generateResizeSuggestion(start, end);
    if (resizeSuggestion) {
      suggestions.push(resizeSuggestion);
    }

    // Suggestion 3: Split across business hours (if duration is long)
    if (duration > this.config.warningThreshold * 3) {
      const splitSuggestion = this.generateSplitSuggestion(start, end, duration);
      if (splitSuggestion) {
        suggestions.push(splitSuggestion);
      }
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  // Generate move suggestion
  private generateMoveSuggestion(start: Date, duration: number): BusinessHoursSuggestion | null {
    const suggestedStart = this.findNextBusinessHoursSlot(start, duration);
    
    if (!suggestedStart) return null;

    const suggestedEnd = new Date(suggestedStart.getTime() + duration * 60 * 1000);

    return {
      type: 'move',
      title: 'Flytta till arbetstid',
      description: `Flytta händelsen till ${this.formatTime(suggestedStart)} - ${this.formatTime(suggestedEnd)}`,
      suggestedStart,
      suggestedEnd,
      confidence: 0.9,
    };
  }

  // Generate resize suggestion
  private generateResizeSuggestion(start: Date, end: Date): BusinessHoursSuggestion | null {
    const startWithinHours = isWithinBusinessHours(start, this.config);
    const endWithinHours = isWithinBusinessHours(end, this.config);

    let suggestedStart = new Date(start);
    let suggestedEnd = new Date(end);

    // Adjust start time if needed
    if (!startWithinHours) {
      const startHour = start.getHours();
      const startMinute = start.getMinutes();
      const startTotalMinutes = startHour * 60 + startMinute;

      if (startTotalMinutes < this.config.startHour * 60) {
        suggestedStart.setHours(this.config.startHour, 0, 0, 0);
      } else if (startTotalMinutes > this.config.endHour * 60) {
        // Move to next day
        suggestedStart.setDate(suggestedStart.getDate() + 1);
        suggestedStart.setHours(this.config.startHour, 0, 0, 0);
      }
    }

    // Adjust end time if needed
    if (!endWithinHours) {
      const endHour = end.getHours();
      const endMinute = end.getMinutes();
      const endTotalMinutes = endHour * 60 + endMinute;

      if (endTotalMinutes > this.config.endHour * 60) {
        suggestedEnd.setHours(this.config.endHour, 0, 0, 0);
      } else if (endTotalMinutes < this.config.startHour * 60) {
        // Move to previous day
        suggestedEnd.setDate(suggestedEnd.getDate() - 1);
        suggestedEnd.setHours(this.config.endHour, 0, 0, 0);
      }
    }

    // Check if the resized event is still valid
    if (suggestedStart >= suggestedEnd) {
      return null;
    }

    return {
      type: 'resize',
      title: 'Anpassa till arbetstid',
      description: `Anpassa tiden till ${this.formatTime(suggestedStart)} - ${this.formatTime(suggestedEnd)}`,
      suggestedStart,
      suggestedEnd,
      confidence: 0.7,
    };
  }

  // Generate split suggestion
  private generateSplitSuggestion(start: Date, end: Date, duration: number): BusinessHoursSuggestion | null {
    // Find the next business hours slot
    const nextSlot = this.findNextBusinessHoursSlot(start, Math.min(duration, 120)); // Max 2 hours
    
    if (!nextSlot) return null;

    const suggestedEnd = new Date(nextSlot.getTime() + Math.min(duration, 120) * 60 * 1000);

    return {
      type: 'split',
      title: 'Dela händelsen',
      description: `Dela händelsen, starta del 1 vid ${this.formatTime(nextSlot)}`,
      suggestedStart: nextSlot,
      suggestedEnd,
      confidence: 0.5,
    };
  }

  // Find the next available business hours slot
  private findNextBusinessHoursSlot(after: Date, duration: number): Date | null {
    const current = new Date(after);
    const maxDaysToSearch = 7; // Search up to 7 days ahead

    for (let day = 0; day < maxDaysToSearch; day++) {
      const dayOfWeek = current.getDay();
      
      // Check if this day is a business day
      if (this.config.days.includes(dayOfWeek)) {
        // Set to business start time
        const slotStart = new Date(current);
        slotStart.setHours(this.config.startHour, 0, 0, 0);

        // Check if the slot is in the future and has enough duration
        if (slotStart > after) {
          const slotEnd = new Date(slotStart);
          slotEnd.setHours(this.config.endHour, 0, 0, 0);
          
          const availableDuration = (slotEnd.getTime() - slotStart.getTime()) / (1000 * 60);
          
          if (availableDuration >= duration) {
            return slotStart;
          }
        }
      }

      // Move to next day
      current.setDate(current.getDate() + 1);
      current.setHours(0, 0, 0, 0);
    }

    return null;
  }

  // Format time for display
  private formatTime(date: Date): string {
    return date.toLocaleTimeString('sv-SE', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  // Get business hours boundaries for a specific day
  getBusinessHoursBoundaries(date: Date): { start: Date; end: Date } | null {
    if (!this.config.enabled) return null;

    const dayOfWeek = date.getDay();
    if (!this.config.days.includes(dayOfWeek)) return null;

    const start = new Date(date);
    start.setHours(this.config.startHour, 0, 0, 0);

    const end = new Date(date);
    end.setHours(this.config.endHour, 0, 0, 0);

    return { start, end };
  }

  // Check if a day is a business day
  isBusinessDay(date: Date): boolean {
    if (!this.config.enabled) return true;
    return this.config.days.includes(date.getDay());
  }

  // Get the next business day
  getNextBusinessDay(after: Date): Date {
    const current = new Date(after);
    current.setDate(current.getDate() + 1); // Start from tomorrow
    current.setHours(0, 0, 0, 0);

    while (!this.isBusinessDay(current)) {
      current.setDate(current.getDate() + 1);
    }

    return current;
  }

  // Get the previous business day
  getPreviousBusinessDay(before: Date): Date {
    const current = new Date(before);
    current.setDate(current.getDate() - 1); // Start from yesterday
    current.setHours(23, 59, 59, 999);

    while (!this.isBusinessDay(current)) {
      current.setDate(current.getDate() - 1);
    }

    return current;
  }
}

// React hook for using the business hours validator
export function useBusinessHoursValidator(config?: BusinessHoursConfig) {
  const validator = useMemo(() => {
    return new BusinessHoursValidator(config);
  }, [config]);

  // Update validator when config changes
  const updateValidator = useCallback((newConfig: BusinessHoursConfig) => {
    validator.updateConfig(newConfig);
  }, [validator]);

  // Validate time range
  const validateTimeRange = useCallback((start: Date, end: Date) => {
    return validator.validateTimeRange(start, end);
  }, [validator]);

  // Check if time is within business hours
  const isTimeWithinBusinessHours = useCallback((date: Date) => {
    return validator.isTimeWithinBusinessHours(date);
  }, [validator]);

  // Get business hours boundaries
  const getBusinessHoursBoundaries = useCallback((date: Date) => {
    return validator.getBusinessHoursBoundaries(date);
  }, [validator]);

  // Check if day is a business day
  const isBusinessDay = useCallback((date: Date) => {
    return validator.isBusinessDay(date);
  }, [validator]);

  // Get next business day
  const getNextBusinessDay = useCallback((after: Date) => {
    return validator.getNextBusinessDay(after);
  }, [validator]);

  // Get previous business day
  const getPreviousBusinessDay = useCallback((before: Date) => {
    return validator.getPreviousBusinessDay(before);
  }, [validator]);

  return {
    validator,
    updateValidator,
    validateTimeRange,
    isTimeWithinBusinessHours,
    getBusinessHoursBoundaries,
    isBusinessDay,
    getNextBusinessDay,
    getPreviousBusinessDay,
  };
}

// Component for displaying business hours validation results
export function BusinessHoursValidationResult({ 
  result 
}: { 
  result: BusinessHoursValidationResult 
}) {
  if (result.isValid) {
    return (
      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center gap-2">
          <span className="text-green-600">✓</span>
          <span className="text-sm font-medium text-green-900">Inom arbetstid</span>
        </div>
      </div>
    );
  }

  const getWarningIcon = (level: BusinessHoursWarningLevel) => {
    switch (level) {
      case 'error': return '⚠️';
      case 'warning': return '⚡';
      case 'info': return 'ℹ️';
    }
  };

  const getWarningColor = (level: BusinessHoursWarningLevel) => {
    switch (level) {
      case 'error': return 'text-red-600';
      case 'warning': return 'text-amber-600';
      case 'info': return 'text-blue-600';
    }
  };

  const getWarningBgColor = (level: BusinessHoursWarningLevel) => {
    switch (level) {
      case 'error': return 'bg-red-50 border-red-200';
      case 'warning': return 'bg-amber-50 border-amber-200';
      case 'info': return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className={`p-3 border rounded-lg ${getWarningBgColor(result.warning.warningLevel)}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={getWarningColor(result.warning.warningLevel)}>
          {getWarningIcon(result.warning.warningLevel)}
        </span>
        <span className={`text-sm font-medium ${getWarningColor(result.warning.warningLevel)}`}>
          {result.warning.warningLevel === 'error' ? 'Utanför arbetstid' :
           result.warning.warningLevel === 'warning' ? 'Varning: Arbetstid' :
           'Info: Arbetstid'}
        </span>
      </div>
      
      <div className="text-sm text-neutral-600 mb-2">
        {result.warning.minutesOutside} minuter utanför arbetstid
      </div>

      {result.suggestions.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-neutral-900">Förslag:</div>
          {result.suggestions.slice(0, 2).map((suggestion, index) => (
            <div key={index} className="text-xs text-neutral-600 p-2 bg-white/50 rounded">
              <div className="font-medium">{suggestion.title}</div>
              <div>{suggestion.description}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}