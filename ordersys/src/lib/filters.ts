import type { Prisma } from "@prisma/client";

export const DEMO_SEED_TAG = "[DEMO_SEED:ORDEXA_V2]";

export const onlyRealFortnoxOrders = {
  fortnox: { isNot: null },
  OR: [{ notes: null }, { notes: { not: { contains: DEMO_SEED_TAG } } }],
} satisfies Prisma.OrderWhereInput;

export const onlyActiveOrders = {
  ...onlyRealFortnoxOrders,
  billingConfirmedAt: null,
} satisfies Prisma.OrderWhereInput;
