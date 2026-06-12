import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('[reset] Clearing orders, tracks, files and calendar events...');

  await prisma.$transaction([
    prisma.calendarEvent.deleteMany({}),
    prisma.orderTrack.deleteMany({}),
    prisma.file.deleteMany({}),
    prisma.fortnoxOrderLink.deleteMany({}),
    prisma.order.deleteMany({}),
    prisma.personalCalendarEvent.deleteMany({}),
  ]);

  console.log('[reset] Demo data removed. Database is now empty.');
}

main()
  .catch((error) => {
    console.error('Clear demo data failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });