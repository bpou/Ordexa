"use client";

import { useState } from "react";
import { ArrowUpIcon } from "lucide-react";
import Button from "@/components/ui/button";
import Badge from "@/components/ui/Badge";
import Accordion from "@/components/ui/Accordion";
import Tabs from "@/components/ui/Tabs";
import ProgressBar from "@/components/ui/ProgressBar";
import { Field, Input, Select } from "@/components/ui/Field";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import { AnimatedField, AnimatedInput, AnimatedSelect as AnimatedUiSelect } from "@/components/ui/AnimatedField";
import { ToastContainer, type ToastProps } from "@/components/ui/Toast";
import { AnimatedSelect } from "@/components/AnimatedSelect";
import FileUploadButton from "@/components/FileUploadButton";
import { CustomerReferencePicker } from "@/components/CustomerReferencePicker";
import { Shimmer } from "@/components/Shimmer";
import { ShimmerDemo } from "@/components/ShimmerDemo";
import OrdinaLoader, { OrdinaLogoSpinner } from "@/components/OrdinaLoader";
import OrderFilesClient from "@/components/OrderFilesClient";
import NavLinks from "@/components/NavLinks";
import MobileMenu from "@/components/MobileMenu";
import RegisterMenu from "@/components/RegisterMenu";
import UserMenu from "@/components/UserMenu";
import Footer from "@/components/Footer";
import { AppSessionProvider } from "@/components/AppSessionProvider";
import CalendarMount from "@/components/CalendarMount";
import CalendarSkin from "@/components/calendar/CalendarSkin";
import CalendarModal from "@/components/calendar/CalendarModal";
import PersonalEventModal from "@/components/calendar/PersonalEventModal";
import { EventConfirmationModal } from "@/components/calendar/EventConfirmationModal";
import { EventConfirmationForm } from "@/components/calendar/EventConfirmationForm";
import { OrderDetailsIntegration } from "@/components/calendar/OrderDetailsIntegration";
import { VisualConflictIndicator, DragStatusIndicator } from "@/components/calendar/VisualConflictIndicator";
import { TemporaryEvent as TemporaryEventPreview } from "@/components/calendar/TemporaryEvent";
import { BusinessHoursConfig, BusinessHoursConfigForm } from "@/components/calendar/BusinessHoursConfig";
import {
  BusinessHoursStatus,
  BusinessHoursLegend as BusinessHoursIndicatorLegend,
  BusinessHoursIndicator,
} from "@/components/calendar/BusinessHoursIndicator";
import {
  BusinessHoursBoundaries,
  BusinessHoursLegend as BusinessHoursBoundariesLegend,
  BusinessHoursHeader,
} from "@/components/calendar/BusinessHoursBoundaries";
import { BusinessHoursValidationResult } from "@/components/calendar/BusinessHoursValidator";
import { CalendarDragDropProvider } from "@/components/calendar/CalendarDragDropProvider";
import { DragDropState } from "@/components/calendar/DragDropState";
import { DragOverlayLayer } from "@/components/calendar/DragOverlayLayer";
import type { EventCreationData, TemporaryEvent as TemporaryEventType } from "@/components/calendar/drag-drop-types";
import type { BusinessHoursConfig as BusinessHoursConfigType, EventConflict } from "@/components/calendar/ConflictTypes";

const sampleBusinessHours: BusinessHoursConfigType = {
  enabled: true,
  startHour: 8,
  endHour: 17,
  days: [1, 2, 3, 4, 5],
  warningThreshold: 30,
};

const sampleConflict: EventConflict = {
  eventId: "evt-1",
  eventTitle: "Existing job",
  conflictType: "overlap",
  severity: "warning",
  conflictDuration: 45,
  overlappingStart: new Date(),
  overlappingEnd: new Date(Date.now() + 45 * 60 * 1000),
};

const sampleEventData: EventCreationData = {
  title: "New test event",
  start: new Date(),
  end: new Date(Date.now() + 90 * 60 * 1000),
  track: "A",
  conflicts: [sampleConflict],
  businessHoursWarning: {
    isOutsideHours: true,
    warningLevel: "warning",
    minutesOutside: 25,
    suggestedTime: {
      start: new Date(Date.now() + 60 * 60 * 1000),
      end: new Date(Date.now() + 150 * 60 * 1000),
    },
    businessHoursConfig: sampleBusinessHours,
  },
  ignoreBusinessHours: false,
};

const sampleTemporaryEvent: TemporaryEventType = {
  id: "tmp-1",
  title: "Temporary test event",
  start: new Date(),
  end: new Date(Date.now() + 60 * 60 * 1000),
  track: "A",
  isTemporary: true,
  source: "drag-drop",
  conflicts: [sampleConflict],
  businessHoursWarning: true,
  conflictDetectionResult: {
    conflicts: [sampleConflict],
    hasConflicts: true,
    hasErrorConflicts: false,
    businessHoursWarning: sampleEventData.businessHoursWarning,
    canCreateEvent: true,
  },
};

const mockCalendarRef = { current: null } as React.RefObject<any>;

function LabItem({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="mb-3 text-base font-semibold text-brand-700">{name}</h3>
      {children}
    </div>
  );
}

export default function ComponentLabClient() {
  const [pickerValue, setPickerValue] = useState("");
  const [showLoader, setShowLoader] = useState(false);
  const [showOrderFiles, setShowOrderFiles] = useState(false);
  const [showCalendarMount, setShowCalendarMount] = useState(false);
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);
  const [personalModalOpen, setPersonalModalOpen] = useState(false);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [showIndicators, setShowIndicators] = useState(false);
  const [animatedSelectValue, setAnimatedSelectValue] = useState("a");

  const [toasts, setToasts] = useState<Omit<ToastProps, "onClose">[]>([]);

  const openToast = () => {
    setToasts([
      {
        id: "toast-single",
        type: "info",
        title: "Toast test",
        description: "One toast component rendered.",
        duration: 3000,
      },
    ]);
  };

  const closeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const renderedToasts: ToastProps[] = toasts.map((t) => ({ ...t, onClose: closeToast }));

  return (
    <div className="space-y-8 pb-20">
      <header className="rounded-xl border border-brand-200 bg-brand-50/60 p-5">
        <h1 className="text-3xl font-bold text-brand-800">Component Lab</h1>
        <p className="mt-2 text-sm text-brand-900/80">One instance per existing component.</p>
      </header>

      <Section title="UI">
        <div className="grid gap-4 lg:grid-cols-2">
          <LabItem name="Button">
            <div className="flex flex-wrap items-center gap-2 md:flex-row">
              <Button variant="outline" onClick={openToast}>Button</Button>
              <Button variant="outline" size="icon" aria-label="Submit" onClick={openToast}>
                <ArrowUpIcon />
              </Button>
            </div>
          </LabItem>
          <LabItem name="Badge"><Badge>Badge</Badge></LabItem>
          <LabItem name="Accordion"><Accordion items={[{ title: "Accordion", content: <span>Accordion content</span> }]} /></LabItem>
          <LabItem name="Tabs"><Tabs tabs={[{ label: "Tab", content: <div>Tab content</div> }]} /></LabItem>
          <LabItem name="ProgressBar"><ProgressBar value={60} /></LabItem>
          <LabItem name="Field / Input / Select"><div className="grid gap-3"><Field label="Textbox"><Input placeholder="Input" /></Field><Field label="Select"><Select defaultValue="a"><option value="a">A</option></Select></Field></div></LabItem>
          <LabItem name="Card / CardHeader / CardContent"><Card><CardHeader>Header</CardHeader><CardContent>Content</CardContent></Card></LabItem>
          <LabItem name="AnimatedField / AnimatedInput / AnimatedSelect"><AnimatedField label="Animated"><AnimatedInput placeholder="Animated input" /></AnimatedField><div className="mt-2"><AnimatedUiSelect defaultValue="1"><option value="1">Option</option></AnimatedUiSelect></div></LabItem>
          <LabItem name="ToastContainer"><div className="text-sm text-neutral-600">Click Button above for toast.</div></LabItem>
        </div>
      </Section>

      <Section title="Core Components">
        <div className="grid gap-4 lg:grid-cols-2">
          <LabItem name="AnimatedSelect"><AnimatedSelect value={animatedSelectValue} onChange={setAnimatedSelectValue} options={[{ value: "a", label: "A" }]} /></LabItem>
          <LabItem name="FileUploadButton"><FileUploadButton onFileSelect={() => {}} /></LabItem>
          <LabItem name="CustomerReferencePicker"><CustomerReferencePicker customerNumber="10001" customerName="Demo" value={pickerValue} onChange={setPickerValue} /></LabItem>
          <LabItem name="Shimmer"><Shimmer className="inline-flex rounded-full bg-neutral-200 px-4 py-2">Shimmer</Shimmer></LabItem>
          <LabItem name="ShimmerDemo"><ShimmerDemo /></LabItem>
          <LabItem name="OrdinaLoader / OrdinaLogoSpinner"><button className="rounded border px-3 py-1" onClick={() => setShowLoader((v) => !v)}>Toggle loader</button><div className="mt-3"><OrdinaLogoSpinner size={56} /></div><OrdinaLoader show={showLoader} /></LabItem>
          <LabItem name="OrderFilesClient"><button className="rounded border px-3 py-1" onClick={() => setShowOrderFiles((v) => !v)}>Toggle OrderFilesClient</button>{showOrderFiles ? <div className="mt-3"><OrderFilesClient orderId="demo-order" initialFiles={[{ name: "demo.pdf", size: 24100, type: "application/pdf", createdAt: new Date().toISOString(), url: "/uploads/1758309389144-skrivut.pdf" }]} /></div> : null}</LabItem>
          <LabItem name="NavLinks"><NavLinks /></LabItem>
          <LabItem name="MobileMenu"><MobileMenu /></LabItem>
          <LabItem name="RegisterMenu"><RegisterMenu /></LabItem>
          <LabItem name="UserMenu"><UserMenu isLoggedIn name="Test User" email="test@ordina.se" image="/default-avatar.png" /></LabItem>
          <LabItem name="AppSessionProvider"><AppSessionProvider session={null}><div className="text-sm">Session provider mounted</div></AppSessionProvider></LabItem>
        </div>
      </Section>

      <Section title="Calendar">
        <div className="grid gap-4 lg:grid-cols-2">
          <LabItem name="CalendarSkin"><CalendarSkin><div className="p-3">CalendarSkin content</div></CalendarSkin></LabItem>
          <LabItem name="CalendarMount"><button className="rounded border px-3 py-1" onClick={() => setShowCalendarMount((v) => !v)}>Toggle CalendarMount</button>{showCalendarMount ? <div className="mt-3 overflow-hidden rounded border"><CalendarMount track="A" /></div> : null}</LabItem>
          <LabItem name="CalendarModal"><button className="rounded border px-3 py-1" onClick={() => setCalendarModalOpen(true)}>Open</button></LabItem>
          <LabItem name="PersonalEventModal"><button className="rounded border px-3 py-1" onClick={() => setPersonalModalOpen(true)}>Open</button></LabItem>
          <LabItem name="EventConfirmationModal"><button className="rounded border px-3 py-1" onClick={() => setEventModalOpen(true)}>Open</button></LabItem>
          <LabItem name="EventConfirmationForm"><EventConfirmationForm eventData={sampleEventData} onDataChange={() => {}} /></LabItem>
          <LabItem name="OrderDetailsIntegration"><OrderDetailsIntegration orderDetails={{ customerName: "Demo AB", customerNumber: "10001", orderTitle: "Sign install", estimatedDuration: 180, orderId: "ORD-123" }} /></LabItem>
          <LabItem name="TemporaryEvent"><div className="relative h-40 overflow-hidden rounded border bg-neutral-50"><TemporaryEventPreview event={sampleTemporaryEvent} position={{ x: 200, y: 200 }} /></div></LabItem>
          <LabItem name="VisualConflictIndicator / DragStatusIndicator"><button className="rounded border px-3 py-1" onClick={() => setShowIndicators((v) => !v)}>Toggle indicators</button><VisualConflictIndicator conflicts={[sampleConflict]} businessHoursWarning={sampleEventData.businessHoursWarning} isVisible={showIndicators} /><DragStatusIndicator conflicts={[sampleConflict]} businessHoursWarning={sampleEventData.businessHoursWarning} isDragging={showIndicators} /></LabItem>
          <LabItem name="BusinessHoursConfig"><BusinessHoursConfig config={sampleBusinessHours} /></LabItem>
          <LabItem name="BusinessHoursConfigForm"><BusinessHoursConfigForm initialConfig={sampleBusinessHours} onSave={async () => {}} onCancel={() => {}} /></LabItem>
          <LabItem name="BusinessHoursStatus"><BusinessHoursStatus config={sampleBusinessHours} /></LabItem>
          <LabItem name="BusinessHoursIndicatorLegend"><BusinessHoursIndicatorLegend config={sampleBusinessHours} /></LabItem>
          <LabItem name="BusinessHoursBoundariesLegend"><BusinessHoursBoundariesLegend config={sampleBusinessHours} /></LabItem>
          <LabItem name="BusinessHoursHeader"><BusinessHoursHeader config={sampleBusinessHours} /></LabItem>
          <LabItem name="BusinessHoursValidationResult"><BusinessHoursValidationResult result={{ isValid: false, warning: sampleEventData.businessHoursWarning, suggestions: [{ type: "move", title: "Move", description: "Move to business hours", suggestedStart: new Date(), suggestedEnd: new Date(Date.now() + 60 * 60 * 1000), confidence: 0.9 }] }} /></LabItem>
          <LabItem name="BusinessHoursIndicator"><BusinessHoursIndicator businessHoursWarning={sampleEventData.businessHoursWarning} isVisible={false} calendarRef={mockCalendarRef} config={sampleBusinessHours} /></LabItem>
          <LabItem name="BusinessHoursBoundaries"><BusinessHoursBoundaries config={sampleBusinessHours} calendarRef={mockCalendarRef} isVisible={false} /></LabItem>
          <LabItem name="CalendarDragDropProvider / DragDropState / DragOverlayLayer"><CalendarDragDropProvider track="A" events={[]}><DragDropState calendarRef={mockCalendarRef}><div className="text-sm">Drag/drop mounted</div><DragOverlayLayer calendarRef={mockCalendarRef} /></DragDropState></CalendarDragDropProvider></LabItem>
        </div>
      </Section>

      <Section title="Layout">
        <LabItem name="Footer"><Footer /></LabItem>
      </Section>

      <CalendarModal open={calendarModalOpen} onClose={() => setCalendarModalOpen(false)} activeTrack="A" activeTracks={["A"]} />
      <PersonalEventModal open={personalModalOpen} onClose={() => setPersonalModalOpen(false)} onEventSaved={() => setPersonalModalOpen(false)} onEventDelete={() => setPersonalModalOpen(false)} />
      <EventConfirmationModal isOpen={eventModalOpen} eventData={sampleEventData} onClose={() => setEventModalOpen(false)} onConfirm={async () => setEventModalOpen(false)} />
      <ToastContainer toasts={renderedToasts} onClose={closeToast} />
    </div>
  );
}
