"use client";

import { useState, useCallback } from "react";
import { BusinessHoursConfigForm } from "@/components/calendar/BusinessHoursConfig";
import { BusinessHoursHeader, BusinessHoursLegend } from "@/components/calendar/BusinessHoursBoundaries";
import { useBusinessHoursConfig } from "@/components/calendar/BusinessHoursConfig";
import type { BusinessHoursConfig } from "@/components/calendar/ConflictTypes";
import { DEFAULT_BUSINESS_HOURS } from "@/components/calendar/ConflictTypes";

export default function BusinessHoursSettingsPage() {
  const { config, isLoading, error, saveConfig, resetToDefault } = useBusinessHoursConfig();
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Handle configuration save
  const handleSaveConfig = useCallback(async (newConfig: BusinessHoursConfig) => {
    setIsSaving(true);
    setSaveError(null);
    setSuccessMessage(null);

    try {
      await saveConfig(newConfig);
      setSuccessMessage("Arbetstidsinställningarna har sparats!");
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Kunde inte spara inställningarna");
    } finally {
      setIsSaving(false);
    }
  }, [saveConfig]);

  // Handle reset to default
  const handleResetToDefault = useCallback(async () => {
    if (!confirm("Är du säker på att du vill återställa till standardinställningarna?")) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSuccessMessage(null);

    try {
      resetToDefault();
      setSuccessMessage("Inställningarna har återställts till standardvärden!");
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Kunde inte återställa inställningarna");
    } finally {
      setIsSaving(false);
    }
  }, [resetToDefault]);

  // Handle form cancel
  const handleCancel = useCallback(() => {
    setSaveError(null);
    setSuccessMessage(null);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900 mx-auto"></div>
          <p className="mt-2 text-sm text-neutral-600">Laddar inställningar...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-600 text-lg mb-2">❌</div>
          <p className="text-sm text-neutral-600">Kunde inte ladda inställningar: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Arbetstidsinställningar</h1>
          <p className="text-neutral-600 mt-2">
            Konfigurera arbetstider för kalendern. Dessa inställningar används för att varna när händelser skapas utanför definierade arbetstider.
          </p>
        </div>

        {/* Current configuration display */}
        <div className="bg-white border border-neutral-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-neutral-900">Nuvarande inställningar</h2>
            <button
              onClick={handleResetToDefault}
              disabled={isSaving}
              className="px-3 py-1.5 text-sm text-neutral-600 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Återställ till standard
            </button>
          </div>
          
          <BusinessHoursHeader config={config} />
          <BusinessHoursLegend config={config} />
        </div>

        {/* Success message */}
        {successMessage && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-3">
              <span className="text-green-600">✓</span>
              <div>
                <h3 className="font-semibold text-green-900">Klart!</h3>
                <p className="text-sm text-green-700 mt-1">{successMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Error message */}
        {saveError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-3">
              <span className="text-red-600">❌</span>
              <div>
                <h3 className="font-semibold text-red-900">Fel</h3>
                <p className="text-sm text-red-700 mt-1">{saveError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Configuration form */}
        <div className="bg-white border border-neutral-200 rounded-lg">
          <div className="px-6 py-4 border-b border-neutral-200">
            <h2 className="text-lg font-semibold text-neutral-900">Redigera inställningar</h2>
          </div>
          
          <BusinessHoursConfigForm
            initialConfig={config}
            onSave={handleSaveConfig}
            onCancel={handleCancel}
            isLoading={isSaving}
          />
        </div>

        {/* Information section */}
        <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">Om arbetstidsbegränsningar</h2>
          
          <div className="space-y-4 text-sm text-neutral-600">
            <div>
              <h3 className="font-medium text-neutral-900 mb-2">Hur det fungerar</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>När en användare drar för att skapa en händelse utanför arbetstid visas en varning</li>
                <li>Systemet föreslår alternativa tider inom arbetstid</li>
                <li>Användare kan välja att ignorera varningen och skapa händelsen ändå</li>
                <li>Arbetstiderna markeras visuellt i kalendern med gröna områden</li>
              </ul>
            </div>

            <div>
              <h3 className="font-medium text-neutral-900 mb-2">Standardinställningar</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Arbetstid: 08:00 - 17:00</li>
                <li>Arbetsdagar: Måndag - Fredag</li>
                <li>Varningströskel: 30 minuter utanför arbetstid</li>
              </ul>
            </div>

            <div>
              <h3 className="font-medium text-neutral-900 mb-2">Varningsnivåer</h3>
              <ul className="list-disc list-inside space-y-1">
                <li><strong className="text-orange-600">Error:</strong> Mer än 60 minuter utanför arbetstid</li>
                <li><strong className="text-amber-600">Warning:</strong> 30-60 minuter utanför arbetstid</li>
                <li><strong className="text-blue-600">Info:</strong> Mindre än 30 minuter utanför arbetstid</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}