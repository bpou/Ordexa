import bcrypt from "bcrypt";
import {
  CalendarLabel,
  EventVisibility,
  PrismaClient,
  Role,
  Track,
  TrackStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_TAG = "[DEMO_SEED:ORDEXA_V2]";
const DEMO_CUSTOMER_TENANT = "ordexa-demo-seed";
const CLEAR = ["1", "true", "yes", "on"].includes(
  String(process.env.SEED_DEMO_CLEAR ?? "").toLowerCase(),
);
const DEFAULT_EMAIL_DOMAIN = (process.env.SEED_DEMO_EMAIL_DOMAIN || "ordexa.demo")
  .trim()
  .toLowerCase();

function slugify(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function addDays(base, days) {
  const date = new Date(base.getTime());
  date.setDate(date.getDate() + days);
  return date;
}

function startOfWeek(date) {
  const result = new Date(date.getTime());
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

function atTime(base, hours, minutes = 0) {
  const result = new Date(base.getTime());
  result.setHours(hours, minutes, 0, 0);
  return result;
}

function fullDay(base) {
  return {
    start: atTime(base, 0, 0),
    end: atTime(addDays(base, 1), 0, 0),
  };
}

function demoNote(note) {
  return `${DEMO_TAG} ${note}`.trim();
}

function buildEmail(localPart) {
  return `${localPart}@${DEFAULT_EMAIL_DOMAIN}`;
}

function envPasswordFor(email) {
  const local = email.split("@")[0].replace(/[^a-z0-9]/gi, "_").toUpperCase();
  return (
    process.env[`SEED_DEMO_${local}_PASSWORD`] ||
    process.env[`SEED_DEMO_${local}_PASS`] ||
    process.env.SEED_DEMO_DEFAULT_PASSWORD ||
    null
  );
}

const now = new Date();
const week0 = startOfWeek(now);
const week1 = addDays(week0, 7);
const week2 = addDays(week0, 14);

const demoUsers = [
  {
    key: "lukas-admin",
    email: "lukas@stunt.se",
    name: "Lukas Ahlqvist",
    role: Role.ADMIN,
    image: "https://i.pravatar.cc/256?u=ordexa-lukas",
  },
  {
    key: "niklas-seller",
    email: "niklas@stunt.se",
    name: "Niklas Stunt",
    role: Role.SALJARE,
    image: "https://i.pravatar.cc/256?u=ordexa-niklas",
  },
  {
    key: "maria-atelje",
    email: buildEmail("maria.berg"),
    name: "Maria Berg",
    role: Role.A_TEAM,
    image: "https://i.pravatar.cc/256?u=ordexa-maria",
  },
  {
    key: "fredrik-verkstad",
    email: buildEmail("fredrik.dahl"),
    name: "Fredrik Dahl",
    role: Role.B_TEAM,
    image: "https://i.pravatar.cc/256?u=ordexa-fredrik",
  },
  {
    key: "nora-montage",
    email: buildEmail("nora.andersson"),
    name: "Nora Andersson",
    role: Role.C_TEAM,
    image: "https://i.pravatar.cc/256?u=ordexa-nora",
  },
  {
    key: "kalle-bildekor",
    email: buildEmail("kalle.lind"),
    name: "Kalle Lind",
    role: Role.D_TEAM,
    image: "https://i.pravatar.cc/256?u=ordexa-kalle",
  },
];

const customerReferences = [
  {
    id: "demo-customer-brand-factory",
    customerNumber: "11001",
    name: "Brand Factory Umea",
    email: "umea@brandfactory.se",
    phone: "090-770500",
    note: demoNote("Omskyltning, butiksmaterial och montageuppdrag."),
  },
  {
    id: "demo-customer-visit-umea",
    customerNumber: "11002",
    name: "Visit Umea",
    email: "projekt@visitumea.se",
    phone: "090-161616",
    note: demoNote("Eventskyltar, scenproduktion och turistmaterial."),
  },
  {
    id: "demo-customer-umealvdal",
    customerNumber: "11003",
    name: "Ume Alvdal",
    email: "kommunikation@umealvdal.se",
    phone: "090-121212",
    note: demoNote("Traestativ, naturinformation och ledskyltar."),
  },
  {
    id: "demo-customer-socialtjansten",
    customerNumber: "11004",
    name: "Socialtjansten Umea Kommun",
    email: "socialtjansten@umea.se",
    phone: "090-161000",
    note: demoNote("Invandig och utvandig skyltning for verksamheter."),
  },
  {
    id: "demo-customer-intersport",
    customerNumber: "11005",
    name: "Intersport Mariedal",
    email: "mariedal@intersport.se",
    phone: "090-770700",
    note: demoNote("Butiksskyltning, kampanjmaterial och omfoliering."),
  },
  {
    id: "demo-customer-kommun",
    customerNumber: "11006",
    name: "Umea Kommun",
    email: "servicecenter@umea.se",
    phone: "090-161616",
    note: demoNote("Kommunala serviceuppdrag och lokalskyltning."),
  },
  {
    id: "demo-customer-bostaden",
    customerNumber: "11007",
    name: "Bostaden Umea",
    email: "forvaltning@bostaden.umea.se",
    phone: "090-171000",
    note: demoNote("Portskyltar, trapphusinfo och servicearenden."),
  },
  {
    id: "demo-customer-bilhallen",
    customerNumber: "11008",
    name: "Bilhallen Umea",
    email: "marknad@bilhallenumea.se",
    phone: "090-720800",
    note: demoNote("Fasadskyltar, fordonsdekor och kampanjvepor."),
  },
  {
    id: "demo-customer-stunt",
    customerNumber: "11009",
    name: "Stunt Skylt & Reklam demo customer",
    email: "demo@stunt.se",
    phone: "090-999000",
    note: demoNote("Interna testordrar och demojobb."),
  },
  {
    id: "demo-customer-umea-energi",
    customerNumber: "11010",
    name: "Umea Energi demo",
    email: "marknad@umeaenergi.se",
    phone: "090-161300",
    note: demoNote("Ljuslador, platsbesok och underhall."),
  },
  {
    id: "demo-customer-nus",
    customerNumber: "11011",
    name: "Norrlands universitetssjukhus demo",
    email: "kommunikation@regionvasterbotten.se",
    phone: "090-7850000",
    note: demoNote("Fordonsdekor och invandig orienteringsskyltning."),
  },
];

const demoOrders = [
  {
    key: "brand-factory-intersport",
    orderNumber: "AVM-82962",
    title: "AVM 82962 Brand Factory Omskyltning Intersport / mf",
    customerName: "Brand Factory / Intersport Mariedal",
    dueDate: addDays(week0, 1),
    deliveryMethod: "MONTAGE",
    deliveryAddress: "Mariedal, Bodvagen 3, Umea",
    notes: demoNote(
      "Heldagsjobb i butiksmiljo. Ny fasadskylt, invandig omfoliering och kampanjskyltar."
    ),
    createdByKey: "niklas-seller",
    billingConfirmedAt: null,
    tracks: [
      {
        track: Track.A,
        status: TrackStatus.AVSLUTAD,
        plannedStartAt: atTime(addDays(week0, -1), 7, 0),
        plannedEndAt: atTime(addDays(week0, -1), 15, 30),
        actualStartAt: atTime(addDays(week0, -1), 7, 10),
        actualEndAt: atTime(addDays(week0, -1), 15, 20),
        assigneeKey: "maria-atelje",
        timeSpentMinutes: 420,
        colorHex: "#53C873",
        calendarLabel: CalendarLabel.UTFORT_ARBETE,
      },
      {
        track: Track.B,
        status: TrackStatus.LEVERANS,
        plannedStartAt: atTime(addDays(week0, 0), 7, 0),
        plannedEndAt: atTime(addDays(week0, 0), 16, 0),
        actualStartAt: atTime(addDays(week0, 0), 7, 5),
        assigneeKey: "fredrik-verkstad",
        timeSpentMinutes: 300,
        colorHex: "#53C873",
        calendarLabel: CalendarLabel.KAN_FLYTTAS,
      },
      {
        track: Track.C,
        status: TrackStatus.PAGAENDE,
        plannedStartAt: atTime(addDays(week0, 0), 7, 0),
        plannedEndAt: atTime(addDays(week0, 0), 16, 0),
        actualStartAt: atTime(addDays(week0, 0), 7, 0),
        assigneeKey: "nora-montage",
        timeSpentMinutes: 240,
        colorHex: "#53C873",
        calendarLabel: CalendarLabel.KAN_FLYTTAS,
      },
    ],
    events: [
      {
        track: Track.C,
        start: atTime(addDays(week0, 0), 7, 0),
        end: atTime(addDays(week0, 0), 16, 0),
        title: "AVM 82962 Brand Factory Omskyltning Intersport / mf",
        notes: "Mariedal, Bodvagen 3, Umea",
      },
    ],
    files: [
      { track: Track.A, filename: "avm-82962-original.pdf" },
      { track: Track.C, filename: "avm-82962-montageplan.pdf" },
    ],
    timeEntries: [
      { track: Track.A, minutes: 210, userKey: "maria-atelje" },
      { track: Track.C, minutes: 180, userKey: "nora-montage" },
    ],
  },
  {
    key: "visit-umea-sommarparken",
    orderNumber: "AVM-83133",
    title: "AVM 83133 Visit Umea Sommarparken scen + 2 gatupratare / mf",
    customerName: "Visit Umea",
    dueDate: addDays(week0, 2),
    deliveryMethod: "MONTAGE",
    deliveryAddress: "Dobelnsgatan 5, Umea",
    notes: demoNote(
      "Scenskylt till Sommarparken, tva gatupratare och snabb montering innan helgstart."
    ),
    createdByKey: "niklas-seller",
    billingConfirmedAt: null,
    tracks: [
      {
        track: Track.A,
        status: TrackStatus.PAGAENDE,
        plannedStartAt: atTime(addDays(week0, 0), 12, 0),
        plannedEndAt: atTime(addDays(week0, 1), 9, 0),
        actualStartAt: atTime(addDays(week0, 0), 12, 15),
        assigneeKey: "maria-atelje",
        timeSpentMinutes: 240,
        colorHex: "#E74B56",
        calendarLabel: CalendarLabel.BOKAD_TID,
      },
      {
        track: Track.B,
        status: TrackStatus.PAGAENDE,
        plannedStartAt: atTime(addDays(week0, 1), 7, 0),
        plannedEndAt: atTime(addDays(week0, 1), 16, 0),
        actualStartAt: atTime(addDays(week0, 1), 7, 0),
        assigneeKey: "fredrik-verkstad",
        timeSpentMinutes: 270,
        colorHex: "#E74B56",
        calendarLabel: CalendarLabel.BOKAD_TID,
      },
      {
        track: Track.C,
        status: TrackStatus.INKOMMANDE,
        plannedStartAt: atTime(addDays(week0, 2), 7, 0),
        plannedEndAt: atTime(addDays(week0, 2), 16, 0),
        assigneeKey: "nora-montage",
        timeSpentMinutes: 0,
        colorHex: "#E74B56",
        calendarLabel: CalendarLabel.BOKAD_TID,
      },
    ],
    events: [
      {
        track: Track.B,
        start: atTime(addDays(week0, 1), 7, 0),
        end: atTime(addDays(week0, 1), 16, 0),
        title: "AVM 83133 Visit Umea Sommarparken scen + 2 gatupratare / mf",
        notes: "Dobelnsgatan 5, Umea",
      },
    ],
    files: [{ track: Track.A, filename: "avm-83133-produktionsskiss.ai" }],
    timeEntries: [{ track: Track.B, minutes: 210, userKey: "fredrik-verkstad" }],
  },
  {
    key: "vader-skydd-karnan",
    orderNumber: "83380",
    title: "83380 UK Vader skydd Stada upp pa Karan / NA",
    customerName: "Bostaden Umea",
    dueDate: addDays(week0, 2),
    deliveryMethod: "SERVICE",
    deliveryAddress: "Karan, Umea",
    notes: demoNote(
      "Servicejobb med upprensning av vader skydd, infastning och byte av skadade dekaler."
    ),
    createdByKey: "lukas-admin",
    billingConfirmedAt: null,
    tracks: [
      {
        track: Track.B,
        status: TrackStatus.PAGAENDE,
        plannedStartAt: atTime(addDays(week0, 2), 7, 0),
        plannedEndAt: atTime(addDays(week0, 2), 16, 0),
        actualStartAt: atTime(addDays(week0, 2), 7, 5),
        assigneeKey: "fredrik-verkstad",
        timeSpentMinutes: 360,
        colorHex: "#53C873",
        calendarLabel: CalendarLabel.KAN_FLYTTAS,
      },
      {
        track: Track.C,
        status: TrackStatus.PAGAENDE,
        plannedStartAt: atTime(addDays(week0, 2), 7, 0),
        plannedEndAt: atTime(addDays(week0, 2), 16, 0),
        actualStartAt: atTime(addDays(week0, 2), 7, 10),
        assigneeKey: "nora-montage",
        timeSpentMinutes: 300,
        colorHex: "#53C873",
        calendarLabel: CalendarLabel.KAN_FLYTTAS,
      },
    ],
    events: [
      {
        track: Track.C,
        start: atTime(addDays(week0, 2), 7, 0),
        end: atTime(addDays(week0, 2), 16, 0),
        title: "83380 UK Vader skydd Stada upp pa Karan / NA",
        notes: "Karan, Umea",
      },
    ],
    files: [{ track: Track.B, filename: "83380-serviceprotokoll.pdf" }],
    timeEntries: [{ track: Track.C, minutes: 240, userKey: "nora-montage" }],
  },
  {
    key: "ge-ta-holmsund",
    orderNumber: "AVM-83226",
    title: "AVM 83226 Vak in Ge&Ta Holmsund / NA",
    customerName: "Ge & Ta Holmsund",
    dueDate: addDays(week0, 3),
    deliveryMethod: "MONTAGE",
    deliveryAddress: "Holmsund centrum, Umea",
    notes: demoNote("Kort montagepass for invandig skylt och kassazonsdekal."),
    createdByKey: "niklas-seller",
    billingConfirmedAt: null,
    tracks: [
      {
        track: Track.A,
        status: TrackStatus.AVSLUTAD,
        plannedStartAt: atTime(addDays(week0, 2), 14, 0),
        plannedEndAt: atTime(addDays(week0, 2), 16, 0),
        actualStartAt: atTime(addDays(week0, 2), 14, 0),
        actualEndAt: atTime(addDays(week0, 2), 15, 45),
        assigneeKey: "maria-atelje",
        timeSpentMinutes: 105,
        colorHex: "#53C873",
        calendarLabel: CalendarLabel.UTFORT_ARBETE,
      },
      {
        track: Track.C,
        status: TrackStatus.LEVERANS,
        plannedStartAt: atTime(addDays(week0, 3), 7, 0),
        plannedEndAt: atTime(addDays(week0, 3), 11, 0),
        actualStartAt: atTime(addDays(week0, 3), 7, 0),
        assigneeKey: "nora-montage",
        timeSpentMinutes: 120,
        colorHex: "#53C873",
        calendarLabel: CalendarLabel.KAN_FLYTTAS,
      },
    ],
    events: [
      {
        track: Track.C,
        start: atTime(addDays(week0, 3), 7, 0),
        end: atTime(addDays(week0, 3), 11, 0),
        title: "AVM 83226 Vak in Ge&Ta Holmsund / NA",
        notes: "Holmsund centrum, Umea",
      },
    ],
    files: [{ track: Track.C, filename: "avm-83226-checklista.pdf" }],
    timeEntries: [{ track: Track.C, minutes: 90, userKey: "nora-montage" }],
  },
  {
    key: "rustabild-hiss",
    orderNumber: "DM-83355",
    title: "xxxx Nonby Rustabild hiss / FD",
    customerName: "Bilhallen Umea",
    dueDate: addDays(week0, 3),
    deliveryMethod: "SERVICE",
    deliveryAddress: "Formvagen 8, Umea",
    notes: demoNote("Snabbservice av hisskylt och byte av slitna dekaler i kundmottagning."),
    createdByKey: "lukas-admin",
    billingConfirmedAt: null,
    tracks: [
      {
        track: Track.B,
        status: TrackStatus.PAGAENDE,
        plannedStartAt: atTime(addDays(week0, 3), 11, 0),
        plannedEndAt: atTime(addDays(week0, 3), 13, 30),
        actualStartAt: atTime(addDays(week0, 3), 11, 10),
        assigneeKey: "fredrik-verkstad",
        timeSpentMinutes: 95,
        colorHex: "#53C873",
        calendarLabel: CalendarLabel.KAN_FLYTTAS,
      },
    ],
    events: [
      {
        track: Track.B,
        start: atTime(addDays(week0, 3), 11, 0),
        end: atTime(addDays(week0, 3), 13, 30),
        title: "xxxx Nonby Rustabild hiss / FD",
        notes: "Formvagen 8, Umea",
      },
    ],
    files: [],
    timeEntries: [{ track: Track.B, minutes: 80, userKey: "fredrik-verkstad" }],
  },
  {
    key: "ume-alvdal-trastativ",
    orderNumber: "AVM-81813",
    title: "AVM 81813 Ume Alvdal, skylt pa trastativ / FD",
    customerName: "Ume Alvdal",
    dueDate: addDays(week0, 4),
    deliveryMethod: "MONTAGE",
    deliveryAddress: "Kungsgatan 14, Umea",
    notes: demoNote("Informationsskylt pa trastativ for naturled. Kort pass pa formiddagen."),
    createdByKey: "niklas-seller",
    billingConfirmedAt: null,
    tracks: [
      {
        track: Track.A,
        status: TrackStatus.AVSLUTAD,
        plannedStartAt: atTime(addDays(week0, 3), 12, 0),
        plannedEndAt: atTime(addDays(week0, 3), 15, 0),
        actualStartAt: atTime(addDays(week0, 3), 12, 0),
        actualEndAt: atTime(addDays(week0, 3), 14, 40),
        assigneeKey: "maria-atelje",
        timeSpentMinutes: 160,
        colorHex: "#53C873",
        calendarLabel: CalendarLabel.UTFORT_ARBETE,
      },
      {
        track: Track.C,
        status: TrackStatus.LEVERANS,
        plannedStartAt: atTime(addDays(week0, 4), 7, 0),
        plannedEndAt: atTime(addDays(week0, 4), 10, 0),
        actualStartAt: atTime(addDays(week0, 4), 7, 0),
        assigneeKey: "nora-montage",
        timeSpentMinutes: 120,
        colorHex: "#53C873",
        calendarLabel: CalendarLabel.KAN_FLYTTAS,
      },
    ],
    events: [
      {
        track: Track.C,
        start: atTime(addDays(week0, 4), 7, 0),
        end: atTime(addDays(week0, 4), 10, 0),
        title: "AVM 81813 Ume Alvdal, skylt pa trastativ / FD",
        notes: "Kungsgatan 14, Umea",
      },
    ],
    files: [{ track: Track.A, filename: "avm-81813-konstruktionsskiss.pdf" }],
    timeEntries: [{ track: Track.C, minutes: 90, userKey: "nora-montage" }],
  },
  {
    key: "socialtjansten-utv-skyltar",
    orderNumber: "AVM-83086",
    title: "AVM 83086 UK Socialtjansten utv skyltar / KL",
    customerName: "Socialtjansten Umea Kommun",
    dueDate: addDays(week0, 4),
    deliveryMethod: "MONTAGE",
    deliveryAddress: "Skolgatan 31, Umea",
    notes: demoNote("Utbytesjobb for utvandiga skyltar, entrevisning och stolpskylt."),
    createdByKey: "lukas-admin",
    billingConfirmedAt: null,
    tracks: [
      {
        track: Track.B,
        status: TrackStatus.PAGAENDE,
        plannedStartAt: atTime(addDays(week0, 4), 10, 0),
        plannedEndAt: atTime(addDays(week0, 4), 12, 0),
        actualStartAt: atTime(addDays(week0, 4), 10, 0),
        assigneeKey: "fredrik-verkstad",
        timeSpentMinutes: 90,
        colorHex: "#53C873",
        calendarLabel: CalendarLabel.KAN_FLYTTAS,
      },
      {
        track: Track.C,
        status: TrackStatus.INKOMMANDE,
        plannedStartAt: atTime(addDays(week0, 4), 13, 0),
        plannedEndAt: atTime(addDays(week0, 4), 15, 0),
        assigneeKey: "nora-montage",
        timeSpentMinutes: 0,
        colorHex: "#53C873",
        calendarLabel: CalendarLabel.KAN_FLYTTAS,
      },
    ],
    events: [
      {
        track: Track.B,
        start: atTime(addDays(week0, 4), 10, 0),
        end: atTime(addDays(week0, 4), 12, 0),
        title: "AVM 83086 UK Socialtjansten utv skyltar / KL",
        notes: "Skolgatan 31, Umea",
      },
    ],
    files: [{ track: Track.B, filename: "avm-83086-utvandig-skyltlista.xlsx" }],
    timeEntries: [{ track: Track.B, minutes: 75, userKey: "fredrik-verkstad" }],
  },
  {
    key: "entevortavlor-planering",
    orderNumber: "DM-83420",
    title: "Timlasta / planera Entevortavlor",
    customerName: "Stunt Skylt & Reklam demo customer",
    dueDate: addDays(week0, 4),
    deliveryMethod: "HAMTAS",
    deliveryAddress: "Lagret, Formvagen 2, Umea",
    notes: demoNote("Intern planering for entevortavlor, materialplock och genomgang i verkstad."),
    createdByKey: "lukas-admin",
    billingConfirmedAt: null,
    tracks: [
      {
        track: Track.B,
        status: TrackStatus.PALACK,
        plannedStartAt: atTime(addDays(week0, 4), 14, 30),
        plannedEndAt: atTime(addDays(week0, 4), 16, 0),
        actualStartAt: atTime(addDays(week0, 4), 14, 30),
        assigneeKey: "fredrik-verkstad",
        timeSpentMinutes: 75,
        colorHex: "#E74B56",
        calendarLabel: CalendarLabel.BOKAD_TID,
      },
    ],
    events: [
      {
        track: Track.B,
        start: atTime(addDays(week0, 4), 14, 30),
        end: atTime(addDays(week0, 4), 16, 0),
        title: "Timlasta / planera Entevortavlor",
        notes: "Lagret, Formvagen 2, Umea",
      },
    ],
    files: [],
    timeEntries: [{ track: Track.B, minutes: 60, userKey: "fredrik-verkstad" }],
  },
  {
    key: "bilhallen-fasadskylt",
    orderNumber: "DM-84010",
    title: "Bilhallen Umea ny fasadskylt och vepa",
    customerName: "Bilhallen Umea",
    dueDate: addDays(week1, 1),
    deliveryMethod: "MONTAGE",
    deliveryAddress: "Formvagen 8, Umea",
    notes: demoNote("Ny fasadskylt, vepa over entre samt demontering av gammal ljuslada."),
    createdByKey: "niklas-seller",
    billingConfirmedAt: null,
    tracks: [
      {
        track: Track.A,
        status: TrackStatus.PAGAENDE,
        plannedStartAt: atTime(addDays(week1, -1), 8, 0),
        plannedEndAt: atTime(addDays(week1, 0), 12, 0),
        actualStartAt: atTime(addDays(week1, -1), 8, 15),
        assigneeKey: "maria-atelje",
        timeSpentMinutes: 180,
        colorHex: "#9FD6FF",
        calendarLabel: CalendarLabel.UNDER_VECKAN,
      },
      {
        track: Track.B,
        status: TrackStatus.PAGAENDE,
        plannedStartAt: atTime(addDays(week1, 0), 7, 0),
        plannedEndAt: atTime(addDays(week1, 1), 15, 0),
        actualStartAt: atTime(addDays(week1, 0), 7, 0),
        assigneeKey: "fredrik-verkstad",
        timeSpentMinutes: 240,
        colorHex: "#9FD6FF",
        calendarLabel: CalendarLabel.UNDER_VECKAN,
      },
      {
        track: Track.C,
        status: TrackStatus.INKOMMANDE,
        plannedStartAt: atTime(addDays(week1, 1), 7, 0),
        plannedEndAt: atTime(addDays(week1, 1), 16, 0),
        assigneeKey: "nora-montage",
        timeSpentMinutes: 0,
        colorHex: "#9FD6FF",
        calendarLabel: CalendarLabel.BOKAD_TID,
      },
    ],
    events: [
      {
        track: Track.C,
        start: atTime(addDays(week1, 1), 7, 0),
        end: atTime(addDays(week1, 1), 16, 0),
        title: "Bilhallen Umea ny fasadskylt och vepa",
        notes: "Formvagen 8, Umea",
      },
    ],
    files: [
      { track: Track.A, filename: "dm-84010-fasadvy.pdf" },
      { track: Track.B, filename: "dm-84010-plocklista.xlsx" },
    ],
    timeEntries: [{ track: Track.B, minutes: 150, userKey: "fredrik-verkstad" }],
  },
  {
    key: "umea-energi-ljuslada",
    orderNumber: "DM-84022",
    title: "Umea Energi demo ny ljuslada reception",
    customerName: "Umea Energi demo",
    dueDate: addDays(week1, 2),
    deliveryMethod: "MONTAGE",
    deliveryAddress: "Storgatan 34, Umea",
    notes: demoNote("Ljuslada till reception, profilfolie och snabb efterbesiktning."),
    createdByKey: "lukas-admin",
    billingConfirmedAt: null,
    tracks: [
      {
        track: Track.A,
        status: TrackStatus.LEVERANS,
        plannedStartAt: atTime(addDays(week1, 0), 13, 0),
        plannedEndAt: atTime(addDays(week1, 1), 10, 0),
        actualStartAt: atTime(addDays(week1, 0), 13, 0),
        assigneeKey: "maria-atelje",
        timeSpentMinutes: 150,
        colorHex: "#CDB7FF",
        calendarLabel: CalendarLabel.UNDER_VECKAN,
      },
      {
        track: Track.B,
        status: TrackStatus.LEVERANS,
        plannedStartAt: atTime(addDays(week1, 1), 7, 0),
        plannedEndAt: atTime(addDays(week1, 1), 12, 0),
        actualStartAt: atTime(addDays(week1, 1), 7, 5),
        actualEndAt: atTime(addDays(week1, 1), 11, 40),
        assigneeKey: "fredrik-verkstad",
        timeSpentMinutes: 230,
        colorHex: "#CDB7FF",
        calendarLabel: CalendarLabel.UNDER_VECKAN,
      },
      {
        track: Track.C,
        status: TrackStatus.LEVERANS,
        plannedStartAt: atTime(addDays(week1, 2), 7, 0),
        plannedEndAt: atTime(addDays(week1, 2), 12, 0),
        assigneeKey: "nora-montage",
        timeSpentMinutes: 0,
        colorHex: "#CDB7FF",
        calendarLabel: CalendarLabel.BOKAD_TID,
      },
    ],
    events: [
      {
        track: Track.C,
        start: atTime(addDays(week1, 2), 7, 0),
        end: atTime(addDays(week1, 2), 12, 0),
        title: "Umea Energi demo ny ljuslada reception",
        notes: "Storgatan 34, Umea",
      },
    ],
    files: [{ track: Track.B, filename: "dm-84022-ljuslada-ritning.pdf" }],
    timeEntries: [{ track: Track.B, minutes: 180, userKey: "fredrik-verkstad" }],
  },
  {
    key: "nus-servicebil",
    orderNumber: "DM-84035",
    title: "Norrlands universitetssjukhus demo servicebil foliering",
    customerName: "Norrlands universitetssjukhus demo",
    dueDate: addDays(week1, 3),
    deliveryMethod: "HAMTAS",
    deliveryAddress: "NUS, Umea",
    notes: demoNote("Halvfoliering av servicebil med nya kontaktuppgifter och reflexdekal."),
    createdByKey: "niklas-seller",
    billingConfirmedAt: null,
    tracks: [
      {
        track: Track.A,
        status: TrackStatus.AVSLUTAD,
        plannedStartAt: atTime(addDays(week1, 1), 8, 0),
        plannedEndAt: atTime(addDays(week1, 1), 12, 0),
        actualStartAt: atTime(addDays(week1, 1), 8, 0),
        actualEndAt: atTime(addDays(week1, 1), 11, 30),
        assigneeKey: "maria-atelje",
        timeSpentMinutes: 200,
        colorHex: "#53C873",
        calendarLabel: CalendarLabel.UTFORT_ARBETE,
      },
      {
        track: Track.D,
        status: TrackStatus.PAGAENDE,
        plannedStartAt: atTime(addDays(week1, 3), 7, 0),
        plannedEndAt: atTime(addDays(week1, 3), 15, 0),
        actualStartAt: atTime(addDays(week1, 3), 7, 15),
        assigneeKey: "kalle-bildekor",
        timeSpentMinutes: 260,
        colorHex: "#4CD964",
        calendarLabel: CalendarLabel.KAN_FLYTTAS,
      },
    ],
    events: [
      {
        track: Track.D,
        start: atTime(addDays(week1, 3), 7, 0),
        end: atTime(addDays(week1, 3), 15, 0),
        title: "Norrlands universitetssjukhus demo servicebil foliering",
        notes: "NUS, Umea",
      },
    ],
    files: [{ track: Track.D, filename: "dm-84035-vehicle-wrap-proof.pdf" }],
    timeEntries: [{ track: Track.D, minutes: 220, userKey: "kalle-bildekor" }],
  },
  {
    key: "kommun-gatupratare",
    orderNumber: "DM-84048",
    title: "Umea Kommun nya gatupratare till medborgarservice",
    customerName: "Umea Kommun",
    dueDate: addDays(week1, 4),
    deliveryMethod: "UTKORNING",
    deliveryAddress: "Renmarkstorget 15, Umea",
    notes: demoNote("Tva gatupratare med nya print och hjul, leverans fore helg."),
    createdByKey: "lukas-admin",
    billingConfirmedAt: null,
    tracks: [
      {
        track: Track.B,
        status: TrackStatus.LEVERANS,
        plannedStartAt: atTime(addDays(week1, 4), 9, 0),
        plannedEndAt: atTime(addDays(week1, 4), 12, 0),
        assigneeKey: "fredrik-verkstad",
        timeSpentMinutes: 120,
        colorHex: "#CDB7FF",
        calendarLabel: CalendarLabel.UNDER_VECKAN,
      },
      {
        track: Track.C,
        status: TrackStatus.LEVERANS,
        plannedStartAt: atTime(addDays(week1, 4), 13, 0),
        plannedEndAt: atTime(addDays(week1, 4), 15, 0),
        assigneeKey: "nora-montage",
        timeSpentMinutes: 90,
        colorHex: "#CDB7FF",
        calendarLabel: CalendarLabel.BOKAD_TID,
      },
    ],
    events: [
      {
        track: Track.B,
        start: atTime(addDays(week1, 4), 9, 0),
        end: atTime(addDays(week1, 4), 12, 0),
        title: "Umea Kommun nya gatupratare till medborgarservice",
        notes: "Renmarkstorget 15, Umea",
      },
      {
        track: Track.C,
        start: atTime(addDays(week1, 4), 13, 0),
        end: atTime(addDays(week1, 4), 15, 0),
        title: "Umea Kommun nya gatupratare till medborgarservice",
        notes: "Renmarkstorget 15, Umea",
      },
    ],
    files: [],
    timeEntries: [{ track: Track.C, minutes: 70, userKey: "nora-montage" }],
  },
  {
    key: "bostaden-portskyltar",
    orderNumber: "DM-84060",
    title: "Bostaden Umea portskyltar och trapphusdekal",
    customerName: "Bostaden Umea",
    dueDate: addDays(week2, 1),
    deliveryMethod: "MONTAGE",
    deliveryAddress: "Axtorpsvagen 19, Umea",
    notes: demoNote("Nya portskyltar, trapphusdekal och byte av slitna namnlistor."),
    createdByKey: "niklas-seller",
    billingConfirmedAt: null,
    tracks: [
      {
        track: Track.A,
        status: TrackStatus.INKOMMANDE,
        plannedStartAt: atTime(addDays(week2, 0), 8, 0),
        plannedEndAt: atTime(addDays(week2, 0), 12, 0),
        assigneeKey: "maria-atelje",
        timeSpentMinutes: 0,
        colorHex: "#BDEDC2",
        calendarLabel: CalendarLabel.UNDER_VECKAN,
      },
      {
        track: Track.C,
        status: TrackStatus.INKOMMANDE,
        plannedStartAt: atTime(addDays(week2, 1), 7, 0),
        plannedEndAt: atTime(addDays(week2, 1), 13, 0),
        assigneeKey: "nora-montage",
        timeSpentMinutes: 0,
        colorHex: "#BDEDC2",
        calendarLabel: CalendarLabel.BOKAD_TID,
      },
    ],
    events: [
      {
        track: Track.C,
        start: atTime(addDays(week2, 1), 7, 0),
        end: atTime(addDays(week2, 1), 13, 0),
        title: "Bostaden Umea portskyltar och trapphusdekal",
        notes: "Axtorpsvagen 19, Umea",
      },
    ],
    files: [{ track: Track.A, filename: "dm-84060-portskylt-layout.pdf" }],
    timeEntries: [],
  },
  {
    key: "ready-for-billing",
    orderNumber: "DM-79991",
    title: "Stunt Skylt & Reklam demo fasadplatar och montage",
    customerName: "Stunt Skylt & Reklam demo customer",
    dueDate: addDays(week0, -2),
    deliveryMethod: "MONTAGE",
    deliveryAddress: "Formvagen 2, Umea",
    notes: demoNote("Klart jobb som ska synas under fardiga for fakturering."),
    createdByKey: "lukas-admin",
    billingConfirmedAt: null,
    tracks: [
      {
        track: Track.A,
        status: TrackStatus.AVSLUTAD,
        plannedStartAt: atTime(addDays(week0, -5), 7, 0),
        plannedEndAt: atTime(addDays(week0, -5), 12, 0),
        actualStartAt: atTime(addDays(week0, -5), 7, 0),
        actualEndAt: atTime(addDays(week0, -5), 11, 50),
        assigneeKey: "maria-atelje",
        timeSpentMinutes: 210,
        colorHex: "#C9D6DF",
        calendarLabel: CalendarLabel.UTFORT_ARBETE,
      },
      {
        track: Track.B,
        status: TrackStatus.AVSLUTAD,
        plannedStartAt: atTime(addDays(week0, -4), 7, 0),
        plannedEndAt: atTime(addDays(week0, -4), 15, 0),
        actualStartAt: atTime(addDays(week0, -4), 7, 0),
        actualEndAt: atTime(addDays(week0, -4), 14, 40),
        assigneeKey: "fredrik-verkstad",
        timeSpentMinutes: 320,
        colorHex: "#C9D6DF",
        calendarLabel: CalendarLabel.UTFORT_ARBETE,
      },
    ],
    events: [
      {
        track: Track.B,
        start: atTime(addDays(week0, -4), 7, 0),
        end: atTime(addDays(week0, -4), 15, 0),
        title: "Stunt Skylt & Reklam demo fasadplatar och montage",
        notes: "Formvagen 2, Umea",
      },
    ],
    files: [{ track: Track.B, filename: "dm-79991-slutdokumentation.pdf" }],
    timeEntries: [
      { track: Track.A, minutes: 180, userKey: "maria-atelje" },
      { track: Track.B, minutes: 260, userKey: "fredrik-verkstad" },
    ],
  },
  {
    key: "archived-complete",
    orderNumber: "DM-78888",
    title: "Kommun infartsskyltar komplett leverans",
    customerName: "Umea Kommun",
    dueDate: addDays(week0, -8),
    deliveryMethod: "MONTAGE",
    deliveryAddress: "Nydalavagen 10, Umea",
    notes: demoNote("Arkiverad demoorder som redan ar fakturabekraftad."),
    createdByKey: "niklas-seller",
    billingConfirmedAt: atTime(addDays(week0, -3), 10, 30),
    tracks: [
      {
        track: Track.A,
        status: TrackStatus.AVSLUTAD,
        plannedStartAt: atTime(addDays(week0, -10), 7, 0),
        plannedEndAt: atTime(addDays(week0, -10), 14, 0),
        actualStartAt: atTime(addDays(week0, -10), 7, 0),
        actualEndAt: atTime(addDays(week0, -10), 13, 40),
        assigneeKey: "maria-atelje",
        timeSpentMinutes: 240,
        colorHex: "#C9D6DF",
        calendarLabel: CalendarLabel.UTFORT_ARBETE,
      },
      {
        track: Track.B,
        status: TrackStatus.AVSLUTAD,
        plannedStartAt: atTime(addDays(week0, -9), 7, 0),
        plannedEndAt: atTime(addDays(week0, -9), 15, 0),
        actualStartAt: atTime(addDays(week0, -9), 7, 0),
        actualEndAt: atTime(addDays(week0, -9), 14, 15),
        assigneeKey: "fredrik-verkstad",
        timeSpentMinutes: 330,
        colorHex: "#C9D6DF",
        calendarLabel: CalendarLabel.UTFORT_ARBETE,
      },
      {
        track: Track.C,
        status: TrackStatus.AVSLUTAD,
        plannedStartAt: atTime(addDays(week0, -8), 7, 0),
        plannedEndAt: atTime(addDays(week0, -8), 16, 0),
        actualStartAt: atTime(addDays(week0, -8), 7, 10),
        actualEndAt: atTime(addDays(week0, -8), 15, 55),
        assigneeKey: "nora-montage",
        timeSpentMinutes: 360,
        colorHex: "#C9D6DF",
        calendarLabel: CalendarLabel.UTFORT_ARBETE,
      },
    ],
    events: [
      {
        track: Track.C,
        start: atTime(addDays(week0, -8), 7, 0),
        end: atTime(addDays(week0, -8), 16, 0),
        title: "Kommun infartsskyltar komplett leverans",
        notes: "Nydalavagen 10, Umea",
      },
    ],
    files: [{ track: Track.C, filename: "dm-78888-fardiganmalan.pdf" }],
    timeEntries: [{ track: Track.C, minutes: 330, userKey: "nora-montage" }],
  },
];

const freeEvents = [
  {
    id: "demo-free-stangt-week0-b",
    track: Track.B,
    title: "STANGT",
    label: CalendarLabel.LUNCH,
    visibility: EventVisibility.PUBLIC,
    ownerUserKey: null,
    allDay: false,
    start: atTime(addDays(week0, 2), 7, 0),
    end: atTime(addDays(week0, 2), 16, 0),
    notes: demoNote("Verkstad blockerad for internservice och staddag."),
  },
  {
    id: "demo-free-midsommar-shared",
    track: Track.A,
    title: "MIDSOMMARAFTON",
    label: CalendarLabel.LUNCH,
    visibility: EventVisibility.PUBLIC,
    ownerUserKey: null,
    allDay: true,
    ...fullDay(addDays(week1, 4)),
    notes: demoNote("Helgdagsblockering for demo."),
  },
  {
    id: "demo-free-midsommar-verkstad",
    track: Track.B,
    title: "MIDSOMMARAFTON",
    label: CalendarLabel.LUNCH,
    visibility: EventVisibility.PUBLIC,
    ownerUserKey: null,
    allDay: true,
    ...fullDay(addDays(week1, 4)),
    notes: demoNote("Verkstad stangd midsommarafton."),
  },
  {
    id: "demo-free-teammote-a",
    track: Track.A,
    title: "Atelje planering vecka 2",
    label: CalendarLabel.UNDER_VECKAN,
    visibility: EventVisibility.PUBLIC,
    ownerUserKey: null,
    allDay: false,
    start: atTime(addDays(week1, 0), 8, 0),
    end: atTime(addDays(week1, 0), 9, 0),
    notes: demoNote("Veckoplanering med tryck, print och skarlista."),
  },
  {
    id: "demo-free-bilhall-lunch",
    track: Track.D,
    title: "Lackbox bokad",
    label: CalendarLabel.LUNCH,
    visibility: EventVisibility.PUBLIC,
    ownerUserKey: null,
    allDay: false,
    start: atTime(addDays(week1, 3), 11, 30),
    end: atTime(addDays(week1, 3), 12, 30),
    notes: demoNote("Blockerad tid for torkning och efterkontroll."),
  },
  {
    id: "demo-free-admin-personal",
    track: Track.A,
    title: "Kunduppfoljning demo",
    label: CalendarLabel.BOKAD_TID,
    visibility: EventVisibility.PERSONAL,
    ownerUserKey: "lukas-admin",
    allDay: false,
    start: atTime(addDays(week0, 1), 15, 0),
    end: atTime(addDays(week0, 1), 16, 0),
    notes: demoNote("Personlig kalenderpost for admin."),
  },
];

const demoOrderNumbers = demoOrders.map((order) => order.orderNumber);
const demoFreeEventIds = freeEvents.map((event) => event.id);
const demoCustomerIds = customerReferences.map((row) => row.id);

async function clearTaggedDemoData() {
  await prisma.orderTrackTimeEntry.deleteMany({
    where: { orderId: { in: demoOrderNumbers } },
  });
  await prisma.file.deleteMany({
    where: { orderId: { in: demoOrderNumbers } },
  });
  await prisma.calendarEvent.deleteMany({
    where: { orderId: { in: demoOrderNumbers } },
  });
  await prisma.orderTrack.deleteMany({
    where: { orderId: { in: demoOrderNumbers } },
  });
  await prisma.fortnoxOrderLink.deleteMany({
    where: { orderId: { in: demoOrderNumbers } },
  });
  await prisma.order.deleteMany({
    where: { orderNumber: { in: demoOrderNumbers } },
  });
  await prisma.personalCalendarEvent.deleteMany({
    where: { id: { in: demoFreeEventIds } },
  });
  await prisma.customerReference.deleteMany({
    where: {
      OR: [
        { id: { in: demoCustomerIds } },
        { tenantId: DEMO_CUSTOMER_TENANT },
      ],
    },
  });
}

async function upsertDemoUser(definition) {
  const existing = await prisma.user.findUnique({
    where: { email: definition.email.toLowerCase() },
    select: {
      id: true,
      passwordHash: true,
      totpSecret: true,
      totpTempSecret: true,
      totpEnabled: true,
      totpEnabledAt: true,
    },
  });

  const rawPassword = envPasswordFor(definition.email);
  const passwordHash = rawPassword
    ? await bcrypt.hash(rawPassword, 10)
    : existing?.passwordHash ?? null;

  const user = await prisma.user.upsert({
    where: { email: definition.email.toLowerCase() },
    update: {
      name: definition.name,
      role: definition.role,
      image: definition.image,
      ...(passwordHash ? { passwordHash } : {}),
    },
    create: {
      email: definition.email.toLowerCase(),
      name: definition.name,
      role: definition.role,
      image: definition.image,
      passwordHash,
      emailVerified: new Date(),
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      passwordHash: true,
    },
  });

  return {
    ...user,
    passwordProvisioned: Boolean(rawPassword),
  };
}

async function upsertCustomerReference(row) {
  return prisma.customerReference.upsert({
    where: { id: row.id },
    update: {
      customerNumber: row.customerNumber,
      tenantId: DEMO_CUSTOMER_TENANT,
      name: row.name,
      email: row.email,
      phone: row.phone,
      note: row.note,
    },
    create: {
      id: row.id,
      customerNumber: row.customerNumber,
      tenantId: DEMO_CUSTOMER_TENANT,
      name: row.name,
      email: row.email,
      phone: row.phone,
      note: row.note,
    },
  });
}

function buildDemoUrl(orderNumber, filename) {
  return `https://example.com/demo/${encodeURIComponent(orderNumber)}/${encodeURIComponent(
    filename
  )}`;
}

async function upsertOrder(order, usersByKey) {
  const createdBy = usersByKey.get(order.createdByKey) ?? null;

  const upsertedOrder = await prisma.order.upsert({
    where: { orderNumber: order.orderNumber },
    update: {
      title: order.title,
      customerName: order.customerName,
      dueDate: order.dueDate,
      deliveryMethod: order.deliveryMethod,
      deliveryAddress: order.deliveryAddress,
      notes: order.notes,
      createdById: createdBy?.id ?? null,
      createdByName: createdBy?.name ?? null,
      billingConfirmedAt: order.billingConfirmedAt,
    },
    create: {
      orderNumber: order.orderNumber,
      title: order.title,
      customerName: order.customerName,
      dueDate: order.dueDate,
      deliveryMethod: order.deliveryMethod,
      deliveryAddress: order.deliveryAddress,
      notes: order.notes,
      createdById: createdBy?.id ?? null,
      createdByName: createdBy?.name ?? null,
      billingConfirmedAt: order.billingConfirmedAt,
    },
  });

  await prisma.orderTrackTimeEntry.deleteMany({
    where: { orderId: order.orderNumber },
  });
  await prisma.file.deleteMany({
    where: { orderId: order.orderNumber },
  });
  await prisma.calendarEvent.deleteMany({
    where: { orderId: order.orderNumber },
  });
  await prisma.orderTrack.deleteMany({
    where: { orderId: order.orderNumber },
  });

  for (const track of order.tracks) {
    const assignee = track.assigneeKey ? usersByKey.get(track.assigneeKey) : null;
    await prisma.orderTrack.create({
      data: {
        id: `${order.key}-${track.track.toLowerCase()}`,
        orderId: order.orderNumber,
        track: track.track,
        status: track.status,
        colorHex: track.colorHex,
        plannedStartAt: track.plannedStartAt,
        plannedEndAt: track.plannedEndAt,
        actualStartAt: track.actualStartAt ?? null,
        actualEndAt: track.actualEndAt ?? null,
        assignee: assignee?.name ?? null,
        timeSpentMinutes: track.timeSpentMinutes ?? 0,
        calendarLabel: track.calendarLabel ?? null,
      },
    });
  }

  for (let index = 0; index < order.events.length; index += 1) {
    const event = order.events[index];
    await prisma.calendarEvent.create({
      data: {
        id: `${order.key}-event-${index + 1}`,
        orderId: order.orderNumber,
        track: event.track,
        start: event.start,
        end: event.end,
        title: event.title,
        notes: event.notes ?? null,
      },
    });
  }

  for (let index = 0; index < order.files.length; index += 1) {
    const file = order.files[index];
    const uploadedBy = createdBy?.name ?? "Ordexa demo";
    await prisma.file.create({
      data: {
        id: `${order.key}-file-${index + 1}`,
        orderId: order.orderNumber,
        track: file.track,
        filename: file.filename,
        url: buildDemoUrl(order.orderNumber, file.filename),
        uploadedBy,
        uploadedById: createdBy?.id ?? null,
        uploadedByName: uploadedBy,
        uploadedByImage: createdBy?.image ?? null,
      },
    });
  }

  for (let index = 0; index < order.timeEntries.length; index += 1) {
    const entry = order.timeEntries[index];
    const user = usersByKey.get(entry.userKey) ?? null;
    const creator = createdBy ?? user ?? null;
    await prisma.orderTrackTimeEntry.create({
      data: {
        id: `${order.key}-time-${index + 1}`,
        orderId: order.orderNumber,
        track: entry.track,
        minutes: entry.minutes,
        userId: user?.id ?? null,
        userName: user?.name ?? "Ordexa demo",
        userImage: user?.image ?? null,
        createdById: creator?.id ?? null,
        createdByName: creator?.name ?? "Ordexa demo",
        createdByImage: creator?.image ?? null,
      },
    });
  }

  return upsertedOrder;
}

async function upsertFreeEvent(event, usersByKey) {
  const owner = event.ownerUserKey ? usersByKey.get(event.ownerUserKey) : null;

  return prisma.personalCalendarEvent.upsert({
    where: { id: event.id },
    update: {
      track: event.track,
      title: event.title,
      label: event.label,
      notes: event.notes,
      allDay: event.allDay,
      start: event.start,
      end: event.end,
      weeklyDays: null,
      startRecur: null,
      endRecur: null,
      startTime: null,
      endTime: null,
      visibility: event.visibility,
      ownerUserId: event.visibility === EventVisibility.PERSONAL ? owner?.id ?? null : null,
    },
    create: {
      id: event.id,
      track: event.track,
      title: event.title,
      label: event.label,
      notes: event.notes,
      allDay: event.allDay,
      start: event.start,
      end: event.end,
      visibility: event.visibility,
      ownerUserId: event.visibility === EventVisibility.PERSONAL ? owner?.id ?? null : null,
    },
  });
}

async function main() {
  if (CLEAR) {
    console.log(`[seed-demo] Clearing tagged demo data ${DEMO_TAG}`);
    await clearTaggedDemoData();
  }

  console.log("[seed-demo] Upserting demo users");
  const userRows = [];
  for (const user of demoUsers) {
    userRows.push(await upsertDemoUser(user));
  }
  const usersByKey = new Map(
    demoUsers.map((definition, index) => [definition.key, userRows[index]])
  );

  console.log("[seed-demo] Upserting customer references");
  const customerRows = [];
  for (const customer of customerReferences) {
    customerRows.push(await upsertCustomerReference(customer));
  }

  console.log("[seed-demo] Upserting demo orders");
  const orderRows = [];
  for (const order of demoOrders) {
    orderRows.push(await upsertOrder(order, usersByKey));
  }

  console.log("[seed-demo] Upserting free calendar events");
  const freeRows = [];
  for (const event of freeEvents) {
    freeRows.push(await upsertFreeEvent(event, usersByKey));
  }

  const summary = {
    users: userRows.length,
    usersWithPasswordUpdated: userRows.filter((row) => row.passwordProvisioned).length,
    customers: customerRows.length,
    orders: orderRows.length,
    orderTracks: demoOrders.reduce((sum, order) => sum + order.tracks.length, 0),
    orderEvents: demoOrders.reduce((sum, order) => sum + order.events.length, 0),
    freeCalendarEvents: freeRows.length,
    calendarEvents:
      demoOrders.reduce((sum, order) => sum + order.events.length, 0) + freeRows.length,
  };

  console.log(
    JSON.stringify(
      {
        ok: true,
        demoTag: DEMO_TAG,
        cleared: CLEAR,
        emailDomain: DEFAULT_EMAIL_DOMAIN,
        summary,
        loginUsers: userRows.map((row) => ({
          email: row.email,
          role: row.role,
          passwordProvisioned: row.passwordProvisioned,
        })),
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error("[seed-demo] Failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
