import prisma from "./prisma";

/**
 * Backwards-compatible Prisma client export.
 * Prefer importing from `@/lib/prisma`, but keep `@/lib/db` alive for legacy paths.
 */
export const db = prisma;
export { prisma };

export default prisma;
