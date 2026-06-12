// src/lib/orderStatus.ts
// Single source of truth for order/track statuses

export type TrackStatus =
  | "INKOMMANDE"
  | "PAGAENDE"
  | "LEVERANS"
  | "AVSLUTAD"
  | "PALACK";

export const STATUS_DISPLAY: Record<TrackStatus, string> = {
  INKOMMANDE: "Inkommande",
  PAGAENDE:   "P\u00e5g\u00e5ende",
  LEVERANS:   "Leverans",
  AVSLUTAD:   "Utf\u00f6rt arbete",
  PALACK:     "P\u00e5 lack",
};

export type StatusColorParts = {
  bgClass: string;
  textClass: string;
  borderClass: string;
  bgHex: string;
  textHex: string;
  borderHex: string;
};
export const STATUS_COLOR_PARTS: Record<TrackStatus, StatusColorParts> = {
  
INKOMMANDE: {
  // fresh green, good contrast
  bgClass: "bg-[#BDEDC2]",
  textClass: "text-[#174826]",
  borderClass: "border-[#53C873]",
  bgHex: "#BDEDC2",
  textHex: "#174826",
  borderHex: "#53C873",
},
  PAGAENDE: {
    // brighter sky
    bgClass: "bg-[#9FD6FF]",
    textClass: "text-[#0A3F60]",
    borderClass: "border-[#5FB5F2]",
    bgHex: "#9FD6FF",
    textHex: "#0A3F60",
    borderHex: "#5FB5F2",
  },
  LEVERANS: {
    // readable purple
    bgClass: "bg-[#CDB7FF]",
    textClass: "text-[#35265F]",
    borderClass: "border-[#A48AF6]",
    bgHex: "#CDB7FF",
    textHex: "#35265F",
    borderHex: "#A48AF6",
  },
  AVSLUTAD: {
    // sturdier gray-blue
    bgClass: "bg-[#C9D6DF]",
    textClass: "text-[#24313A]",
    borderClass: "border-[#9FB3C1]",
    bgHex: "#C9D6DF",
    textHex: "#24313A",
    borderHex: "#9FB3C1",
  },
  PALACK: {
    // apricot (packing)
    bgClass: "bg-[#FFC586]",
    textClass: "text-[#5A2E00]",
    borderClass: "border-[#FF9F43]",
    bgHex: "#FFC586",
    textHex: "#5A2E00",
    borderHex: "#FF9F43",
  },
};

export const STATUS_COLORS: Record<TrackStatus, string> = Object.fromEntries(
  Object.entries(STATUS_COLOR_PARTS).map(([key, spec]) => [
    key,
    `${spec.bgClass} ${spec.textClass} ${spec.borderClass}`,
  ])
) as Record<TrackStatus, string>;

// Convenient groupings
export const CALENDAR_SETTABLE: TrackStatus[] = ["PAGAENDE", "PALACK", "LEVERANS", "AVSLUTAD"];
export const ALL_STATUSES: TrackStatus[] = [
  "INKOMMANDE",
  "PAGAENDE",
  "LEVERANS",
  "PALACK",
  "AVSLUTAD",
];

