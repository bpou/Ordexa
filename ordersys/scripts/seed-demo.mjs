import { PrismaClient, Role, Track, TrackStatus, CalendarLabel, EventVisibility } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const addDays = (base, days) => {
  const result = new Date(base.getTime());
  result.setDate(result.getDate() + days);
  return result;
};

const startOfWeek = (date) => {
  const result = new Date(date.getTime());
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
};

const atTime = (base, hours, minutes = 0) => {
  const result = new Date(base.getTime());
  result.setHours(hours, minutes, 0, 0);
  return result;
};

const toJson = (value) => JSON.stringify(value);

async function main() {
console.log('[reset] Clearing existing demo data...');
  await prisma.calendarEvent.deleteMany({});
  await prisma.file.deleteMany({});
  await prisma.orderTrack.deleteMany({});
  await prisma.fortnoxOrderLink.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.personalCalendarEvent.deleteMany({});

console.log('[users] Ensuring demo users exist...');
  const demoPassword = 'Demo123!';
  const hashedPassword = await bcrypt.hash(demoPassword, 10);

  const demoUsers = [
    {
      email: 'anna.larsson@ordina.demo',
      name: 'Anna Larsson',
      role: Role.SALJARE,
      image: 'https://i.pravatar.cc/256?img=32',
    },
    {
      email: 'mikael.aberg@ordina.demo',
      name: 'Mikael Aberg',
      role: Role.A_TEAM,
      image: 'https://i.pravatar.cc/256?img=12',
    },
    {
      email: 'sofia.nilsson@ordina.demo',
      name: 'Sofia Nilsson',
      role: Role.B_TEAM,
      image: 'https://i.pravatar.cc/256?img=45',
    },
    {
      email: 'elina.holm@ordina.demo',
      name: 'Elina Holm',
      role: Role.ADMIN,
      image: 'https://i.pravatar.cc/256?img=24',
    },
  ];

  const users = await Promise.all(
    demoUsers.map((user) =>
      prisma.user.upsert({
        where: { email: user.email },
        update: {
          name: user.name,
          image: user.image,
          role: user.role,
          passwordHash: hashedPassword,
        },
        create: {
          ...user,
          passwordHash: hashedPassword,
          emailVerified: new Date(),
        },
      }),
    ),
  );

  const usersByEmail = new Map(users.map((user) => [user.email, user]));

  const today = new Date();
  const weekStart = startOfWeek(today);
  const monday = weekStart;
  const tuesday = addDays(weekStart, 1);
  const wednesday = addDays(weekStart, 2);
  const thursday = addDays(weekStart, 3);

  const demoOrders = [
    {
      orderNumber: 'AV-81403',
      title: 'UPAB Aluskyltar montage',
      customerName: 'UPAB Industriservice',
      dueDate: addDays(weekStart, 2),
      deliveryMethod: 'MONTAGE',
      deliveryAddress: 'Storuddsvagen 14, Lulea',
      notes: 'Montera aluskyltar och dekor. Lyft bokad till kl 07.',
      createdByEmail: 'mikael.aberg@ordina.demo',
      tracks: [
        {
          track: Track.A,
          status: TrackStatus.AVSLUTAD,
          colorHex: '#1E6B9D',
          plannedStartAt: addDays(weekStart, -3),
          plannedEndAt: addDays(weekStart, -1),
          actualStartAt: addDays(weekStart, -3),
          actualEndAt: addDays(weekStart, -1),
          assignee: 'Printstudio',
          timeSpentMinutes: 540,
          calendarLabel: CalendarLabel.UTFORT_ARBETE,
        },
        {
          track: Track.B,
          status: TrackStatus.PAGAENDE,
          colorHex: '#C86B30',
          plannedStartAt: monday,
          plannedEndAt: addDays(weekStart, 1),
          actualStartAt: monday,
          assignee: 'Montage team',
          timeSpentMinutes: 180,
          calendarLabel: CalendarLabel.BOKAD_TID,
        },
        {
          track: Track.SHARED,
          status: TrackStatus.INKOMMANDE,
          colorHex: '#4B8B3B',
          plannedStartAt: addDays(weekStart, 1),
          plannedEndAt: addDays(weekStart, 2),
          assignee: 'Logistik',
          calendarLabel: CalendarLabel.KAN_FLYTTAS,
        },
      ],
      events: [
        {
          track: Track.B,
          start: atTime(monday, 7),
          end: atTime(monday, 9),
          title: 'AV 81403 UPAB Aluskyltar',
          notes: 'Lukas Entevor leder lyft och montage.',
        },
        {
          track: Track.B,
          start: atTime(monday, 9),
          end: atTime(monday, 10),
          title: 'Site brief med UPAB',
          notes: 'Stam av med kund innan montage fortsatter.',
        },
      ],
      files: [
        {
          track: Track.A,
          filename: 'Montageplan-UPAB.pdf',
          url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
          uploadedBy: 'Mikael Aberg',
        },
        {
          track: Track.B,
          filename: 'Lyftschema-UPAB.xlsx',
          url: 'https://filesamples.com/samples/document/xlsx/sample1.xlsx',
          uploadedBy: 'Elina Holm',
        },
      ],
      fortnox: {
        documentNumber: 'F-20441',
      },
    },
    {
      orderNumber: 'M-81331',
      title: 'ICA Robertsfors stor tavlor',
      customerName: 'ICA Robertsfors',
      dueDate: addDays(weekStart, 3),
      deliveryMethod: 'MONTAGE',
      deliveryAddress: 'Storgatan 5, Robertsfors',
      notes: 'Montera tre storformatstavlor i entrens galleri. Folj NA designunderlag.',
      createdByEmail: 'anna.larsson@ordina.demo',
      tracks: [
        {
          track: Track.A,
          status: TrackStatus.PAGAENDE,
          colorHex: '#205072',
          plannedStartAt: addDays(weekStart, -2),
          plannedEndAt: addDays(weekStart, 0),
          actualStartAt: addDays(weekStart, -2),
          assignee: 'Studio NA',
          timeSpentMinutes: 720,
          calendarLabel: CalendarLabel.UNDER_VECKAN,
        },
        {
          track: Track.B,
          status: TrackStatus.PAGAENDE,
          colorHex: '#8C4A31',
          plannedStartAt: monday,
          plannedEndAt: addDays(weekStart, 1),
          actualStartAt: monday,
          assignee: 'Montage team',
          calendarLabel: CalendarLabel.BOKAD_TID,
        },
        {
          track: Track.SHARED,
          status: TrackStatus.INKOMMANDE,
          colorHex: '#4B8B3B',
          plannedStartAt: addDays(weekStart, 1),
          plannedEndAt: addDays(weekStart, 3),
          assignee: 'Logistik',
          calendarLabel: CalendarLabel.KAN_FLYTTAS,
        },
      ],
      events: [
        {
          track: Track.B,
          start: atTime(monday, 8),
          end: atTime(monday, 13),
          title: 'M 81331 ICA Robertsfors montage',
          notes: 'Montera tavlor och dekor. Dawsons konceptmall i Teams.',
        },
        {
          track: Track.SHARED,
          start: atTime(monday, 13),
          end: atTime(monday, 14),
          title: 'Efterbesiktning entre',
          notes: 'Ta foton for kundrapport.',
        },
      ],
      files: [
        {
          track: Track.A,
          filename: 'ICA-Robertsfors-mallar.zip',
          url: 'https://file-examples.com/storage/fe68c1d28264bba9a5f86de/2017/11/file_example_MP3_700KB.mp3',
          uploadedBy: 'Anna Larsson',
        },
        {
          track: Track.B,
          filename: 'Montage-checklista-ICA.docx',
          url: 'https://file-examples.com/storage/fe68c1d28264bba9a5f86de/2017/02/file-sample_100kB.doc',
          uploadedBy: 'Sofia Nilsson',
        },
      ],
      fortnox: {
        documentNumber: 'F-20442',
      },
    },
    {
      orderNumber: 'M-81479',
      title: 'UK Klotter sanering Stunt 3',
      customerName: 'Umea Kommun',
      dueDate: addDays(weekStart, 4),
      deliveryMethod: 'UTKORNING',
      deliveryAddress: 'Storgatan 62, Umea',
      notes: 'Klottersanera och byta bakgrundsfilm pa stunt skyltar.',
      createdByEmail: 'sofia.nilsson@ordina.demo',
      tracks: [
        {
          track: Track.B,
          status: TrackStatus.PAGAENDE,
          colorHex: '#305F72',
          plannedStartAt: tuesday,
          plannedEndAt: addDays(weekStart, 2),
          actualStartAt: tuesday,
          assignee: 'Servicebil UK',
          timeSpentMinutes: 360,
          calendarLabel: CalendarLabel.BOKAD_TID,
        },
        {
          track: Track.SHARED,
          status: TrackStatus.LEVERANS,
          colorHex: '#6D597A',
          plannedStartAt: addDays(weekStart, 2),
          plannedEndAt: addDays(weekStart, 3),
          assignee: 'Logistik',
          calendarLabel: CalendarLabel.UNDER_VECKAN,
        },
      ],
      events: [
        {
          track: Track.B,
          start: atTime(tuesday, 7),
          end: atTime(tuesday, 9),
          title: 'M 81479 UK Klotter blatt',
          notes: 'Sanera klotter vid gaveln. Dokumentera resultat.',
        },
        {
          track: Track.B,
          start: atTime(tuesday, 9),
          end: atTime(tuesday, 11),
          title: 'Besiktning Stunt 3',
          notes: 'Kontrollera fastsattning efter sanering.',
        },
        {
          track: Track.B,
          start: atTime(tuesday, 11),
          end: atTime(tuesday, 13),
          title: 'M 81467 UK Glaskross',
          notes: 'Byt plexi och folier pa plats Rodeberget.',
        },
        {
          track: Track.B,
          start: atTime(tuesday, 13),
          end: atTime(tuesday, 15),
          title: 'M 81432 UK Glaskross Obbola',
          notes: 'Reservrutor finns i servicebilen.',
        },
      ],
      files: [
        {
          track: Track.B,
          filename: 'Service-protokoll-UK.pdf',
          url: 'https://www.orimi.com/pdf-test.pdf',
          uploadedBy: 'Sofia Nilsson',
        },
      ],
      fortnox: {
        documentNumber: 'F-20443',
      },
    },
    {
      orderNumber: 'AM-81405',
      title: 'Sveafastigheter Barnmorskan skyltning',
      customerName: 'Sveafastigheter',
      dueDate: addDays(weekStart, 5),
      deliveryMethod: 'MONTAGE',
      deliveryAddress: 'Tvistevagen 12, Umea',
      notes: 'Ny barnmorskeprofil pa fasad och invandigt i reception.',
      createdByEmail: 'elina.holm@ordina.demo',
      tracks: [
        {
          track: Track.A,
          status: TrackStatus.PAGAENDE,
          colorHex: '#223A5E',
          plannedStartAt: addDays(weekStart, -1),
          plannedEndAt: wednesday,
          actualStartAt: addDays(weekStart, -1),
          assignee: 'Layoutteam',
          calendarLabel: CalendarLabel.UNDER_VECKAN,
        },
        {
          track: Track.B,
          status: TrackStatus.PAGAENDE,
          colorHex: '#A7553B',
          plannedStartAt: wednesday,
          plannedEndAt: addDays(weekStart, 3),
          actualStartAt: wednesday,
          assignee: 'Montage team',
          timeSpentMinutes: 420,
          calendarLabel: CalendarLabel.BOKAD_TID,
        },
        {
          track: Track.SHARED,
          status: TrackStatus.INKOMMANDE,
          colorHex: '#4B8B3B',
          plannedStartAt: addDays(weekStart, 3),
          plannedEndAt: addDays(weekStart, 4),
          assignee: 'Logistik',
          calendarLabel: CalendarLabel.KAN_FLYTTAS,
        },
      ],
      events: [
        {
          track: Track.B,
          start: atTime(wednesday, 7),
          end: atTime(wednesday, 11),
          title: 'AM 81405 Sveafastigheter Barnmorskan',
          notes: 'Montera fasadskivor och dekor.',
        },
        {
          track: Track.B,
          start: atTime(wednesday, 11),
          end: atTime(wednesday, 12),
          title: '81468 Vaven i Umea',
          notes: 'Service pa ljuslist i glasentre.',
        },
        {
          track: Track.B,
          start: atTime(wednesday, 12),
          end: atTime(wednesday, 13),
          title: 'VM 81308 Selbergs',
          notes: 'Kontrollera skyltbelysning lagerport.',
        },
        {
          track: Track.B,
          start: atTime(wednesday, 13),
          end: atTime(wednesday, 14),
          title: 'M 81379 Jaktbolaget',
          notes: 'Reparera ljuslada som blinkar.',
        },
        {
          track: Track.B,
          start: atTime(wednesday, 14),
          end: atTime(wednesday, 15),
          title: 'M 81371 Umea Halso studio',
          notes: 'Byt P3 skylt i reception.',
        },
      ],
      files: [
        {
          track: Track.A,
          filename: 'Barnmorskan-layout.pdf',
          url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
          uploadedBy: 'Elina Holm',
        },
        {
          track: Track.B,
          filename: 'Montage-manual-Barnmorskan.docx',
          url: 'https://file-examples.com/storage/fe68c1d28264bba9a5f86de/2017/02/file-sample_100kB.doc',
          uploadedBy: 'Mikael Aberg',
        },
      ],
      fortnox: {
        documentNumber: 'F-20444',
      },
    },
    {
      orderNumber: 'VAMB-80322',
      title: 'UMEVA hyllor och skylt',
      customerName: 'UMEVA',
      dueDate: addDays(weekStart, 6),
      deliveryMethod: 'UTKORNING',
      deliveryAddress: 'Gymnasievagen 2, Umea',
      notes: 'Leverera och montera hyllor samt frontskylt i kundmottagning.',
      createdByEmail: 'anna.larsson@ordina.demo',
      tracks: [
        {
          track: Track.A,
          status: TrackStatus.AVSLUTAD,
          colorHex: '#1E6B9D',
          plannedStartAt: addDays(weekStart, -4),
          plannedEndAt: addDays(weekStart, -2),
          actualStartAt: addDays(weekStart, -4),
          actualEndAt: addDays(weekStart, -2),
          assignee: 'Snickeri',
          calendarLabel: CalendarLabel.UNDER_VECKAN,
        },
        {
          track: Track.B,
          status: TrackStatus.PAGAENDE,
          colorHex: '#C86B30',
          plannedStartAt: thursday,
          plannedEndAt: addDays(weekStart, 4),
          actualStartAt: thursday,
          assignee: 'Montage team',
          timeSpentMinutes: 240,
          calendarLabel: CalendarLabel.BOKAD_TID,
        },
        {
          track: Track.SHARED,
          status: TrackStatus.LEVERANS,
          colorHex: '#4B8B3B',
          plannedStartAt: addDays(weekStart, 4),
          plannedEndAt: addDays(weekStart, 5),
          assignee: 'Distribution',
          calendarLabel: CalendarLabel.KAN_FLYTTAS,
        },
      ],
      events: [
        {
          track: Track.B,
          start: atTime(wednesday, 15),
          end: atTime(wednesday, 16),
          title: 'VAMB 80322 UMEVA',
          notes: 'Ta monterhyllor och frontskylt. Gimostigen lagerport.',
        },
      ],
      files: [
        {
          track: Track.A,
          filename: 'UMEVA-hyllor.dxf',
          url: 'https://file-examples.com/storage/fe68c1d28264bba9a5f86de/2017/10/file_example_PNG_500kB.png',
          uploadedBy: 'Anna Larsson',
        },
      ],
      fortnox: {
        documentNumber: 'F-20445',
      },
    },
  ];

console.log('[orders] Creating demo orders...');
  for (const order of demoOrders) {
    const createdBy = order.createdByEmail ? usersByEmail.get(order.createdByEmail) : null;

    await prisma.order.create({
      data: {
        orderNumber: order.orderNumber,
        title: order.title,
        customerName: order.customerName,
        dueDate: order.dueDate,
        deliveryMethod: order.deliveryMethod,
        deliveryAddress: order.deliveryAddress,
        notes: order.notes,
        createdBy: createdBy ? { connect: { id: createdBy.id } } : undefined,
        createdByName: createdBy?.name ?? null,
        tracks: {
          create: order.tracks.map((track) => ({
            ...track,
          })),
        },
        events: {
          create: order.events.map((event) => ({
            ...event,
          })),
        },
        files: {
          create: order.files.map((file) => ({
            ...file,
          })),
        },
        fortnox: order.fortnox
          ? {
              create: order.fortnox,
            }
          : undefined,
      },
    });
  }

console.log('[calendar] Creating shared calendar items...');
  await prisma.personalCalendarEvent.createMany({
    data: [
      {
        track: Track.SHARED,
        title: 'Trafikverket 5-veckors kontroll',
        label: CalendarLabel.TRAFIKVERKET,
        notes: 'Kontroll av LED skyltar pa E4 enligt avtal.',
        allDay: true,
        start: monday,
        end: addDays(monday, 1),
        visibility: EventVisibility.PUBLIC,
      },
      {
        track: Track.B,
        title: 'Stunt 1 service',
        label: CalendarLabel.UTFORT_ARBETE,
        notes: 'Service och rengoring av stunt rigg.',
        allDay: false,
        start: atTime(tuesday, 7),
        end: atTime(tuesday, 9),
        visibility: EventVisibility.PUBLIC,
      },
      {
        track: Track.SHARED,
        title: 'Veckomote montage',
        label: CalendarLabel.UNDER_VECKAN,
        notes: 'Genomgang av utekorningar och leveranser.',
        allDay: false,
        start: atTime(monday, 15),
        end: atTime(monday, 15, 45),
        visibility: EventVisibility.PUBLIC,
      },
    ],
  });

console.log('[done] Demo database ready!');
  console.log('Users you can sign in with:');
  for (const user of demoUsers) {
    console.log(` - ${user.email} / ${demoPassword}`);
  }
}

main()
  .catch((error) => {
    console.error('Seed failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
