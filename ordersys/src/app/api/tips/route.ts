import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import OpenAI from "openai";
import { TRACK_NAMES } from "@/lib/tracks";

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

// Fallback tips for different scenarios
const fallbackTips = {
  ADMIN: [
    "Övervaka systemets hälsa och prestanda regelbundet.",
    "Fakturera klara ordrar för att förbättra kassaflödet.",
    "Analysera orderflödet för att identifiera flaskhalsar.",
    "Säkerställ att alla team har tillräckligt med arbete."
  ],
  SALJARE: [
    "Följ upp nya kundförfrågningar inom 24 timmar.",
    "Skapa offerter för intresserade potentiella kunder.",
    "Kontakta befintliga kunder för nya affärsmöjligheter.",
    "Uppdatera orderstatus för att hålla kunder informerade."
  ],
  A_TEAM: [
    "Prioritera inkommande ordrar för snabb start.",
    "Kontrollera materialbehov för kommande projekt.",
    "Dokumentera arbetsprocesser för kvalitetssäkring.",
    "Planera produktionskapacitet effektivt."
  ],
  B_TEAM: [
    "Övervaka verkstadens kapacitet och belastning.",
    "Kvalitetskontrollera färdiga arbeten innan leverans.",
    "Planera underhåll av verkstadsutrustning.",
    "Optimera arbetsflöden för ökad effektivitet."
  ],
  C_TEAM: [
    "Planera leveransrutter för maximal effektivitet.",
    "Kontakta kunder för att bekräfta leveranstider.",
    "Förbered montageutrustning för kommande jobb.",
    "Dokumentera installationer för garantianspråk."
  ],
  D_TEAM: [
    "Specialanpassa montageplaner för varje fordon.",
    "Kontrollera fordonsspecifika krav innan montering.",
    "Samarbeta med verkstaden för optimal timing.",
    "Dokumentera specialmontage för framtida referenser."
  ],
  default: [
    "Markera ordrar som hela för att tydligare se vad som väntar på fakturering.",
    "Kontrollera kalendern för kommande möten och deadlines.",
    "Ladda upp filer till rätt order för bättre dokumentation.",
    "Uppdatera orderstatus när arbete slutförs."
  ]
};

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user context from request
    const url = new URL(req.url);
    const userRole = url.searchParams.get('role') || 'UNKNOWN';
    const currentPath = url.searchParams.get('path') || '/';
    const recentActivity = url.searchParams.get('activity') || '';

    // Fetch current system state
    const [
      allOrders,
      allTracks,
      allEvents,
      allFiles,
      allUsers,
      allCustomers
    ] = await Promise.all([
      prisma.order.findMany({
        include: {
          tracks: true,
          events: true,
          files: true,
          createdBy: true,
          fortnox: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.orderTrack.findMany({
        orderBy: { id: 'desc' },
      }),
      prisma.calendarEvent.findMany({
        include: { order: { select: { title: true, customerName: true } } },
        orderBy: { start: 'desc' },
        take: 50,
      }),
      prisma.file.findMany({
        include: { order: { select: { title: true, customerName: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.user.findMany({
        select: { id: true, name: true, email: true, role: true },
      }),
      prisma.customerReference.findMany({
        take: 100,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Separate active and archived orders
    const activeOrders = allOrders.filter(order =>
      !order.tracks.some(track => track.status === 'AVSLUTAD') ||
      order.tracks.length === 0
    );
    const archivedOrders = allOrders.filter(order =>
      order.tracks.some(track => track.status === 'AVSLUTAD')
    );

    // Get orders ready for invoicing (completed but not invoiced)
    const readyForInvoicing = activeOrders.filter(order =>
      order.tracks.every(track => track.status === 'AVSLUTAD')
    );

    // Get orders with incomplete tracks
    const incompleteOrders = activeOrders.filter(order =>
      order.tracks.some(track => track.status !== 'AVSLUTAD')
    );

    // Get upcoming deadlines (next 7 days)
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const upcomingDeadlines = activeOrders.filter(order =>
      order.dueDate && new Date(order.dueDate) <= nextWeek && new Date(order.dueDate) >= now
    );

    // Get recent activity (last 24 hours)
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const recentEvents = allEvents.filter(event =>
      new Date(event.start) >= last24Hours
    );
    const recentFiles = allFiles.filter(file =>
      new Date(file.createdAt) >= last24Hours
    );

    // Enhanced contextual analysis based on user role and current view
    const roleSpecificData = {
      ADMIN: 'Som administratör har du full överblick över hela systemet.',
      SALJARE: 'Fokusera på nya ordrar och kundrelationer.',
      A_TEAM: 'Ateljén - hantera inkommande och pågående arbeten.',
      B_TEAM: 'Verkstaden - övervaka produktionsflödet.',
      C_TEAM: 'Montage - planera leveranser och installationer.',
      D_TEAM: 'Bilmontage - hantera specialmontage och leveranser.'
    };

    const viewSpecificTips = {
      '/orders/new': 'Skapa nya ordrar effektivt med alla nödvändiga detaljer.',
      '/orders/overview': 'Använd filter för att hitta relevanta ordrar snabbt.',
      '/orders/completed': 'Prioritera fakturering av färdiga ordrar.',
      '/calendar': 'Planera resurser och undvik konflikter i kalendern.',
      '/': 'Dashboard - få en snabb överblick över viktigaste åtgärderna.'
    };

    const systemData = `
KONTEXTUELL SYSTEMANALYS:

ANVÄNDARROLL: ${userRole}
${roleSpecificData[userRole as keyof typeof roleSpecificData] || 'Standardanvändare med grundläggande behörighet.'}

NUVARANDE VY: ${currentPath}
${viewSpecificTips[currentPath as keyof typeof viewSpecificTips] || 'Navigera systemet för att hitta relevanta funktioner.'}

AKTUELL SYSTEMSTATUS:
- Aktiva ordrar: ${activeOrders.length}
- Klara för fakturering: ${readyForInvoicing.length}
- Ofullständiga ordrar: ${incompleteOrders.length}
- Deadline inom 7 dagar: ${upcomingDeadlines.length}

AKTIVITET SENASTE 24 TIMMARNA:
- Kalenderhändelser: ${recentEvents.length}
- Uppladdade filer: ${recentFiles.length}
- Användaraktivitet: ${recentActivity}

SPÅRSPECIFIK STATUS:
${['A', 'B', 'C', 'D'].map(track => {
  const trackOrders = allTracks.filter(t => t.track === track && t.status !== 'AVSLUTAD');
  const trackStatus = trackOrders.length > 0 ? `${trackOrders.length} aktiva` : 'Inga aktiva';
  return `- Spår ${track} (${TRACK_NAMES[track as keyof typeof TRACK_NAMES] || track}): ${trackStatus}`;
}).join('\n')}

PRIORITERADE ÅTGÄRDER:
${readyForInvoicing.length > 0 ? `🔴 ${readyForInvoicing.length} ordrar klara för fakturering` : ''}
${upcomingDeadlines.length > 0 ? `🟡 ${upcomingDeadlines.length} ordrar med deadline inom 7 dagar` : ''}
${incompleteOrders.length > 0 ? `🔵 ${incompleteOrders.length} ordrar med ofullständiga spår` : ''}

SYSTEMHÄLSA:
- Totalt antal användare: ${allUsers.length}
- Kunder i systemet: ${allCustomers.length}
- Dokumentation: ${allFiles.length} filer
- Planering: ${allEvents.length} händelser
`;

    const currentTime = new Date().toLocaleString('sv-SE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Stockholm'
    });

    const tipPrompt = `Du är en avancerad AI-assistent för Ordina, ett svenskt orderhanteringssystem för hantverkare. Analysera användarens kontext och generera hyper-personaliserade snabbtips.

AKTUELL TID: ${currentTime}

${systemData}

KONTEXTUELL ANALYS:
- Användarens roll: ${userRole} - anpassa tipsen efter behörighet och ansvar
- Nuvarande vy: ${currentPath} - ge relevanta tips för aktuell sida
- Systemstatus: ${activeOrders.length} aktiva ordrar, ${readyForInvoicing.length} klara för fakturering
- Aktivitetsnivå: ${recentEvents.length + recentFiles.length} händelser senaste 24h

INSTRUKTIONER FÖR PERSONLIGA TIPS:
- Generera ETT ultra-specifikt, handlingsorienterat tips (max 2 meningar)
- Basera tipset på användarens roll, nuvarande vy och systemstatus
- Använd professionellt men vänligt svenskt affärsspråk
- Fokusera på den mest kritiska åtgärden JUST NU
- Integrera roll-specifika ansvarsområden
- Håll under 120 tecken för maximal läsbarhet
- Gör tipset omedelbart handlingsbart

ROLL-SPECIFIK PRIORITERING:
- ADMIN: Systemöversikt, fakturering, resursplanering
- SALJARE: Nya ordrar, kundkontakt, offerter
- A_TEAM: Inkommande ordrar, produktionsstart
- B_TEAM: Verkstadskapacitet, kvalitetskontroll
- C_TEAM: Leveransplanering, montage
- D_TEAM: Specialmontage, logistik

DYNAMISKA TIPS-EXEMPEL:
${readyForInvoicing.length > 2 ? `"Fakturera ${readyForInvoicing.length} klara ordrar - kassaflödet väntar!"` : ''}
${upcomingDeadlines.length > 0 ? `"Deadline närmar sig: ${upcomingDeadlines.length} ordrar kräver din uppmärksamhet"` : ''}
${userRole === 'SALJARE' && recentEvents.length > 5 ? '"Hög aktivitet - följ upp kundkontakter för nya affärer"' : ''}
${currentPath === '/orders/new' ? '"Fyll i alla fält för snabbare orderhantering"' : ''}

Generera ett kontextuellt tipset:`;

    // Add timestamp to ensure unique tips per refresh
    const timestamp = Date.now();
    const randomSeed = Math.random().toString(36).substring(2, 8);
    
    // Try AI generation with timeout and error handling
    let tip = "";
    try {
      const completion = await openai.chat.completions.create({
        model: "openai/gpt-3.5-turbo",
        messages: [
          { role: "system", content: "Du är en expert på orderhantering som genererar kortfattade, handlingsorienterade svenska tips för hantverkare. Analysera systemdata och ge relevanta, professionella rekommendationer. VARJE GÅNG MÅSTE DU GENERERA EN HELT NY OCH UNIK TIP - INTE ÅTERANVÄNDA TIPS." },
          { role: "user", content: `${tipPrompt}\n\nUnikt ID för denna förfrågan: ${randomSeed}-${timestamp}\n\nKRÄV: Generera en helt ny och unik tip för varje förfrågan. Använd aktuell systemdata för att skapa en färsk insikt som inte liknar tidigare tips.` }
        ],
        max_tokens: 100,
        temperature: 1.0, // Maximum variety for new tips each refresh
      });

      tip = completion.choices[0]?.message?.content?.trim() || "";
      
      // Very lenient validation - just check if it exists
      if (!tip) {
        throw new Error("No AI response");
      }
      
      console.log("AI tip generated successfully:", tip);
      
    } catch (aiError) {
      console.warn("AI tip generation failed, using fallback:", aiError);
      
      // Use role-specific fallback tips with more variety
      const roleTips = fallbackTips[userRole as keyof typeof fallbackTips] || fallbackTips.default;
      tip = roleTips[Math.floor(Math.random() * roleTips.length)];
    }

    return NextResponse.json({ tip });

  } catch (error) {
    console.error("Tips API error:", error);
    
    // Ultimate fallback - use default tips
    const defaultTip = fallbackTips.default[Math.floor(Math.random() * fallbackTips.default.length)];
    
    return NextResponse.json({
      tip: defaultTip
    });
  }
}