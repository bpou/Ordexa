import { NextResponse } from "next/server";
import { getFortnoxAccessToken } from "@/lib/fortnox";

const API = "https://api.fortnox.se/3";

async function fx(url: string, token: string, accept = "application/json") {
  const r = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Client-Secret": process.env.FORTNOX_CLIENT_SECRET!,
      Accept: accept,
    },
  });
  const text = await r.text();
  return { ok: r.ok, status: r.status, text, url };
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const { accessToken } = await getFortnoxAccessToken();

  const results: any = {};

  // Does the order exist in v2?
  results.orderV2 = await fx(`${API}/orders-v2/${id}`, accessToken);

  // Does a legacy order with that number exist?
  results.orderLegacy = await fx(`${API}/orders/${id}`, accessToken);

  // Try both likely v2 subpaths
  results.v2Docs = await fx(`${API}/orders-v2/${id}/documents`, accessToken);
  results.v2Attachments = await fx(`${API}/orders-v2/${id}/attachments`, accessToken);

  // Archive: broad search variants
  results.archiveSearch1 = await fx(`${API}/archive?searchstring=${encodeURIComponent(id)}`, accessToken);
  results.archiveSearch2 = await fx(`${API}/archive?q=${encodeURIComponent(id)}`, accessToken);

  // Archive: last 30 files (so we can see naming)
  results.archiveRecent = await fx(`${API}/archive?limit=30&sortby=timestamp&sortorder=descending`, accessToken);

  return NextResponse.json(results);
}
