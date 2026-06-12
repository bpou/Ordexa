import { NextResponse } from "next/server";
import { uploadFortnoxOrderConfirmation } from "@/lib/fortnox";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params; // ✅ no req.json() here
  try {
    const out = await uploadFortnoxOrderConfirmation(id);
    // normalize shape
    const key = (out as any)?.key;
    const fileId = (out as any)?.fileId ?? null;
    return NextResponse.json({ key, fileId });
  } catch (err: any) {
    const msg = err?.message ?? String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// Optional ping for debugging
export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return NextResponse.json({ ok: true, id });
}
