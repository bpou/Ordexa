import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "production"
        ? ["error", "warn"]
        : ["query", "error", "warn"],
  });

// Add logging to validate connection
console.log("Using DATABASE_URL:", process.env.DATABASE_URL?.replace(/:([^:@]{1,})@/, ':***@'));
prisma.$connect().then(() => {
  console.log("Prisma connected to database successfully");
}).catch((error) => {
  console.error("Prisma failed to connect to database:", error);
});

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma; // <-- default-export OCH named export
