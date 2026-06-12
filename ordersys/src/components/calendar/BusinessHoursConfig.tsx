"use client";

import { useState, useCallback, useEffect } from "react";
import type { BusinessHoursConfig } from "./ConflictTypes";
import { DEFAULT_BUSINESS_HOURS } from "./ConflictTypes";

interface BusinessHoursConfigProps {
  config?: BusinessHoursConfig;
  onConfigChange?: (config: BusinessHoursConfig) => void;
  readOnly?: boolean;
}

interface BusinessHoursConfigFormProps {
  initialConfig?: BusinessHoursConfig;
  onSave: (config: BusinessHoursConfig) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

// Configuration component for business hours
export function BusinessHoursConfig({ 
  config, 
  onConfigChange, 
  readOnly = false 
}: BusinessHoursConfigProps) {
  const [localConfig, setLocalConfig] = useState<BusinessHoursConfig>(
    config || DEFAULT_BUSINESS_HOURS
  );

  // Update local config when prop changes
  useEffect(() => {
    if (config) {
      setLocalConfig(config);
    }
  }, [config]);

  // Handle config changes
  const handleConfigChange = useCallback((updates: Partial<BusinessHoursConfig>) => {
    const newConfig = { ...localConfig, ...updates };
    setLocalConfig(newConfig);
    onConfigChange?.(newConfig);
  }, [localConfig, onConfigChange]);

  // Handle enabled toggle
  const handleEnabledToggle = useCallback((enabled: boolean) => {
    handleConfigChange({ enabled });
  }, [handleConfigChange]);

  // Handle time changes
  const handleTimeChange = useCallback((field: 'startHour' | 'endHour', value: number) => {
    handleConfigChange({ [field]: value });
  }, [handleConfigChange]);

  // Handle day selection
  const handleDayToggle = useCallback((day: number, isSelected: boolean) => {
    const currentDays = localConfig.days;
    let newDays: number[];
    
    if (isSelected) {
      newDays = [...currentDays, day].sort((a, b) => a - b);
    } else {
      newDays = currentDays.filter(d => d !== day);
    }
    
    handleConfigChange({ days: newDays });
  }, [localConfig.days, handleConfigChange]);

  // Handle warning threshold change
  const handleWarningThresholdChange = useCallback((threshold: number) => {
    handleConfigChange({ warningThreshold: threshold });
  }, [handleConfigChange]);

  const dayNames = ['Sön', 'Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör'];
  const hourOptions = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="business-hours-config space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-neutral-900">Arbetstidsinställningar</h3>
        
        {/* Enable/Disable business hours */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="business-hours-enabled"
            checked={localConfig.enabled}
            onChange={(e) => handleEnabledToggle(e.target.checked)}
            disabled={readOnly}
            className="w-4 h-4 text-neutral-900 border-neutral-300 rounded focus:ring-neutral-500"
          />
          <label htmlFor="business-hours-enabled" className="text-sm font-medium text-neutral-700">
            Aktivera arbetstidsbegränsningar
          </label>
        </div>

        {localConfig.enabled && (
          <>
            {/* Time range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Starttid
                </label>
                <select
                  value={localConfig.startHour}
                  onChange={(e) => handleTimeChange('startHour', parseInt(e.target.value))}
                  disabled={readOnly}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-500"
                >
                  {hourOptions.map(hour => (
                    <option key={hour} value={hour}>
                      {hour.toString().padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Sluttid
                </label>
                <select
                  value={localConfig.endHour}
                  onChange={(e) => handleTimeChange('endHour', parseInt(e.target.value))}
                  disabled={readOnly}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-500"
                >
                  {hourOptions.map(hour => (
                    <option key={hour} value={hour}>
                      {hour.toString().padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Working days */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Arbetsdagar
              </label>
              <div className="flex flex-wrap gap-2">
                {dayNames.map((name, index) => (
                  <label
                    key={index}
                    className={`inline-flex items-center px-3 py-1.5 rounded-lg border cursor-pointer transition-colors ${
                      localConfig.days.includes(index)
                        ? 'bg-neutral-900 text-white border-neutral-900'
                        : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={localConfig.days.includes(index)}
                      onChange={(e) => handleDayToggle(index, e.target.checked)}
                      disabled={readOnly}
                      className="sr-only"
                    />
                    {name}
                  </label>
                ))}
              </div>
            </div>

            {/* Warning threshold */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Varningströskel (minuter utanför arbetstid)
              </label>
              <input
                type="number"
                min="0"
                max="240"
                value={localConfig.warningThreshold}
                onChange={(e) => handleWarningThresholdChange(parseInt(e.target.value) || 0)}
                disabled={readOnly}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-500"
              />
              <p className="text-xs text-neutral-500 mt-1">
                Antal minuter utanför arbetstid innan en varning visas
              </p>
            </div>

            {/* Configuration summary */}
            <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg">
              <h4 className="text-sm font-semibold text-neutral-900 mb-2">Sammanfattning</h4>
              <div className="text-sm text-neutral-600 space-y-1">
                <div>
                  Arbetstid: {localConfig.startHour.toString().padStart(2, '0')}:00 - 
                  {localConfig.endHour.toString().padStart(2, '0')}:00
                </div>
                <div>
                  Dagar: {localConfig.days.map(d => dayNames[d]).join(', ')}
                </div>
                <div>
                  Varning efter: {localConfig.warningThreshold} minuter utanför arbetstid
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Form component for editing business hours configuration
export function BusinessHoursConfigForm({
  initialConfig,
  onSave,
  onCancel,
  isLoading = false
}: BusinessHoursConfigFormProps) {
  const [config, setConfig] = useState<BusinessHoursConfig>(
    initialConfig || DEFAULT_BUSINESS_HOURS
  );
  const [error, setError] = useState<string | null>(null);

  // Validate configuration
  const validateConfig = useCallback((config: BusinessHoursConfig): string | null => {
    if (config.enabled) {
      if (config.startHour >= config.endHour) {
        return "Starttiden måste vara före sluttiden";
      }
      
      if (config.days.length === 0) {
        return "Minst en arbetsdag måste väljas";
      }
      
      if (config.warningThreshold < 0) {
        return "Varningströskeln kan inte vara negativ";
      }
    }
    
    return null;
  }, []);

  // Handle save
  const handleSave = useCallback(async () => {
    const validationError = validateConfig(config);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    
    try {
      await onSave(config);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte spara konfigurationen');
    }
  }, [config, validateConfig, onSave]);

  return (
    <div className="space-y-6">
      <BusinessHoursConfig
        config={config}
        onConfigChange={setConfig}
        readOnly={isLoading}
      />

      {/* Error message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <span className="text-red-600">❌</span>
            <div>
              <h3 className="font-semibold text-red-900">Fel</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Form actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Avbryt
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-white bg-neutral-900 rounded-lg hover:bg-neutral-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isLoading && (
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          )}
          Spara
        </button>
      </div>
    </div>
  );
}

// Hook for managing business hours configuration
export function useBusinessHoursConfig(initialConfig?: BusinessHoursConfig) {
  const [config, setConfig] = useState<BusinessHoursConfig>(
    initialConfig || DEFAULT_BUSINESS_HOURS
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load configuration from API
  const loadConfig = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/calendar/business-hours');
      
      if (!response.ok) {
        throw new Error(`Failed to load business hours: ${response.statusText}`);
      }
      
      const data = await response.json();
      setConfig(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte ladda konfigurationen');
      console.error('Failed to load business hours config:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save configuration to API
  const saveConfig = useCallback(async (newConfig: BusinessHoursConfig) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/calendar/business-hours', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newConfig),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to save business hours: ${response.statusText}`);
      }
      
      const data = await response.json();
      setConfig(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte spara konfigurationen');
      console.error('Failed to save business hours config:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Reset to default configuration
  const resetToDefault = useCallback(() => {
    setConfig(DEFAULT_BUSINESS_HOURS);
  }, []);

  return {
    config,
    setConfig,
    loadConfig,
    saveConfig,
    resetToDefault,
    isLoading,
    error,
  };
}